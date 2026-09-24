/**
 * Staging payment test — runs against the live Preview deployment.
 * Tests both tiers (₹999 full, ₹499 module1) end-to-end:
 *   phone capture → teaser → paywall → Razorpay modal → payment → report unlock
 * After each payment, queries the DB to verify idempotency:
 *   only one purchase record, only one funnel 'purchase' event.
 *
 * Razorpay test card: 4111 1111 1111 1111 | expiry 12/26 | CVV 123 | OTP 1234
 */

import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import fs from "fs";

const BASE = "https://attention-architect-v2-staging.vercel.app";
const SS_DIR = "/tmp/staging-payment-screenshots";
fs.mkdirSync(SS_DIR, { recursive: true });

const BYPASS = fs.readFileSync("/tmp/.staging-bypass", "utf8").trim();
if (!BYPASS) throw new Error("No bypass secret found at /tmp/.staging-bypass");

const sql = neon(process.env.DATABASE_URL);

const FULL_SESSION = "aae4b425-4097-4ef8-979f-7e8637e5632d"; // ₹999 full
const MOD1_SESSION = "f91346c9-7032-4d77-9f84-f0f7cf743563"; // ₹499 module1

// 4111...1111 is international Visa; rejected if account lacks international card support.
// 5267 3181 8797 5449 is a Mastercard test number (valid Luhn, domestic-range BIN).
const CARD_NUMBER = "5267 3181 8797 5449";
const CARD_EXPIRY = "1226";
const CARD_CVV    = "123";
const TEST_OTP    = "1234";
const TEST_PHONE  = "9876543210";  // used on our Screen 1 phone field
// Razorpay V2 contact screen phone — must not be a "fake" pattern (e.g. 9876543210,
// 9999999999 are blocked by Razorpay's client-side validation). 8041212323 passes.
const RZP_PHONE   = "8041212323";

async function ss(page, name) {
  const path = `${SS_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  📸 ${name}.png`);
  return path;
}

async function checkIdempotency(sessionId, label) {
  const asmRows = await sql`
    SELECT id FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
  `;
  const asmId = asmRows[0]?.id;

  const purchases = await sql`
    SELECT razorpay_payment_id, razorpay_order_id, status, variant, created_at
    FROM purchases
    WHERE assessment_id = ${asmId}::uuid
    ORDER BY created_at ASC
  `;
  console.log(`\n  [${label}] purchases (${purchases.length} row(s)):`);
  purchases.forEach(p => console.log(`    ${JSON.stringify(p)}`));

  const events = await sql`
    SELECT event_type, metadata, created_at
    FROM funnel_events
    WHERE session_id = ${sessionId}::uuid
      AND event_type IN ('purchase', 'begin_checkout', 'paywall_shown', 'teaser_shown',
                         'phone_capture_shown', 'generate_lead', 'checkout_modal_opened')
    ORDER BY created_at ASC
  `;
  console.log(`  [${label}] funnel events (${events.length}):`);
  events.forEach(e => console.log(`    ${e.event_type}: ${JSON.stringify(e.metadata)}`));

  const purchaseCount = purchases.length;
  const purchaseEventCount = events.filter(e => e.event_type === "purchase").length;

  if (purchaseCount !== 1) {
    console.error(`  ❌ IDEMPOTENCY FAIL: expected 1 purchase row, got ${purchaseCount}`);
  } else if (purchases[0].status !== "paid") {
    console.error(`  ❌ Purchase status is '${purchases[0].status}', expected 'paid'`);
  } else if (purchases[0].razorpay_payment_id === null) {
    console.warn(`  ⚠️  Purchase row exists but razorpay_payment_id is still NULL (capture not done yet?)`);
  } else {
    console.log(`  ✅ 1 purchase row, status=paid, razorpay_payment_id set`);
  }

  if (purchaseEventCount === 0) {
    console.warn(`  ⚠️  No 'purchase' funnel event yet — webhook may not have fired`);
  } else if (purchaseEventCount === 1) {
    console.log(`  ✅ Exactly 1 'purchase' funnel event — idempotency holds`);
  } else {
    console.error(`  ❌ IDEMPOTENCY FAIL: ${purchaseEventCount} 'purchase' events fired (should be 1)`);
  }

  return { purchaseCount, purchaseEventCount, paid: purchases[0]?.status === "paid" };
}

