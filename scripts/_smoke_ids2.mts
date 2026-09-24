import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_PROD!);
const rows = await sql`
  SELECT a.session_id, a.pricing_variant, r.archetype, r.parent_instinct, a.child_name
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND a.pricing_variant = 'simplified'
  ORDER BY r.created_at DESC LIMIT 5
` as any[];
rows.forEach(r => console.log(JSON.stringify(r)));
