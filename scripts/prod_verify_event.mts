import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Find a production simplified session with a published report and parent_name set
// to use as verification target
const [candidate] = await sql`
  SELECT a.session_id::text, a.child_name
  FROM assessments a
  INNER JOIN reports r
    ON r.assessment_id = a.id AND r.status = 'published' AND r.superseded_by IS NULL
  WHERE a.pricing_variant = 'simplified'
    AND a.parent_name IS NOT NULL
    AND a.child_name NOT IN ('SmokeTest', 'TestKid', 'TestWA', 'TestKid2', 'TestMobile', 'TestFlow')
  ORDER BY a.created_at DESC
  LIMIT 1
` as unknown as { session_id: string; child_name: string }[];

if (!candidate) {
  console.log("No suitable verification session found in production");
} else {
  console.log("Verification target:", JSON.stringify({ session_id: candidate.session_id, child_name: '[redacted]' }));
}
