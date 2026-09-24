import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Find a simplified session with archetype set, parent_name null, no published report
const rows = await sql`
  SELECT
    a.session_id::text,
    a.child_name,
    a.archetype,
    a.age_band,
    a.created_at
  FROM assessments a
  WHERE a.pricing_variant = 'simplified'
    AND a.archetype IS NOT NULL
    AND a.parent_name IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM reports r
      WHERE r.assessment_id = a.id AND r.status = 'published'
    )
  ORDER BY a.created_at DESC
  LIMIT 5
`;
console.log("Reusable sessions:", JSON.stringify(rows, null, 2));
