import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

console.log("Creating unique index idx_reports_one_live_per_assessment (CONCURRENTLY)…");
console.log("This runs without a write lock but may take a moment on 350 rows.");

await sql`
  CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_one_live_per_assessment
    ON reports (assessment_id)
    WHERE superseded_by IS NULL AND status = 'published'
`;
console.log("Index created.");

await sql`INSERT INTO schema_migrations (phase) VALUES ('phase_37_one_live_report') ON CONFLICT DO NOTHING`;
console.log("schema_migrations recorded.");

// Confirm index exists and get size
const [idx] = await sql`
  SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    indisunique,
    indisvalid
  FROM pg_stat_user_indexes
  JOIN pg_index USING (indexrelid)
  WHERE indexname = 'idx_reports_one_live_per_assessment'
` as unknown as {
  indexname: string;
  index_size: string;
  indisunique: boolean;
  indisvalid: boolean;
}[];

if (idx) {
  console.log(`\nIndex: ${idx.indexname}`);
  console.log(`Size:  ${idx.index_size}`);
  console.log(`Unique: ${idx.indisunique}`);
  console.log(`Valid:  ${idx.indisvalid}`);
} else {
  console.log("ERROR: index not found after creation");
}
