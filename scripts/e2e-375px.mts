// Part 4: Screenshot assessment screens + contact gate at 375px (iPhone SE / narrowest common mobile).
// Loads an already-submitted assessment session and screenshots assessment/gate at narrow width.
// Also screenshots roadmap at 375px for Part 2 verification.

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "http://localhost:3007";
const OUT  = path.join(__dirname, "../tmp-e2e-375");

async function ss(page: Awaited<ReturnType<typeof chromium.launch>>["contexts"][0]["pages"][0], name: string) {
  const { mkdirSync } = await import("fs");
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`  screenshot: ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx375  = await browser.newContext({ viewport: { width: 375, height: 812 } }); // iPhone SE
  const page    = await ctx375.newPage();

  // ── Name/age screen at 375px ──────────────────────────────────────────────
  console.log("Name/age at 375px");
  await page.goto(`${BASE}/simplified/start`, { waitUntil: "networkidle" });
  await ss(page, "p4-01-name-age-375px");

  // Select age to see active CTA
  await page.click("button:has-text('10–11')");
  await ss(page, "p4-02-name-age-age-selected-375px");

  // ── Concern screen at 375px ───────────────────────────────────────────────
  console.log("Concern at 375px");
  await page.click("button:has-text('Continue')");
  await ss(page, "p4-03-concern-375px");

  // Select concern
  await page.click("button:has-text('Homework battles')");
  await ss(page, "p4-04-concern-selected-375px");

  // ── Followup screen at 375px ──────────────────────────────────────────────
  console.log("Followup at 375px");
  await page.click("button:has-text('Continue →')");
  await ss(page, "p4-05-followup-375px");

  // ── Assessment question at 375px ──────────────────────────────────────────
  console.log("Assessment question at 375px");
  // Navigate to assessment with full params to bypass gatePass
  await page.goto(`${BASE}/assessment?name=TestMobile&age=10-11&concerns=homework&followup=They+delay+starting&variant=simplified`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await ss(page, "p4-06-assessment-question-375px");

  // Answer enough questions to trigger the gate (≥70 questions or until gate appears)
  let qCount = 0;
  while (qCount < 70) {
    const opts = page.locator("button:not([class]):not(:empty)");
    const count = await opts.count();
    if (count === 0) {
      const gateVisible = await page.locator("text=Where should we send it?").isVisible().catch(() => false);
      if (gateVisible) { console.log(`  → gate appeared after ${qCount} questions`); break; }
      break;
    }
    await opts.first().click();
    await page.waitForTimeout(200);
    qCount++;
  }

  // ── Contact gate at 375px ─────────────────────────────────────────────────
  const gateVisible = await page.locator("text=Where should we send it?").isVisible().catch(() => false);
  if (gateVisible) {
    console.log("Contact gate at 375px");
    await ss(page, "p4-07-gate-empty-375px");
    await page.fill("input[placeholder*='Priya']", "Mobile Tester");
    await page.fill("input[type='email']", "mobile@test.com");
    await page.fill("input[type='tel']", "9876543210");
    await ss(page, "p4-08-gate-filled-375px");
  } else {
    console.log("  gate not found");
  }

  // ── Roadmap at 375px ──────────────────────────────────────────────────────
  // Use the last E2E session for roadmap
  console.log("Roadmap at 375px — fetching latest session");
  await page.goto(`${BASE}/simplified/roadmap`, { waitUntil: "networkidle" });
  await ss(page, "p4-09-roadmap-top-375px");

  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(300);
  await ss(page, "p4-10-roadmap-weeks-375px");

  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(300);
  await ss(page, "p4-11-roadmap-locked-375px");

  await browser.close();
  console.log("Done. Screenshots in tmp-e2e-375/");
})().catch(e => { console.error(e); process.exit(1); });
