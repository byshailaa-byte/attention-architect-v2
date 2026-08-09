import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  const rows = (await sql`
    SELECT id, session_id, child_name, parent_name, archetype, parent_pattern,
           answers->>'S1' AS s1_answer,
           created_at
    FROM assessments
    ORDER BY created_at DESC
    LIMIT 5
  `) as any[];

  for (const r of rows) {
    console.log(
      r.session_id,
      "|", r.child_name ?? "?", "/", r.parent_name,
      "|", r.archetype ?? "(no archetype)",
      "| S1:", r.s1_answer ?? "(absent)",
      "|", r.created_at
    );
  }
}

main().catch(e => { console.error(e); process.exit(1); });
