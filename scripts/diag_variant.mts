import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT
    pricing_variant,
    archetype IS NOT NULL AS assessment_complete,
    parent_name IS NOT NULL AS gate_submitted,
    created_at::text
  FROM assessments
  ORDER BY created_at DESC
  LIMIT 20
` as unknown as any[];

console.log("Recent sessions:");
for (const r of rows) {
  const ts = String(r.created_at).slice(0,19);
  console.log(`  ${ts}  variant=${r.pricing_variant ?? 'NULL'}  complete=${r.assessment_complete}  gate=${r.gate_submitted}`);
}

const summary = await sql`
  SELECT
    pricing_variant,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE parent_name IS NOT NULL)::int AS gate_submitted
  FROM assessments
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY pricing_variant
  ORDER BY total DESC
` as unknown as any[];

console.log("\nLast-7-day breakdown:");
console.log(JSON.stringify(summary, null, 2));
