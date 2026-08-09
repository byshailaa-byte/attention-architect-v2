/**
 * E2E: screenshots the engagement screens mid-assessment.
 * Goes through the real public funnel, captures each engagement screen as it appears.
 */
import { chromium } from "playwright";

const BASE = "https://attentionparents.thehumandecision.in";
const CHILD = "Rohit";
const AGE   = "10-11";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/pre-assessment?age=${AGE}&concerns=attention,focus`, { waitUntil: "networkidle", timeout: 30000 });
await page.locator("input").first().fill(CHILD);
await page.locator("button").filter({ hasText: /begin|continue|start/i }).first().click();
await page.waitForURL("**/assessment**", { timeout: 10000 });

let screenshotsTaken = 0;
let questionCount = 0;

for (let i = 0; i < 60; i++) {
  // Check for engagement screen (has a "Continue →" / "Keep going" / "Finish" / "Almost there" button)
  const engagementCta = page.locator("button.cta-btn").filter({ hasText: /Continue|Keep going|Almost|Finish →/i });
  const isEngagement = await engagementCta.count() > 0;

  if (isEngagement) {
    screenshotsTaken++;
    await page.screenshot({ path: `/tmp/e2e-engagement-${screenshotsTaken}.png`, fullPage: false });
    const headline = await page.locator("h2").first().textContent().catch(() => "?");
    console.log(`  ✓ Engagement screen ${screenshotsTaken}: "${headline?.trim()}"`);
    await engagementCta.first().click();
    await page.waitForTimeout(200);
    continue;
  }

  // Check for post-assessment form
  const postForm = await page.locator("h2, h1").filter({ hasText: /almost|about you|your name|parent|results/i }).count();
  if (postForm > 0) {
    console.log(`  → Reached post-assessment after ${questionCount} questions answered`);
    break;
  }

  // Answer next question option
  const opts = page.locator("button").filter({ hasNotText: /begin|continue|back|skip|next|submit|keep|finish/i });
  const count = await opts.count();
  if (count === 0) { await page.waitForTimeout(300); continue; }
  await opts.first().click();
  questionCount++;
  await page.waitForTimeout(150);
}

console.log(`\nTotal engagement screens shown: ${screenshotsTaken}`);
console.log(`Total questions answered before stopping: ${questionCount}`);
console.log("Screenshots: /tmp/e2e-engagement-{1,2,3}.png");

await browser.close();
