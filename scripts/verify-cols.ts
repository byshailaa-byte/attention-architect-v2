import { neon } from "@neondatabase/serverless";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'assessments'
      AND column_name IN ('archetype_fit_tier','parent_instinct_fit_tier','confidence_vector')
    ORDER BY column_name
  `;
  for (const c of cols) console.log(c.column_name, c.data_type, c.is_nullable);
}
main().catch(e => { console.error(e); process.exit(1); });
