import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT
    r.id         AS report_id,
    r.status,
    r.generated_at,
    r.archetype,
    a.session_id,
    a.child_name,
    a.parent_name,
    a.email
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.auto_generated = true
    AND r.status = 'draft'
    AND r.superseded_by IS NULL
  ORDER BY r.generated_at ASC
` as unknown as {
  report_id: string;
  status: string;
  generated_at: string;
  archetype: string;
  session_id: string;
  child_name: string | null;
  parent_name: string;
  email: string;
}[];

console.log(`Auto-generated drafts: ${rows.length}`);
for (const r of rows) {
  console.log(`  ${r.report_id} | ${r.child_name ?? "?"} / ${r.parent_name} | ${r.archetype} | ${new Date(r.generated_at).toISOString()}`);
  console.log(`    session: ${r.session_id}`);
}
