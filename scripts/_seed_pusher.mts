// Seeds a synthetic local-only test user: The Captain × The Pusher, W3 D1+D2 complete.
import { neon } from "@neondatabase/serverless";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

const dev = neon("postgresql://neondb_owner:npg_thoI2TR9gHFj@ep-wild-paper-aqlx0vrm.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

const userId     = "aaaabbbb-0001-0001-0001-000000000001";
const assessId   = "aaaabbbb-0002-0002-0002-000000000002";
const purchaseId = "aaaabbbb-0003-0003-0003-000000000003";
const sessionId  = "aaaabbbb-0004-0004-0004-000000000004";

const hash = await bcryptjs.hash("test1234", 12);

await dev`
  INSERT INTO users (id, email, password_hash, onboarding_completed_at)
  VALUES (${userId}::uuid, 'test-pusher@example.com', ${hash}, now())
  ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash
`;
console.log("✓ user");

await dev`
  INSERT INTO assessments (
    id, session_id, child_name, child_gender, age_band,
    archetype, parent_pattern, weakest_two, answers, dimensions,
    concerns, worry_followup, generation_attempts
  ) VALUES (
    ${assessId}::uuid, ${sessionId}::uuid, 'Test Child', 'boy', '10-11',
    'The Captain', 'The Pusher', ARRAY['stability','resistance'],
    '{}', '{}', ARRAY['focus'], null, 1
  )
  ON CONFLICT (id) DO NOTHING
`;
console.log("✓ assessment");

await dev`
  INSERT INTO purchases (id, user_id, assessment_id, tier, amount_paise, razorpay_order_id, status, created_at)
  VALUES (${purchaseId}::uuid, ${userId}::uuid, ${assessId}::uuid, 'full', 0, 'test_pusher', 'paid', now())
  ON CONFLICT (id) DO NOTHING
`;
console.log("✓ purchase");

const now = new Date();
const w1d1 = new Date(now.getTime() - 14 * 24 * 3600_000);
const w1d2 = new Date(w1d1.getTime() + 25 * 3600_000);
const w1d3 = new Date(w1d2.getTime() + 25 * 3600_000);
const w1d4 = new Date(w1d3.getTime() + 25 * 3600_000);
const w1d5 = new Date(w1d4.getTime() + 25 * 3600_000);
const w1we = new Date(w1d5.getTime() + 25 * 3600_000);
const w2d1 = new Date(w1we.getTime() + 25 * 3600_000);
const w2d2 = new Date(w2d1.getTime() + 25 * 3600_000);
const w2d3 = new Date(w2d2.getTime() + 25 * 3600_000);
const w2d4 = new Date(w2d3.getTime() + 25 * 3600_000);
const w2d5 = new Date(w2d4.getTime() + 25 * 3600_000);
const w2we = new Date(w2d5.getTime() + 25 * 3600_000);
const w3d1 = new Date(w2we.getTime() + 25 * 3600_000);
const w3d2 = new Date(w3d1.getTime() + 25 * 3600_000);

const rows = [
  { week:1, day:1, t:w1d1 }, { week:1, day:2, t:w1d2 }, { week:1, day:3, t:w1d3 },
  { week:1, day:4, t:w1d4 }, { week:1, day:5, t:w1d5 }, { week:1, day:0, t:w1we },
  { week:2, day:1, t:w2d1 }, { week:2, day:2, t:w2d2 }, { week:2, day:3, t:w2d3 },
  { week:2, day:4, t:w2d4 }, { week:2, day:5, t:w2d5 }, { week:2, day:0, t:w2we },
  { week:3, day:1, t:w3d1 }, { week:3, day:2, t:w3d2 },
];

for (const r of rows) {
  await dev`
    INSERT INTO lms_progress (user_id, assessment_id, week, day, completed_at)
    VALUES (${userId}::uuid, ${assessId}::uuid, ${r.week}, ${r.day}, ${r.t})
    ON CONFLICT (user_id, week, day) DO NOTHING
  `;
}
console.log(`✓ ${rows.length} progress rows`);
console.log("Done. Email: test-pusher@example.com / Password: test1234");
