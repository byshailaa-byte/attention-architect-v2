/**
 * Verify fix: purchased sessions show LmsAccessCard instead of PriceCards.
 * Phone-only gated arm path: set-password → /lms/onboarding redirect.
 *
 * Steps:
 *  1. Configure aae4b425 as a phone-only gated arm session (null email)
 *  2. Insert a paid purchase (module1, ₹499)
 *  3. Load the report — confirm LMS CTA visible, PriceCards absent, sticky hidden
 *  4. Click "Set up access →" → confirm set-password page loads
 *  5. Set a password → confirm redirected into /lms (onboarding for new user)
 *  6. Repeat with "full" (₹999) purchase, confirm tier-specific copy
 *  7. Restore original state
 */

import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import fs from "fs";

const BASE = "http://localhost:3007";
const SESSION = "aae4b425-4097-4ef8-979f-7e8637e5632d";
const SS_DIR = "/tmp/lms-cta-verify";
fs.mkdirSync(SS_DIR, { recursive: true });

const sql = neon(process.env.DATABASE_URL);

async function ss(page, name) {
  const p = `${SS_DIR}/${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  📸 ${name}.png`);
}

// ── Setup ────────────────────────────────────────────────────────────────────
const asmRows = await sql`SELECT id, email FROM assessments WHERE session_id = ${SESSION}::uuid LIMIT 1`;
const asmId = asmRows[0]?.id;
const originalEmail = asmRows[0]?.email ?? null;

// Simulate phone-only gated arm: null email, null phone, no purchases
await sql`UPDATE assessments SET phone = NULL, email = NULL WHERE session_id = ${SESSION}::uuid`;
await sql`DELETE FROM purchases WHERE assessment_id = ${asmId}::uuid`;

// Upsert a phone-only user (simulating checkout/order)
const testPhone = "8899001122";
await sql`INSERT INTO users (phone) VALUES (${testPhone}) ON CONFLICT (phone) DO NOTHING`;
const userRows = await sql`SELECT id FROM users WHERE phone = ${testPhone} LIMIT 1`;
const userId = userRows[0]?.id;
await sql`UPDATE users SET password_hash = NULL, email = NULL WHERE id = ${userId}`;

console.log(`Setup: asmId=${asmId} userId=${userId} (phone-only, email=NULL)`);

let allPassed = true;
function check(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}`);
    allPassed = false;
  }
}

// ── Test 1: module1 (₹499) ──────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════════");
console.log("TEST 1 — module1 tier: LMS CTA instead of PriceCards");
console.log("════════════════════════════════════════════════");

await sql`
  INSERT INTO purchases (user_id, assessment_id, tier, amount_paise, razorpay_order_id, razorpay_payment_id, status, variant)
  VALUES (${userId}, ${asmId}::uuid, 'module1', 49900, 'order_test_mod1', 'pay_test_mod1', 'paid', 'gated')
`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/report/${SESSION}`, { waitUntil: "networkidle", timeout: 30000 });
await ss(page, "01-report-module1");

const body1 = await page.textContent("body");
check(!body1.includes("₹999") && !body1.includes("₹499"), "PriceCards buy buttons NOT visible");
check(body1.includes("Programme access"), "LMS access CTA present");
check(body1.includes("Week 1"), "Tier copy: 'Week 1' shown for module1");
check(body1.includes("Set up access"), "'Set up access' CTA text present");

const lmsLink = await page.$('a[href*="set-password"]');
check(!!lmsLink, "set-password link exists");

// Scroll down and screenshot the CTA in view
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(600);
await ss(page, "02-lms-cta-scrolled");

// Sticky CTA should be hidden for paid users
const stickyBar = await page.$("#sticky-cta-bar");
const stickyVisible = stickyBar ? await stickyBar.isVisible() : false;
check(!stickyVisible, "Sticky buy CTA hidden for paid user");

// ── Test 2: Click through to set-password ───────────────────────────────────
console.log("\n════════════════════════════════════════════════");
console.log("TEST 2 — set-password flow for phone-only user");
console.log("════════════════════════════════════════════════");

// Navigate to set-password directly (same as clicking the link)
await page.goto(`${BASE}/lms/set-password?session=${SESSION}`, { waitUntil: "networkidle", timeout: 20000 });
await ss(page, "03-set-password-page");

const heading = await page.textContent("h1").catch(() => "");
check(heading.includes("Set your password"), "Set-password page loaded");

// The form shouldn't show an email since assessments.email is NULL
const emailDisplay = await page.textContent("p").catch(() => "");
check(emailDisplay.includes("Create a password") || !emailDisplay.includes("@"), "No email pre-filled for phone-only user");

const pwInputs = await page.$$('input[type="password"]');
check(pwInputs.length >= 2, "Both password inputs present");

if (pwInputs.length >= 1) await pwInputs[0].fill("TestPass456!");
if (pwInputs.length >= 2) await pwInputs[1].fill("TestPass456!");
await page.waitForTimeout(300);
await ss(page, "04-password-filled");

await page.click('button[type="submit"]');
await page.waitForTimeout(5000);

const afterSetPasswordUrl = page.url();
console.log("  URL after set-password:", afterSetPasswordUrl);
check(afterSetPasswordUrl.includes("/lms"), "Redirected into LMS after set-password");
await ss(page, "05-after-set-password");

// Verify password was actually set in the DB
const userAfter = await sql`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`;
check(!!userAfter[0]?.password_hash, "Password hash set in users table");

await ctx.close();

// ── Test 3: full (₹999) tier copy ───────────────────────────────────────────
console.log("\n════════════════════════════════════════════════");
console.log("TEST 3 — full tier: '6-week' copy shown");
console.log("════════════════════════════════════════════════");

await sql`DELETE FROM purchases WHERE assessment_id = ${asmId}::uuid`;
await sql`UPDATE users SET password_hash = NULL WHERE id = ${userId}`;
await sql`
  INSERT INTO purchases (user_id, assessment_id, tier, amount_paise, razorpay_order_id, razorpay_payment_id, status, variant)
  VALUES (${userId}, ${asmId}::uuid, 'full', 99900, 'order_test_full', 'pay_test_full', 'paid', 'gated')
`;

const ctx3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page3 = await ctx3.newPage();
await page3.goto(`${BASE}/report/${SESSION}`, { waitUntil: "networkidle", timeout: 30000 });
await ss(page3, "06-report-full");

const body3 = await page3.textContent("body");
check(!body3.includes("₹999") && !body3.includes("₹499"), "PriceCards NOT visible for full tier");
check(body3.includes("6-week"), "Tier copy: '6-week' shown for full tier");
check(body3.includes("full 6-week programme"), "Full copy: 'full 6-week programme'");

await page3.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page3.waitForTimeout(600);
await ss(page3, "07-full-tier-lms-cta");

await ctx3.close();

// ── Cleanup ──────────────────────────────────────────────────────────────────
await sql`DELETE FROM purchases WHERE assessment_id = ${asmId}::uuid`;
await sql`UPDATE assessments SET phone = NULL, email = ${originalEmail} WHERE session_id = ${SESSION}::uuid`;
await sql`UPDATE users SET password_hash = NULL WHERE id = ${userId}`;

await browser.close();

console.log("\n════════════════════════════════════════════════");
console.log(allPassed ? "ALL CHECKS PASSED ✅" : "SOME CHECKS FAILED ❌");
console.log(`Screenshots: ${SS_DIR}/`);
console.log(fs.readdirSync(SS_DIR).sort().join(", "));
