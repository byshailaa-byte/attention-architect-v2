// Applier for phase_74 (report_generation_log draft + judge_detail jsonb). ADDITIVE, nullable columns.
// TARGET=prod|dev (default dev). Verify host → add columns → verify. Gitignored. Run at DEPLOY time only.
import * as dotenv from "dotenv";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const target = process.env.TARGET === "prod" ? "prod" : "dev";
const url = target === "prod" ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (!url) throw new Error(`No ${target === "prod" ? "DATABASE_URL_PROD" : "DATABASE_URL"} set`);
const host = url.match(/@([^/:]+)/)?.[1] ?? "(unknown)";
const sql = neon(url);

async function main() {
  console.log(`[phase_74] target=${target} host=${host}`);
  console.log("[phase_74] VERIFY → ep-green-truth:", host.includes("ep-green-truth-aqxygaj2"), "| ep-wild-paper:", host.includes("ep-wild-paper-aqlx0vrm"));
  if (target === "prod" && !host.includes("ep-green-truth-aqxygaj2")) throw new Error("prod host mismatch — aborting");
  await sql`ALTER TABLE report_generation_log ADD COLUMN IF NOT EXISTS draft jsonb`;
  await sql`ALTER TABLE report_generation_log ADD COLUMN IF NOT EXISTS judge_detail jsonb`;
  await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_74_report_fallback_capture') ON CONFLICT DO NOTHING`;
  const cols = (await sql`SELECT column_name FROM information_schema.columns WHERE table_name='report_generation_log' AND column_name IN ('draft','judge_detail')`).map((r) => r.column_name);
  console.log("[phase_74] columns present:", cols.join(", "), "| ledger:", (await sql`SELECT 1 FROM schema_migrations WHERE phase='phase_74_report_fallback_capture'`).length > 0);
}
main().catch((e) => { console.error("[phase_74] ERROR:", e.message); process.exit(1); });
