import { neon } from "@neondatabase/serverless";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const r1 = await sql`SELECT COUNT(*) as total FROM assessments`;
  const r2 = await sql`SELECT COUNT(*) as total FROM assessments WHERE archetype IS NOT NULL AND archetype != 'Unknown'`;
  const r3 = await sql`SELECT COUNT(*) as total FROM assessments WHERE archetype IS NOT NULL AND archetype != 'Unknown' AND dimensions IS NOT NULL`;
  const r4 = await sql`SELECT COUNT(*) as total FROM assessments WHERE archetype IS NOT NULL AND archetype != 'Unknown' AND dimensions IS NULL`;
  console.log('All rows:', r1[0].total);
  console.log('Non-Unknown archetype:', r2[0].total);
  console.log('Non-Unknown + dimensions NOT NULL:', r3[0].total);
  console.log('Non-Unknown + dimensions NULL:', r4[0].total);
}
main().catch(e => { console.error(e); process.exit(1); });
