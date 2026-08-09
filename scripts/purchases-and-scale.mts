import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const [purchaseRows, assessmentCounts, assessmentSample] = await Promise.all([
  // Check purchases table schema and data
  sql`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'purchases' ORDER BY ordinal_position
  ` as unknown as { column_name: string; data_type: string }[],

  sql`
    SELECT
      COUNT(*) AS total_assessments,
      COUNT(CASE WHEN parent_name IS NOT NULL THEN 1 END) AS claimed,
      COUNT(CASE WHEN parent_name IS NULL THEN 1 END) AS unclaimed,
      MIN(created_at)::text AS first_at,
      MAX(created_at)::text AS last_at
    FROM assessments
  ` as unknown as { total_assessments: string; claimed: string; unclaimed: string; first_at: string; last_at: string }[],

  sql`
    SELECT COUNT(*) AS n FROM assessments WHERE created_at > '2026-07-01'
  ` as unknown as { n: string }[],
]);

console.log("=== purchases table schema ===");
for (const c of purchaseRows) console.log(`  ${c.column_name}: ${c.data_type}`);

const [purchaseCounts] = await Promise.all([
  sql`SELECT COUNT(*) AS n, SUM(amount_paise) / 100.0 AS total_inr FROM purchases` as unknown as { n: string; total_inr: string | null }[],
]);
console.log(`\n=== purchases table data ===`);
console.log(`  count: ${purchaseCounts[0]?.n ?? "?"}, total INR: ₹${purchaseCounts[0]?.total_inr ?? "?"}`);

console.log(`\n=== assessments scale ===`);
const a = assessmentCounts[0];
console.log(`  total: ${a.total_assessments}`);
console.log(`  claimed (parent_name set): ${a.claimed}`);
console.log(`  unclaimed (abandoned): ${a.unclaimed}`);
console.log(`  first: ${a.first_at}`);
console.log(`  last:  ${a.last_at}`);
console.log(`  since July 2026: ${assessmentSample[0].n}`);

// How many got past question 1 (have answers) but didn't complete?
const dropoffRows = await sql`
  SELECT
    COUNT(*) FILTER (WHERE jsonb_typeof(answers) = 'object' AND jsonb_array_length(array_to_json(ARRAY(SELECT jsonb_object_keys(answers)))::jsonb) = 0) AS no_answers,
    COUNT(*) FILTER (WHERE jsonb_typeof(answers) = 'object' AND jsonb_array_length(array_to_json(ARRAY(SELECT jsonb_object_keys(answers)))::jsonb) > 0 AND parent_name IS NULL) AS mid_abandon,
    COUNT(*) FILTER (WHERE jsonb_typeof(answers) = 'object' AND jsonb_array_length(array_to_json(ARRAY(SELECT jsonb_object_keys(answers)))::jsonb) > 0 AND parent_name IS NOT NULL) AS completed
  FROM assessments
  WHERE answers IS NOT NULL
` as unknown as { no_answers: string; mid_abandon: string; completed: string }[];

// Simpler approach
const [withAnswers, withAnswersAndParent] = await Promise.all([
  sql`SELECT COUNT(*) AS n FROM assessments WHERE answers IS NOT NULL AND answers != '{}'::jsonb` as unknown as { n: string }[],
  sql`SELECT COUNT(*) AS n FROM assessments WHERE answers IS NOT NULL AND answers != '{}'::jsonb AND parent_name IS NOT NULL` as unknown as { n: string }[],
]);
console.log(`\n=== mid-assessment abandonment ===`);
console.log(`  assessments with answers (started): ${withAnswers[0].n}`);
console.log(`  with answers + claimed: ${withAnswersAndParent[0].n}`);
console.log(`  started but not claimed: ${parseInt(withAnswers[0].n) - parseInt(withAnswersAndParent[0].n)}`);
