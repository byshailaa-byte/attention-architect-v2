import { neon } from "@neondatabase/serverless";

const dev  = neon("postgresql://neondb_owner:npg_thoI2TR9gHFj@ep-wild-paper-aqlx0vrm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");
const prod = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

const userId     = "66cbb0d0-5082-43bb-b743-51016b80bf1b";
const assessId   = "f94a3f55-f2d5-40cf-a2e5-20f9db844b2d";
const purchaseId = "a5703b1d-f2ff-417a-8d1a-65c02a3368f9";

const [uRows, aRows, lmsP, lmsR] = await Promise.all([
  prod`SELECT id, email, onboarding_completed_at FROM users WHERE id = ${userId}::uuid` as unknown as Promise<{id:string;email:string;onboarding_completed_at:Date|null}[]>,
  prod`SELECT id, session_id, child_name, child_gender, age_band, archetype, parent_pattern, weakest_two, answers, dimensions, concerns, worry_followup, generation_attempts, archetype_fit_tier, parent_instinct_fit_tier FROM assessments WHERE id = ${assessId}::uuid` as unknown as Promise<Record<string, unknown>[]>,
  prod`SELECT user_id, assessment_id, week, day, completed_at FROM lms_progress WHERE user_id = ${userId}::uuid` as unknown as Promise<Record<string, unknown>[]>,
  prod`SELECT user_id, week, day, outcome, note FROM lms_reflections WHERE user_id = ${userId}::uuid` as unknown as Promise<Record<string, unknown>[]>,
]);

console.log(`Seeding: ${uRows[0]?.email} / ${(aRows[0] as {archetype:string})?.archetype} — ${lmsP.length} progress, ${lmsR.length} reflections`);

await dev`
  INSERT INTO users (id, email, onboarding_completed_at)
  VALUES (${uRows[0].id}, ${uRows[0].email}, ${uRows[0].onboarding_completed_at})
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, onboarding_completed_at = EXCLUDED.onboarding_completed_at
`;
console.log("✓ user");

const a = aRows[0] as {
  id:string; session_id:string; child_name:string; child_gender:string;
  age_band:string; archetype:string; parent_pattern:string; weakest_two:string[];
  answers:unknown; dimensions:unknown; concerns:string[];
  worry_followup:string|null; generation_attempts:number;
  archetype_fit_tier:string|null; parent_instinct_fit_tier:string|null;
};
await dev`
  INSERT INTO assessments (id, session_id, child_name, child_gender, age_band, archetype, parent_pattern, weakest_two, answers, dimensions, concerns, worry_followup, generation_attempts, archetype_fit_tier, parent_instinct_fit_tier)
  VALUES (
    ${a.id}::uuid, ${a.session_id}::uuid, ${a.child_name}, ${a.child_gender},
    ${a.age_band}, ${a.archetype}, ${a.parent_pattern}, ${a.weakest_two},
    ${JSON.stringify(a.answers)}::jsonb, ${JSON.stringify(a.dimensions)}::jsonb,
    ${a.concerns}, ${a.worry_followup}, ${a.generation_attempts},
    ${a.archetype_fit_tier}, ${a.parent_instinct_fit_tier}
  )
  ON CONFLICT (id) DO NOTHING
`;
console.log("✓ assessment");

// 'full' is a valid tier value in the dev DB check constraint
await dev`
  INSERT INTO purchases (id, user_id, assessment_id, tier, amount_paise, razorpay_order_id, status, created_at)
  VALUES (${purchaseId}::uuid, ${userId}::uuid, ${assessId}::uuid, 'full', 0, 'seed_placeholder', 'paid', now())
  ON CONFLICT (id) DO NOTHING
`;
console.log("✓ purchase");

for (const row of lmsP) {
  const r = row as { user_id:string; assessment_id:string|null; week:number; day:number; completed_at:Date };
  await dev`
    INSERT INTO lms_progress (user_id, assessment_id, week, day, completed_at)
    VALUES (${r.user_id}::uuid, ${r.assessment_id}::uuid, ${r.week}, ${r.day}, ${r.completed_at})
    ON CONFLICT (user_id, week, day) DO NOTHING
  `;
}
console.log(`✓ ${lmsP.length} progress rows`);

for (const row of lmsR) {
  const r = row as { user_id:string; week:number; day:number; outcome:string; note:string|null };
  await dev`
    INSERT INTO lms_reflections (user_id, week, day, outcome, note)
    VALUES (${r.user_id}::uuid, ${r.week}, ${r.day}, ${r.outcome}, ${r.note})
    ON CONFLICT (user_id, week, day) DO UPDATE SET outcome = EXCLUDED.outcome, note = EXCLUDED.note
  `;
}
console.log(`✓ ${lmsR.length} reflection rows`);
console.log("Done ✓");
