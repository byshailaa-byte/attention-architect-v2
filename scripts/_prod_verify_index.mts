import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_PROD!);

const [idxRows, migRows] = await Promise.all([
  sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE indexname = 'idx_reports_one_live_per_assessment'
  ` as unknown as { indexname: string; indexdef: string }[],
  sql`
    SELECT phase, applied_at
    FROM schema_migrations
    WHERE phase IN ('phase_36_is_internal', 'phase_37_one_live_report',
                    'phase_36_is_internal_backfill', 'phase_37a_supersede_duplicates')
    ORDER BY applied_at
  ` as unknown as { phase: string; applied_at: string }[],
]);

console.log("INDEX:");
if (idxRows.length === 0) {
  console.log("  NOT FOUND — idx_reports_one_live_per_assessment does not exist");
} else {
  console.log(`  ${idxRows[0].indexname}`);
  console.log(`  ${idxRows[0].indexdef}`);
}

console.log("\nSCHEMA_MIGRATIONS:");
if (migRows.length === 0) {
  console.log("  No phase_36 or phase_37 rows found");
} else {
  for (const r of migRows) console.log(`  ${r.phase}  applied_at=${r.applied_at}`);
}

process.exit(0);
