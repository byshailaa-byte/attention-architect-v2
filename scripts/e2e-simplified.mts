// End-to-end simplified variant flow:
// homepage → name/age → concern → followup → assessment questions
// → simplified gate (on assessment page, BEFORE generating screen)
// → generating screen → report → roadmap.
// Answers real questions, generates a real report from those answers, screenshots each transition.

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = "http://localhost:3007";
const OUT  = path.join(__dirname, "../tmp-e2e");

async function ss(page: Awaited<ReturnType<typeof chromium.launch>>["contexts"][0]["pages"][0], name: string) {
  const { mkdirSync } = await import("fs");
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`  screenshot: ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro
  const page    = await ctx.newPage();

  // ── 1. Simplified homepage (v4) ───────────────────────────────────────────
  console.log("1. Simplified homepage");
  await page.goto(`${BASE}/simplified`, { waitUntil: "networkidle" });
  await ss(page, "01-homepage");

  // Click hero CTA → /simplified/start (name-age stage)
  await page.click("button:has-text('Understand My Child')");
  await page.waitForURL("**/simplified/start**", { timeout: 10000 });
  await ss(page, "02-name-age");

  // ── 2. Name + age capture ─────────────────────────────────────────────────
  console.log("2. Name + age");
  await page.fill("input[placeholder*='Arjun']", "TestFlow");
  await page.click("button:has-text('10–11')");
  await page.click("button:has-text('Continue')");
  await ss(page, "03-concern");

  // ── 3. Concern selection ──────────────────────────────────────────────────
  console.log("3. Concern selection");
  await page.click("button:has-text('Homework battles')");
  await page.click("button:has-text('Continue →')");
  await ss(page, "04-followup");

  // ── 4. Follow-up question ─────────────────────────────────────────────────
  console.log("4. Follow-up");
  await page.click("button:has-text('They delay starting')");
  // Navigates directly to /assessment — no "ready" screen, no pre-assessment
  await page.waitForURL("**/assessment**", { timeout: 10000 });
  await page.waitForTimeout(800);
  await ss(page, "05-assessment-first-q");

  // ── 5. Real assessment — answer all questions ─────────────────────────────
  console.log("5. Assessment — answering questions");
  let qCount = 0;
  const maxQ = 70;

  while (qCount < maxQ) {
    // Answer option buttons have no class; gate button has class "sv-gate-submit" — excluded.
    const opts = page.locator("button:not([class]):not(:empty)");
    const count = await opts.count();
    if (count === 0) {
      const url = page.url();
      if (url.includes("generating") || url.includes("simplified-v1")) {
        console.log(`  → redirected to: ${url}`);
        break;
      }
      // Check if the simplified gate has appeared on the assessment page
      const gateVisible = await page.locator("text=Where should we send it?").isVisible().catch(() => false);
      if (gateVisible) {
        console.log("  → simplified gate appeared on assessment page");
        break;
      }
      console.log("  no options found, breaking");
      break;
    }
    await opts.first().click();
    await page.waitForTimeout(250);
    qCount++;
  }

  console.log(`  answered ${qCount} questions`);

  // ── 6. Contact gate (NOW appears before generating screen) ────────────────
  // After assessment completes, gate shows on the assessment page itself.
  // Generation already started fire-and-forget at assessment_complete.
  const gateVisible = await page.locator("text=Where should we send it?").isVisible().catch(() => false);
  if (gateVisible) {
    console.log("6. Contact gate (before generating — correct order)");
    await ss(page, "06-gate");

    // Fill gate form
    await page.fill("input[placeholder*='Priya']", "E2E Tester");
    await page.fill("input[type='email']", "e2e@test.com");
    await page.fill("input[type='tel']", "9876543210");
    await ss(page, "07-gate-filled");

    // Submit via JS to bypass Next.js dev overlay
    await page.evaluate(() => {
      const btn = document.querySelector(".sv-gate-submit") as HTMLButtonElement | null;
      if (btn) btn.click();
    });
    // Gate navigates to /report/generating/...?dest=simplified
    await page.waitForURL("**/generating/**", { timeout: 30000 });
    console.log("  → gate submitted, generating screen reached");
  } else {
    // Fallback: already on generating page (shouldn't happen in new flow)
    console.log("6. No gate found — checking if generating page already reached");
    if (!page.url().includes("generating")) {
      await page.waitForURL("**/generating/**", { timeout: 30000 });
    }
  }

  await ss(page, "08-generating");
  console.log("  generating page reached, polling for report...");

  // Wait for redirect to simplified report
  await page.waitForURL("**/simplified-v1**", { timeout: 180000 });
  await ss(page, "09-report");
  console.log("7. Report ready:", page.url());

  // Mobile screenshot of report
  await page.setViewportSize({ width: 375, height: 812 });
  await ss(page, "10-report-375px");

  // Scroll to roadmap CTA
  await page.evaluate(() => {
    const btn = document.querySelector(".report-cta button");
    if (btn) btn.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(400);
  await ss(page, "11-report-cta");
  await page.dispatchEvent(".report-cta button", "click");
  await page.waitForURL("**/simplified/roadmap**", { timeout: 15000 });
  await ss(page, "12-roadmap-390px");

  // Roadmap at 375px
  await page.setViewportSize({ width: 375, height: 812 });
  await ss(page, "13-roadmap-375px");

  // Scroll down for week content screenshots
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  await ss(page, "14-roadmap-weeks-375px");

  console.log("8. Roadmap reached:", page.url());
  await browser.close();
  console.log("Done. Screenshots in tmp-e2e/");
})().catch(e => { console.error(e); process.exit(1); });
