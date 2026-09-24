import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_PROD!);

// Check my test session stored correctly
const testRows = await sql`
  SELECT session_id, concerns, worry_followup, parent_name, child_name
  FROM assessments
  WHERE session_id = '06f08a97-f6b9-4e46-9cbe-bf8d546b9fac'::uuid
` as { session_id: string; concerns: string[]; worry_followup: string; parent_name: string; child_name: string }[];

console.log("Test session stored:");
console.log(JSON.stringify(testRows[0], null, 2));

// Find any reports generated after the PR deploy (approx last 30 min)
// deploy ready ~1789543108266 ms epoch
const recentReports = await sql`
  SELECT r.id, r.archetype, r.status, r.generated_at,
         a.concerns, a.worry_followup,
         r.narrative_moments
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.generated_at > NOW() - INTERVAL '30 minutes'
    AND a.is_internal = false
  ORDER BY r.generated_at DESC
  LIMIT 3
` as { id: string; archetype: string; status: string; generated_at: string; concerns: string[]; worry_followup: string | null; narrative_moments: unknown }[];

console.log(`\nReports generated in last 30 min: ${recentReports.length}`);
for (const r of recentReports) {
  console.log(`\n  id=${r.id} archetype=${r.archetype} status=${r.status}`);
  console.log(`  concerns=${JSON.stringify(r.concerns)} worry_followup="${r.worry_followup}"`);
  const moments = r.narrative_moments as { title: string; body: string }[] | null;
  if (moments?.length) {
    console.log(`  moments (${moments.length}):`);
    for (const m of moments) {
      console.log(`    [${m.title}] ${m.body.slice(0, 120)}...`);
    }
  }
}

process.exit(0);
