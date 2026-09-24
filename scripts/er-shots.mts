import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3007";
const SECRET = process.env.LMS_SESSION_SECRET!;
const DB_URL = process.env.DATABASE_URL!;
const sql = neon(DB_URL);

function hmacSign(userId: string, exp: number) {
  const payload = `${userId}.${exp}`;
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${hmac}`;
}

mkdirSync("/tmp/er-shots", { recursive: true });

// Get Arjun's session for report + roadmap (Storm, 10-11)
const arjunRows = await sql`
  SELECT u.id as user_id, a.session_id, a.archetype, a.age_band, a.child_name
  FROM users u
  JOIN purchases p ON p.user_id = u.id
  JOIN assessments a ON a.id = p.assessment_id
  WHERE u.email = 'arjun-test@thehumandecision.com' AND p.status = 'paid'
  ORDER BY p.created_at DESC LIMIT 1
` as { user_id: string; session_id: string; archetype: string; age_band: string; child_name: string }[];

if (!arjunRows.length) throw new Error("Arjun test user not found");
const { session_id, child_name } = arjunRows[0];
console.log(`Using: ${child_name} / session=${session_id}`);

const browser = await chromium.launch({ headless: true });

// 1 — Homepage
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/simplified`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/er-shots/01-homepage-hero.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Scroll to "What Makes This Different"
  await page.locator("h2").filter({ hasText: "both of you" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/er-shots/02-homepage-different.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Scroll to How It Works
  await page.locator("h2").filter({ hasText: "How It Works" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/er-shots/03-homepage-how-it-works.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Scroll to testimonials
  await page.locator("h2").filter({ hasText: "Saying" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/er-shots/04-homepage-testimonials.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Check: no "What is Attention Health?" section
  const body = await page.textContent("body") ?? "";
  console.log(`Homepage: "What is Attention Health?" present = ${body.includes("What is Attention Health?")}`);
  console.log(`Homepage: "Content pending" present = ${body.includes("Content pending")}`);
  console.log(`Homepage: "One real thing to try tonight" present = ${body.includes("One real thing to try tonight")}`);
  console.log(`Homepage: "Get My Child's Attention Profile" present = ${body.includes("Get My Child")}`);
  await ctx.close();
}

// 2 — Roadmap page (with Arjun's session — Storm)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/simplified/roadmap?session=${session_id}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/er-shots/05-roadmap-hero.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Scroll to week grid
  await page.locator("h2").filter({ hasText: "preview" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/er-shots/06-roadmap-weeks.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  const body = await page.textContent("body") ?? "";
  console.log(`Roadmap: archetype hook "ownership" visible = ${body.includes("ownership")}`);
  console.log(`Roadmap: "Here's what to do with it" present = ${body.includes("what to do with it")}`);
  console.log(`Roadmap: "Three moves:" present = ${body.includes("Three moves")}`);
  await ctx.close();
}

// 3 — Report FinalInvitation section (with Arjun's session)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/report/${session_id}`, { waitUntil: "networkidle", timeout: 30000 });
  // Scroll to FinalInvitation
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1200));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/er-shots/07-report-final-invitation.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  const body = await page.textContent("body") ?? "";
  console.log(`Report: "six weeks, one move at a time" present = ${body.includes("six weeks, one move")}`);
  console.log(`Report: old hedge "exists to help" present = ${body.includes("exists to help")}`);
  await ctx.close();
}

await browser.close();
console.log("Done — /tmp/er-shots/");
