import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT
    session_id::text,
    child_name,
    age_band,
    archetype,
    parent_pattern,
    archetype_fit_tier,
    parent_instinct_fit_tier,
    concerns,
    worry_followup,
    answers,
    dimensions,
    weakest_two,
    pricing_variant
  FROM assessments
  WHERE archetype IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1
`;
if (rows.length > 0) {
  console.log(JSON.stringify(rows[0], null, 2));
} else {
  console.log("No sessions with archetype found");
}
