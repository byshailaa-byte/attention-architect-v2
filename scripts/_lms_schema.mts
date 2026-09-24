import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

const tables = await sql`
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('lms_progress', 'lms_reflections', 'lms_surveys')
  ORDER BY table_name, ordinal_position
` as unknown as { table_name: string; column_name: string; data_type: string; is_nullable: string; column_default: string | null }[];

let cur = "";
for (const r of tables) {
  if (r.table_name !== cur) { console.log(`\n── ${r.table_name} ──`); cur = r.table_name; }
  console.log(`  ${r.column_name.padEnd(30)} ${r.data_type.padEnd(20)} nullable=${r.is_nullable}${r.column_default ? ` default=${r.column_default}` : ""}`);
}

console.log("\n── Real customers with lms_progress (non-internal) ──");
const progress = await sql`
  SELECT a.session_id, a.child_name, a.email, a.archetype,
    lp.week_number, lp.completed_at, lp.created_at
  FROM lms_progress lp
  JOIN purchases p ON p.assessment_id = lp.assessment_id AND p.status = 'paid'
  JOIN assessments a ON a.id = lp.assessment_id
  WHERE a.is_internal = false
  ORDER BY a.session_id, lp.week_number
` as unknown as { session_id: string; child_name: string | null; email: string | null; archetype: string | null; week_number: number; completed_at: Date | null; created_at: Date }[];

const bySession = new Map<string, typeof progress>();
for (const r of progress) {
  if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
  bySession.get(r.session_id)!.push(r);
}
console.log(`Distinct customers: ${bySession.size}`);
for (const [sid, rows] of bySession) {
  const r = rows[0];
  const weeks = rows.map(w => `w${w.week_number}${w.completed_at ? "✓" : "…"}`).join(" ");
  console.log(`  ${sid.substring(0,8)}… ${(r.child_name ?? "null").padEnd(14)} ${(r.archetype ?? "null").padEnd(22)} ${weeks}`);
}

console.log("\n── Sample lms_reflections (non-internal) ──");
const refs = await sql`
  SELECT lr.* FROM lms_reflections lr
  JOIN assessments a ON a.id = lr.assessment_id
  WHERE a.is_internal = false LIMIT 2
` as unknown as Record<string, unknown>[];
for (const r of refs) console.log(JSON.stringify(r));

console.log("\n── lms_surveys (non-internal) ──");
const survs = await sql`
  SELECT ls.* FROM lms_surveys ls
  JOIN assessments a ON a.id = ls.assessment_id
  WHERE a.is_internal = false LIMIT 2
` as unknown as Record<string, unknown>[];
console.log(`Count: ${survs.length}`);
for (const s of survs) console.log(JSON.stringify(s));
