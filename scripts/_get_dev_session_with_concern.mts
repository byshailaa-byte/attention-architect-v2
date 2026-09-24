import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`
  SELECT a.session_id, a.answers, a.concerns, a.worry_followup, a.child_name, a.age_band, a.child_gender,
         r.archetype, r.parent_instinct
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  WHERE r.status = 'published'
    AND r.superseded_by IS NULL
    AND a.concerns IS NOT NULL
    AND array_length(a.concerns, 1) > 0
    AND a.worry_followup IS NOT NULL
    AND a.worry_followup <> ''
  ORDER BY r.generated_at DESC
  LIMIT 1
` as { session_id: string; answers: Record<string,string>; concerns: string[]; worry_followup: string; child_name: string; age_band: string; child_gender: string; archetype: string; parent_instinct: string }[];

if (rows.length === 0) {
  console.log("No dev session with concern + worry_followup + published report found.");
} else {
  const r = rows[0];
  console.log(`session_id: ${r.session_id}`);
  console.log(`child: ${r.child_name}, ${r.age_band}, ${r.child_gender}`);
  console.log(`archetype: ${r.archetype}, instinct: ${r.parent_instinct}`);
  console.log(`concerns: ${JSON.stringify(r.concerns)}`);
  console.log(`worry_followup: "${r.worry_followup}"`);
  console.log(`answers: ${JSON.stringify(r.answers)}`);
}
process.exit(0);
