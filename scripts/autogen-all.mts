import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// All auto-generated reports, any status
const reports = await sql`
  SELECT r.id, r.status, r.generated_at, r.archetype, a.session_id, a.child_name, a.parent_name
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.auto_generated = true
  ORDER BY r.generated_at DESC
  LIMIT 20
` as unknown as { id: string; status: string; generated_at: string; archetype: string; session_id: string; child_name: string | null; parent_name: string }[];

console.log(`Auto-generated reports (all statuses): ${reports.length}`);
for (const r of reports) {
  console.log(`  ${r.id.slice(0,8)} | ${r.status.padEnd(10)} | ${r.child_name ?? "?"} / ${r.parent_name} | ${new Date(r.generated_at).toISOString()}`);
}

// Pipeline settings
const settings = await sql`
  SELECT key, value, updated_at FROM app_settings
  WHERE key IN ('auto_generate_enabled', 'auto_generate_pipeline_start_at', 'pending_narrative_reviews')
  ORDER BY key
` as unknown as { key: string; value: string; updated_at: string }[];

console.log("\napp_settings:");
for (const s of settings) {
  console.log(`  ${s.key} = ${s.value} (updated ${new Date(s.updated_at).toISOString()})`);
}

// Recent assessments with no report (potential pipeline targets)
const pending = await sql`
  SELECT a.id, a.session_id, a.child_name, a.parent_name, a.created_at, a.generation_attempts
  FROM assessments a
  WHERE a.parent_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM reports r WHERE r.assessment_id = a.id AND r.superseded_by IS NULL
    )
    AND a.generation_attempts < 5
  ORDER BY a.created_at DESC
  LIMIT 10
` as unknown as { id: string; session_id: string; child_name: string | null; parent_name: string; created_at: string; generation_attempts: number }[];

console.log(`\nAssessments with no active report (pipeline targets): ${pending.length}`);
for (const p of pending) {
  console.log(`  ${p.id.slice(0,8)} | ${p.child_name ?? "?"} / ${p.parent_name} | attempts=${p.generation_attempts} | ${new Date(p.created_at).toISOString()}`);
}