async function runPaymentTest(browser, sessionId, tier, tierLabel) {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`TIER: ${tierLabel} — session ${sessionId}`);
  console.log("═".repeat(70));

  // Reset session to clean state before each run
  const asmRows = await sql`SELECT id FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1`;
  const asmId = asmRows[0]?.id;
  await sql`UPDATE assessments SET phone = NULL WHERE session_id = ${sessionId}::uuid`;
  await sql`DELETE FROM purchases WHERE assessment_id = ${asmId}::uuid`;
  await sql`DELETE FROM funnel_events WHERE session_id = ${sessionId}::uuid AND event_type = 'purchase'`;
  console.log("  ✓ Session reset (phone=NULL, purchases deleted, purchase events cleared)");

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS },
  });
  const page = await ctx.newPage();

  // ── Screen 1: Phone capture ──────────────────────────────────────────────
  console.log("\n→ Screen 1: phone capture");
  await page.goto(`${BASE}/report/${sessionId}`, { waitUntil: "networkidle", timeout: 30000 });
  await ss(page, `${tier}-01-phone`);

  await page.fill('input[type="tel"]', TEST_PHONE);
  await page.waitForTimeout(300);
  await ss(page, `${tier}-02-phone-filled`);

  await page.click('button[type="submit"]');
  await page.waitForTimeout(3500);
  await ss(page, `${tier}-03-after-phone-submit`);

  // ── Screen 2: Teaser ─────────────────────────────────────────────────────
  const continueBtn = await page.$('button:has-text("Continue")');
  if (continueBtn) {
    console.log("→ Screen 2: teaser visible");
    await ss(page, `${tier}-04-teaser`);
    await continueBtn.click();
    await page.waitForTimeout(600);
  } else {
    console.log("→ No teaser screen (skipped to paywall)");
  }
  await ss(page, `${tier}-05-paywall`);

  // ── Screen 3: Paywall — click payment button ─────────────────────────────
  console.log(`→ Screen 3: clicking ${tier === "full" ? "₹999" : "₹499"} button`);
  if (tier === "full") {
    await page.click('button:has-text("Open")'); // "Open TestLive's Roadmap"
  } else {
    await page.click('button:has-text("Read the Report")'); // "Read the Report + Week 1 — ₹499"
  }
  await page.waitForTimeout(2000);
  await ss(page, `${tier}-06-after-payment-click`);

  // ── Razorpay modal ───────────────────────────────────────────────────────
  console.log("→ Waiting for Razorpay modal iframe…");
  const frameHandle = await page.waitForSelector('iframe[src*="razorpay.com"]', { timeout: 15000 }).catch(() => null);

  if (!frameHandle) {
    await ss(page, `${tier}-07-modal-not-found`);
    console.error("  ❌ Razorpay modal iframe did not appear");
    await ctx.close();
    return false;
  }

  await ss(page, `${tier}-07-modal-open`);
  console.log("  ✓ Razorpay modal opened");

  const frame = page.frameLocator('iframe[src*="razorpay.com"]').first();

  // ── Razorpay contact screen ──────────────────────────────────────────────
  // Razorpay V2 always shows a phone entry screen first.
  // RZP_PHONE must pass Razorpay's client-side validation
  // (sequential / repetitive numbers like 9876543210 are blocked).
  await ss(page, `${tier}-07b-contact-screen`);
  const contactInput = frame.locator('input[name="contact"]');
  await contactInput.waitFor({ timeout: 8000 });
  await contactInput.pressSequentially(RZP_PHONE, { delay: 60 });
  console.log("  ✓ Typed phone in Razorpay contact field");
  await page.waitForTimeout(400);
  await frame.locator('button[name="button"]:has-text("Continue")').click({ timeout: 6000 });
  console.log("  ✓ Clicked Continue (contact screen)");
  await page.waitForTimeout(2500);
  await ss(page, `${tier}-07c-payment-methods`);

  // ── Payment method screen → Cards ────────────────────────────────────────
  // Razorpay V2 shows a method selector (UPI, Cards, Netbanking…).
  // "Cards" appears as a <span> inside a list item; use getByText.
  await frame.getByText("Cards", { exact: true }).first().click({ timeout: 6000 });
  console.log("  ✓ Clicked Cards payment method");
  await page.waitForTimeout(1500);
  await ss(page, `${tier}-08-card-form`);

  // ── Card entry ───────────────────────────────────────────────────────────
  // Selectors confirmed via inspect: input[name="card.number"] etc.
  const cardNumField = frame.locator('input[name="card.number"]');
  await cardNumField.waitFor({ timeout: 8000 });
  await cardNumField.pressSequentially(CARD_NUMBER.replace(/\s/g, ""), { delay: 30 });
  console.log("  ✓ Card number filled");

  await frame.locator('input[name="card.expiry"]').pressSequentially(CARD_EXPIRY, { delay: 30 });
  console.log("  ✓ Expiry filled");

  await frame.locator('input[name="card.cvv"]').pressSequentially(CARD_CVV, { delay: 30 });
  console.log("  ✓ CVV filled");

  // Razorpay V2 may require name on card and email (depends on card type)
  await ss(page, `${tier}-09a-pre-name-field`);
  try {
    const nameField = frame.locator('[placeholder="Enter name on card"]');
    await nameField.waitFor({ timeout: 3000 });
    await nameField.pressSequentially("Test User", { delay: 30 });
    console.log("  ✓ Card name filled");
  } catch {
    console.log("  (no name field)");
  }
  try {
    const emailField = frame.locator('[placeholder="Enter Email"]');
    await emailField.waitFor({ timeout: 3000 });
    await emailField.pressSequentially("test@attention.test", { delay: 30 });
    console.log("  ✓ Email filled");
  } catch {
    console.log("  (no email field)");
  }

  await ss(page, `${tier}-09-card-filled`);

  // Submit payment — use the sticky bottom CTA (always visible on mobile viewport)
  await frame.locator('[data-testid="bottom-cta-button"]').click({ timeout: 6000 });
  console.log("  ✓ Clicked Continue (card submit)");
  await page.waitForTimeout(2000);
  await ss(page, `${tier}-10-after-pay-click`);

  // ── RBI card-save modal (Razorpay V2) ────────────────────────────────────
  // Razorpay shows "Save your card for future payments?" — click "Maybe later"
  try {
    const maybeLater = frame.locator('button:has-text("Maybe later")');
    await maybeLater.waitFor({ timeout: 4000 });
    await maybeLater.click();
    console.log("  ✓ Dismissed card-save modal (Maybe later)");
    await page.waitForTimeout(2500);
    await ss(page, `${tier}-10b-after-save-dismiss`);
  } catch {
    console.log("  (no card-save modal — skipping)");
  }

  // ── OTP / 3DS if needed ──────────────────────────────────────────────────
  // Razorpay test mode OTP is always 1234. OTP submit button says "Continue".
  try {
    const otpInput = frame.locator('input[placeholder*="OTP"], input[placeholder*="otp"]').first();
    await otpInput.waitFor({ timeout: 6000 });
    // Clear any existing value and type OTP
    await otpInput.click();
    await otpInput.fill("");
    await otpInput.pressSequentially(TEST_OTP, { delay: 60 });
    console.log("  ✓ OTP filled");
    await ss(page, `${tier}-11-otp-filled`);
    // OTP screen Continue button — use text match, NOT button[name="button"] which is ambiguous
    await frame.locator('button:has-text("Continue")').last().click({ timeout: 6000 });
    console.log("  ✓ OTP Continue clicked");
    // Wait longer for 3DS → payment → handler to complete
    await page.waitForTimeout(8000);
    await ss(page, `${tier}-11b-after-otp-submit`);
  } catch (e) {
    console.log(`  (no OTP/3DS screen or OTP failed: ${e.message?.slice(0, 50)})`);
  }

  await ss(page, `${tier}-12-post-payment`);

  // Wait for redirect back to report page
  console.log("→ Waiting for redirect to report page…");
  try {
    await page.waitForURL(`${BASE}/report/${sessionId}`, { timeout: 20000 });
    console.log("  ✓ Redirected to report page");
  } catch {
    console.log(`  Current URL: ${page.url()}`);
  }
  await page.waitForTimeout(2000);
  await ss(page, `${tier}-13-report-unlocked`);

  // Check if full report is visible (no gated screens)
  const heading = await page.textContent("h1, h2").catch(() => "");
  const hasPhoneScreen = await page.$('input[type="tel"]') !== null;
  console.log(`  Page heading: "${heading}"`);
  if (hasPhoneScreen) {
    console.error("  ❌ Still showing phone screen — report NOT unlocked");
  } else {
    console.log("  ✅ Full report rendered — report unlocked");
  }

  // Wait 8s for webhook to fire, then check idempotency
  console.log("\n→ Waiting 8s for webhook to fire…");
  await page.waitForTimeout(8000);
  await checkIdempotency(sessionId, tierLabel);

  await ctx.close();
  return true;
}

const browser = await chromium.launch({ headless: true });

const fullOk  = await runPaymentTest(browser, FULL_SESSION, "full",  "₹999 full");
const mod1Ok  = await runPaymentTest(browser, MOD1_SESSION, "mod1",  "₹499 module1");

await browser.close();

console.log("\n" + "═".repeat(70));
console.log(`SUMMARY: ₹999=${fullOk ? "✅" : "❌"}  ₹499=${mod1Ok ? "✅" : "❌"}`);
console.log(`Screenshots: ${SS_DIR}/`);
console.log(fs.readdirSync(SS_DIR).sort().join(", "));
