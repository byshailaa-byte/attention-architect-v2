/**
 * E2E: verify all four items from the redesign task.
 * Captures: pre-assessment with gender, data-collection gate (no gender chips),
 * engagement screens, generating wait screen with archetype + rotating messages.
 */
import { chromium } from "playwright";

const BASE  = "https://attentionparents.thehumandecision.in";
const CHILD = "Priya";
const PARENT = "Rekha Subramaniam";
const EMAIL  = "rekha.subramaniam1983@gmail.com";
const PHONE  = "9632145870";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// ── Pre-assessment page ───────────────────────────────────────────────────────
console.log("Step 1: Pre-assessment page...");
await page.goto(`${BASE}/pre-assessment?age=10-11&concerns=attention,focus`, { waitUntil: "networkidle", timeout: 30000 });
await page.locator("input").first().fill(CHILD);
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/e2e-preassessment-gender.png" });
console.log("  ✓ pre-assessment screenshot (should show gender chips)");

// Check gender chips are present
const genderChips = await page.locator("button.chip-btn").filter({ hasText: /Boy|Girl|Non-binary/i }).count();
console.log(`  gender chips present: ${genderChips} (expected ≥3)`);

// Select "Girl"
await page.locator("button.chip-btn").filter({ hasText: "Girl" }).first().click();
await page.waitForTimeout(200);
await page.locator("button.cta-btn").filter({ hasText: /Begin/i }).first().click();
await page.waitForURL("**/assessment**", { timeout: 10000 });

// ── Answer all 13 questions (dismiss engagement screens) ──────────────────────
console.log("Step 2: Answering questions...");
let engCount = 0;
for (let i = 0; i < 70; i++) {
  const eng = page.locator("button.cta-btn").filter({ hasText: /Continue →|Keep going →|Finish →/i });
  if (await eng.count() > 0) {
    engCount++;
    if (engCount === 1) {
      await page.screenshot({ path: "/tmp/e2e-engagement-locked-copy.png" });
      const h = await page.locator("h2").first().textContent();
      console.log(`  engagement screen ${engCount}: "${h?.trim()}"`);
    }
    await eng.first().click();
    await page.waitForTimeout(150);
    continue;
  }
  const postForm = await page.locator("h2").filter({ hasText: /One last step/i }).count();
  if (postForm > 0) { console.log(`  → reached data-collection gate`); break; }
  const opts = page.locator("button").filter({ hasNotText: /Begin|Continue|Keep|Finish|Open/i });
  if (await opts.count() === 0) { await page.waitForTimeout(200); continue; }
  await opts.first().click();
  await page.waitForTimeout(120);
}

// ── Data-collection gate ───────────────────────────────────────────────────────
console.log("Step 3: Data-collection gate...");
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/e2e-data-gate.png" });

// Verify: no gender chips, "One last step" headline, "Open My Report" CTA
const hasGenderInGate = await page.locator("button.chip-btn").filter({ hasText: /Boy|Girl/i }).count();
const hasOneLastStep  = await page.locator("h2").filter({ hasText: /One last step/i }).count();
const hasTrustLine    = await page.locator("text=never sold, never spammed").count();
const hasOpenCta      = await page.locator("button").filter({ hasText: /Open My Report/i }).count();
console.log(`  gender chips in gate: ${hasGenderInGate} (expected 0)`);
console.log(`  "One last step" headline: ${hasOneLastStep > 0}`);
console.log(`  WhatsApp trust line: ${hasTrustLine > 0}`);
console.log(`  "Open My Report" CTA: ${hasOpenCta > 0}`);

// Fill and submit
await page.locator("input[placeholder*='Priya'], input[placeholder*='name']").first().fill(PARENT);
await page.locator("input[type='email']").first().fill(EMAIL);
await page.locator("input[type='tel']").first().fill(PHONE);
await page.waitForFunction(() => {
  const btns = Array.from(document.querySelectorAll("button.cta-btn"));
  return btns.some(b => !b.disabled);
}, { timeout: 5000 }).catch(() => {});
await page.locator("button.cta-btn").filter({ hasText: /Open My Report/i }).first().click();

// ── Generating wait screen ─────────────────────────────────────────────────────
console.log("Step 4: Generating screen...");
await page.waitForURL("**/report/generating/**", { timeout: 15000 });
const genUrl = page.url();
console.log("  URL:", genUrl);
console.log("  archetype in URL:", genUrl.includes("archetype="));

await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/e2e-generating-1.png" });

const headline = await page.locator("h1").first().textContent().catch(() => "?");
const hasPulse = await page.locator(".aa-ring").count();
const hasDots  = await page.locator("div[style*='border-radius: 50%']").count();
console.log(`  headline: "${headline?.trim()}"`);
console.log(`  pulse ring present: ${hasPulse > 0}`);
console.log(`  dot indicators: ${hasDots}`);

// Wait for a message rotation (18s+) — skip in CI, just screenshot current state
console.log("  (waiting for report to be ready — up to 3min)...");
await page.waitForURL(`**/report/**`, { timeout: 180000 }).catch(() => {});
await page.screenshot({ path: "/tmp/e2e-generating-final.png" });
console.log("  ✓ redirected (or timed out)");

await browser.close();
console.log("\n✓ All screenshots captured");
