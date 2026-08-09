import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const SESSION = process.env.CHECK_SESSION!;

const [asmRows, repRows] = await Promise.all([
  sql`SELECT id, session_id, child_name, parent_name, email, generation_attempts, created_at
      FROM assessments WHERE session_id = ${SESSION}::uuid LIMIT 1` as unknown as any[],
  sql`SELECT r.id, r.status, r.auto_generated, r.generated_at, r.archetype,
             (r.quality_check_results->>'passed')::boolean AS quality_passed
      FROM reports r JOIN assessments a ON a.id = r.assessment_id
      WHERE a.session_id = ${SESSION}::uuid
      ORDER BY r.generated_at DESC` as unknown as any[],
]);

console.log("Assessment:", asmRows.length > 0 ? JSON.stringify(asmRows[0], null, 2) : "NOT FOUND");
console.log("Reports:", repRows.length, "found");
for (const r of repRows) console.log(" ", JSON.stringify(r));
