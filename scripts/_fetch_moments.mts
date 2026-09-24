import { getSql } from "@/lib/db/client";
const sql = getSql();
const reportId = process.argv[2];
const rows = await sql`
  SELECT narrative_moments FROM reports WHERE id = ${reportId}::uuid
` as unknown as { narrative_moments: { section: string; content: string }[] }[];
if (!rows.length) { console.error("not found"); process.exit(1); }
for (const m of rows[0].narrative_moments) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`SECTION: ${m.section}`);
  console.log("─".repeat(60));
  console.log(m.content);
}
process.exit(0);
