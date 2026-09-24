// Report: 4 non-internal sessions with archetype = 'Unknown'
// Pull their attention_shape and reward_driver dimension values
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT
    session_id::text,
    created_at,
    answers,
    dimensions->>'attention_shape' AS attention_shape_raw,
    dimensions->>'reward_driver'   AS reward_driver_raw,
    dimensions->'attention_shape'->>'value' AS attention_shape,
    dimensions->'reward_driver'->>'value'   AS reward_driver,
    dimensions->'attention_shape'->>'consistency' AS as_consistency,
    dimensions->'reward_driver'->>'consistency'   AS rd_consistency,
    dimensions->'attention_shape'->>'data_points' AS as_points,
    dimensions->'reward_driver'->>'data_points'   AS rd_points
  FROM assessments
  WHERE archetype = 'Unknown'
    AND is_internal = false
  ORDER BY created_at
` as {
  session_id: string;
  created_at: unknown;
  answers: Record<string,string>;
  attention_shape_raw: string;
  reward_driver_raw: string;
  attention_shape: string;
  reward_driver: string;
  as_consistency: string;
  rd_consistency: string;
  as_points: string;
  rd_points: string;
}[];

console.log(`Found ${rows.length} non-internal Unknown sessions\n`);

for (const r of rows) {
  const created = r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at);
  console.log(`─── session: ${r.session_id}  created: ${created.slice(0,10)}`);
  console.log(`    attention_shape : value=${r.attention_shape}  consistency=${r.as_consistency}  data_points=${r.as_points}`);
  console.log(`    reward_driver   : value=${r.reward_driver}  consistency=${r.rd_consistency}  data_points=${r.rd_points}`);
  // Show the raw dimension answers for these two dims
  const asAnswers = Object.entries(r.answers ?? {}).filter(([k]) => ["G1","D1.1","D1.2"].includes(k));
  const rdAnswers = Object.entries(r.answers ?? {}).filter(([k]) => ["G2","D2.1","D2.2","D2.3","D2.confirm"].includes(k));
  console.log(`    G1/D1 answers   :`, Object.fromEntries(asAnswers));
  console.log(`    G2/D2 answers   :`, Object.fromEntries(rdAnswers));
  console.log();
}
