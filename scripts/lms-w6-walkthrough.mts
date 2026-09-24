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

mkdirSync("/tmp/w6-walkthrough", { recursive: true });
mkdirSync("/tmp/w6-patch-shot", { recursive: true });

// Use Arjun test user (Storm, 10-11) — arjun-test@thehumandecision.com
// Find the user id first
const arjunRows = await sql`
  SELECT u.id as user_id, a.archetype, a.age_band, a.child_name
  FROM users u
  JOIN purchases p ON p.user_id = u.id
  JOIN assessments a ON a.id = p.assessment_id
  WHERE u.email = 'arjun-test@thehumandecision.com'
    AND p.status = 'paid'
  ORDER BY p.created_at DESC
  LIMIT 1
` as { user_id: string; archetype: string; age_band: string; child_name: string }[];

if (!arjunRows.length) throw new Error("Arjun test user not found");
const { user_id, archetype, age_band, child_name } = arjunRows[0];
console.log(`Using: ${child_name} | archetype=${archetype} | band=${age_band} | userId=${user_id}`);

const token = sign(user_id, Math.floor(Date.now() / 1000) + 7200);

const browser = await chromium.launch({ headless: true });

// Task 1 verification — Storm Week 6 patch screenshot (band 10-11 = Storm's band for Arjun)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "lms_session", value: token, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lms/week/6`, { waitUntil: "networkidle" });
  const body = await page.textContent("body") ?? "";
  const hasToken = body.includes("{{") || body.includes("[[MISSING]]");
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  await page.screenshot({ path: "/tmp/w6-patch-shot/storm-10-11-w6.png", fullPage: true });
  console.log(`[Task 1] Storm 10-11 Week 6: h1="${h1}" tokens=${hasToken} → /tmp/w6-patch-shot/storm-10-11-w6.png`);
  await ctx.close();
}

// Task 3 — full 6-week walkthrough
for (let week = 1; week <= 6; week++) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "lms_session", value: token, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lms/week/${week}`, { waitUntil: "networkidle" });
  const body = await page.textContent("body") ?? "";
  const hasToken = body.includes("{{") || body.includes("[[MISSING]]");
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  const currentUrl = page.url();
  const is404 = currentUrl.includes("/lms/login") || !body.toLowerCase().includes(`week ${week}`);
  const outPath = `/tmp/w6-walkthrough/week-${week}.png`;
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`[Task 3] Week ${week}: h1="${h1}" tokens=${hasToken} 404=${is404} url=${currentUrl}`);
  await ctx.close();
}

await browser.close();
console.log("Done.");
