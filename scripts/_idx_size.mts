import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

const rows = await sql`
  SELECT
    s.indexrelname                               AS index_name,
    pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
    i.indisunique,
    i.indisvalid,
    (SELECT phase FROM schema_migrations WHERE phase = 'phase_37_one_live_report') AS migration_phase
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON i.indexrelid = s.indexrelid
  WHERE s.indexrelname = 'idx_reports_one_live_per_assessment'
` as unknown as { index_name: string; index_size: string; indisunique: boolean; indisvalid: boolean; migration_phase: string | null }[];

if (rows.length === 0) { console.log("ERROR: index not found"); }
else {
  const r = rows[0];
  console.log(`index:     ${r.index_name}`);
  console.log(`size:      ${r.index_size}`);
  console.log(`unique:    ${r.indisunique}`);
  console.log(`valid:     ${r.indisvalid}`);
  console.log(`migration: ${r.migration_phase ?? "NOT RECORDED"}`);
}
