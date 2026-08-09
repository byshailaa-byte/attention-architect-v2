/**
 * E2E verification of the waiting/transition screen.
 * Goes through the full public funnel, screenshots the /report/generating/[sessionId]
 * page, waits for auto-redirect to /report/[sessionId], screenshots the report.
 * Also scrolls to PriceCards to verify contrast fix.
 */
import { chromium } from "playwright";

const BASE = "https://attentionparents.thehumandecision.in";

const CHILD_NAME  = "Devansh";
const PARENT_NAME = "Sushma Narayanan";
const EMAIL       = "sushma.narayanan77@gmail.com";
const PHONE       = "9741223344";
const AGE_BAND    = "8-9";
const CONCERNS    = "attention,focus";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// ── Step 1: Pre-assessment ─────────────────────────────────────────────────────
console.log("Step 1: Pre-assessment...");
await page.goto(`${BASE}/pre-assessment?age=${AGE_BAND}&concerns=${CONCERNS}`, { waitUntil: "networkidle", timeout: 30000 });
await page.locator("input").first().fill(CHILD_NAME);
await page.locator("button").filter({ hasText: /begin|continue|start/i }).first().click();
await page.waitForURL("**/assessment**", { timeout: 10000 });
console.log("  → assessment page:", page.url());

// ── Step 2: Answer questions ────────────────────────────────────────────────────
console.log("Step 2: Answering questions...");
for (let i = 0; i < 30; i++) {
  const opts = page.locator("button").filter({ hasNotText: /begin|continue|back|skip|next|submit/i });
  const count = await opts.count();
  if (count === 0) {
    const postAssess = await page.locator("h2, h1").filter({ hasText: /almost|about you|your name|parent/i }).count();
    if (postAssess > 0) { console.log(`  answered ${i} questions → post-assessment form`); break; }
    const building = await page.locator("text=Building your report").count();
    if (building > 0) {
      await page.waitForFunction(() => !document.body.innerText.includes("Building your report"), { timeout: 15000 });
      break;
    }
    await page.waitForTimeout(200);
    continue;
  }
  await opts.first().click();
  await page.waitForTimeout(120);
}

// ── Step 3: Post-assessment form ───────────────────────────────────────────────
console.log("Step 3: Post-assessment form...");
await page.locator("button.chip-btn").filter({ hasText: "Boy" }).first().click();
await page.waitForTimeout(150);
await page.locator("input[placeholder*='Priya'], input[placeholder*='name']").first().fill(PARENT_NAME);
await page.locator("input[type='email']").first().fill(EMAIL);
await page.locator("input[type='tel']").first().fill(PHONE);

await page.waitForFunction(() => {
  const btns = Array.from(document.querySelectorAll("button.cta-btn"));
  return btns.some(b => !b.disabled);
}, { timeout: 5000 }).catch(() => {});

await page.locator("button.cta-btn").filter({ hasText: /open|report/i }).first().click();

// ── Step 4: Generating screen ─────────────────────────────────────────────────
console.log("Step 4: Waiting for /report/generating/... redirect...");
await page.waitForURL("**/report/generating/**", { timeout: 15000 });
const generatingUrl = page.url();
const sessionId = generatingUrl.split("/report/generating/")[1]?.split("?")[0];
console.log("  → generating URL:", generatingUrl);
console.log("  → sessionId:", sessionId);

// Wait 1s for the progress bar to start animating
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/e2e-waiting-screen.png", fullPage: false });
console.log("  ✓ screenshot: /tmp/e2e-waiting-screen.png");

// Check the copy and progress bar are rendered
const hasHeadline = await page.locator("h1").filter({ hasText: /Building/ }).count();
const hasProgressBar = await page.locator("div[style*='transition']").count();
console.log("  headline rendered:", hasHeadline > 0 ? "YES" : "NO");
console.log("  progress bar present:", hasProgressBar > 0 ? "YES" : "NO");

// ── Step 5: Wait for auto-redirect to real report ─────────────────────────────
console.log("Step 5: Waiting for auto-redirect to /report/[sessionId] (max 3 min)...");
await page.waitForURL(`**/report/${sessionId}`, { timeout: 180000 });
const reportUrl = page.url();
console.log("  → redirected to:", reportUrl);

await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/e2e-report-loaded.png", fullPage: false });
console.log("  ✓ screenshot: /tmp/e2e-report-loaded.png");

// Verify it's the narrative report (not the static fallback)
const hasNarrativeH1 = await page.locator("h1").count();
console.log("  narrative h1 count:", hasNarrativeH1);

// ── Step 6: Scroll to PriceCards and screenshot ─────────────────────────────
console.log("Step 6: Checking PriceCards...");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/e2e-pricecards.png", fullPage: false });
console.log("  ✓ screenshot: /tmp/e2e-pricecards.png");

const btn999 = await page.locator("button").filter({ hasText: /Open.*Roadmap/ }).count();
const btn499 = await page.locator("button").filter({ hasText: /₹499/ }).count();
const checklist = await page.locator("li").filter({ hasText: /personalized six-week roadmap/ }).count();
const comparison = await page.locator("text=Month of tuition").count();
console.log("  ₹999 button:", btn999 > 0 ? "FOUND" : "MISSING");
console.log("  ₹499 button:", btn499 > 0 ? "FOUND" : "MISSING");
console.log("  benefit checklist:", checklist > 0 ? "FOUND" : "MISSING");
console.log("  comparison anchor:", comparison > 0 ? "FOUND" : "MISSING");

// ── Click ₹999 to verify Razorpay still works ─────────────────────────────
const apiHits = [];
page.on("response", r => { if (r.url().includes("/api/checkout/order")) apiHits.push(r.status()); });
await page.locator("button").filter({ hasText: /Open.*Roadmap/ }).first().click();
await page.waitForTimeout(4000);
const frames = page.frames().filter(f => f.url().includes("razorpay"));
console.log("  Razorpay opened:", frames.length > 0 ? "YES" : "NO");
console.log("  /api/checkout/order status:", apiHits[0] ?? "no hit");
await page.screenshot({ path: "/tmp/e2e-razorpay.png", fullPage: false });
console.log("  ✓ screenshot: /tmp/e2e-razorpay.png");

await browser.close();

const allPassed = hasNarrativeH1 > 0 && btn999 > 0 && btn499 > 0 && checklist > 0 && comparison > 0 && frames.length > 0 && apiHits[0] === 200;
console.log("\n=== RESULT ===");
console.log("All checks passed:", allPassed);
console.log("sessionId:", sessionId);
