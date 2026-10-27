// Applier for phase_78 (admin_view_log session_id + kind; viewed_user_id nullable). NOT purely additive
// (drops NOT NULL) — run only with a Neon backup branch. TARGET=prod|dev. Verify host → alter → verify.
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
  console.log(`[phase_78] target=${target} host=${host}`);
  console.log("[phase_78] VERIFY → ep-green-truth:", host.includes("ep-green-truth-aqxygaj2"), "| ep-wild-paper:", host.includes("ep-wild-paper-aqlx0vrm"));
  if (target === "prod" && !host.includes("ep-green-truth-aqxygaj2")) throw new Error("prod host mismatch — aborting");
  await sql`ALTER TABLE admin_view_log ADD COLUMN IF NOT EXISTS session_id uuid`;
  await sql`ALTER TABLE admin_view_log ADD COLUMN IF NOT EXISTS kind text`;
  await sql`ALTER TABLE admin_view_log ALTER COLUMN viewed_user_id DROP NOT NULL`;
  await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_78_admin_view_log_sessions') ON CONFLICT DO NOTHING`;
  const cols = (await sql`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='admin_view_log' ORDER BY ordinal_position`).map((r) => `${r.column_name}${r.column_name === "viewed_user_id" ? "(" + r.is_nullable + ")" : ""}`);
  console.log("[phase_78] admin_view_log cols:", cols.join(", "));
  console.log("[phase_78] ledger:", (await sql`SELECT 1 FROM schema_migrations WHERE phase='phase_78_admin_view_log_sessions'`).length > 0);
}
main().catch((e) => { console.error("[phase_78] ERROR:", e.message); process.exit(1); });
