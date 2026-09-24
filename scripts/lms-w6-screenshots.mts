import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3007";
const SECRET = process.env.LMS_SESSION_SECRET!;
const sql = neon(process.env.DATABASE_URL!);

function sign(userId: string, exp: number) {
  const payload = `${userId}.${exp}`;
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${hmac}`;
}

mkdirSync("/tmp/w6-shots", { recursive: true });

const ts = Date.now();
const combos = [
  { archetype: "glue",    ageBand: "8-9"   },
  { archetype: "captain", ageBand: "10-11" },
  { archetype: "storm",   ageBand: "12-14" },
];

const users: { userId: string; token: string; archetype: string; ageBand: string }[] = [];
for (const { archetype, ageBand } of combos) {
  const userId = crypto.randomUUID();
  const aId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const token = sign(userId, Math.floor(Date.now() / 1000) + 3600);
  await sql`INSERT INTO users (id, email) VALUES (${userId}, ${"w6test-" + archetype + "-" + ts + "@test.local"})`;
  await sql`INSERT INTO assessments (id, session_id, child_name, archetype, age_band) VALUES (${aId}, ${sessionId}::uuid, ${"TestKid"}, ${archetype}, ${ageBand})`;
  await sql`INSERT INTO purchases (id, user_id, assessment_id, tier, razorpay_order_id, amount_paise, status) VALUES (${crypto.randomUUID()}, ${userId}, ${aId}, ${"full"}, ${"order_w6_" + archetype + "_" + ts}, ${0}, ${"paid"})`;
  users.push({ userId, token, archetype, ageBand });
}

const browser = await chromium.launch({ headless: true });

for (const { token, archetype, ageBand } of users) {
  const label = `${archetype}-${ageBand.replace(/-/g, "")}`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "lms_session", value: token, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/lms/week/6`, { waitUntil: "networkidle" });
  const body = await page.textContent("body") ?? "";
  const hasToken = body.includes("{{") || body.includes("[[MISSING]]");
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  const currentUrl = page.url();
  const is404 = currentUrl.includes("/lms/login") || !body.toLowerCase().includes("week 6");

  const outPath = `/tmp/w6-shots/${label}.png`;
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`${label}: tokens=${hasToken} 404=${is404} h1="${h1}" url=${currentUrl} → ${outPath}`);
  await ctx.close();
}

await browser.close();

// Cleanup
for (const { userId } of users) {
  await sql`DELETE FROM purchases WHERE user_id = ${userId}`;
  await sql`DELETE FROM assessments WHERE id IN (SELECT id FROM assessments WHERE id IN (SELECT assessment_id FROM purchases WHERE user_id = ${userId}))`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}
await sql`DELETE FROM purchases WHERE razorpay_order_id LIKE ${"order_w6_%_" + ts}`;
console.log("DB cleaned up.");
