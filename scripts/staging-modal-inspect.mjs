/**
 * Diagnostic: open the Razorpay modal and dump the iframe's input elements
 * so we can identify the correct selectors for the payment test.
 */
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import fs from "fs";

const BASE   = "https://attention-architect-v2-staging.vercel.app";
const SS_DIR = "/tmp/staging-payment-screenshots";
const BYPASS = fs.readFileSync("/tmp/.staging-bypass", "utf8").trim();
const sql    = neon(process.env.DATABASE_URL);

const SESSION = "aae4b425-4097-4ef8-979f-7e8637e5632d";
await sql`UPDATE assessments SET phone = NULL WHERE session_id = ${SESSION}::uuid`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  extraHTTPHeaders: { "x-vercel-protection-bypass": BYPASS },
});
const page = await ctx.newPage();

await page.goto(`${BASE}/report/${SESSION}`, { waitUntil: "networkidle" });
await page.fill('input[type="tel"]', "9876543210");
await page.click('button[type="submit"]');
await page.waitForTimeout(3500);

const continueBtn = await page.$('button:has-text("Continue")');
if (continueBtn) { await continueBtn.click(); await page.waitForTimeout(600); }

// Click ₹999 button
await page.click('button:has-text("Open")');
await page.waitForTimeout(2000);

// Wait for Razorpay iframe
await page.waitForSelector('iframe[src*="razorpay.com"]', { timeout: 15000 });
await page.waitForTimeout(1500);

// Screenshot the full page with modal
await page.screenshot({ path: `${SS_DIR}/inspect-01-modal.png`, fullPage: false });
console.log("📸 inspect-01-modal.png");

// Use frameLocator for proper cross-origin iframe interaction
const fl = page.frameLocator('iframe[src*="razorpay.com"]').first();
console.log("✓ Got Razorpay frameLocator");

async function dumpFrame(frameLocator, rawFrame, label) {
  try {
    const inputs = await rawFrame.evaluate(() =>
      Array.from(document.querySelectorAll("input, button, [role='button']")).map(el => ({
        tag: el.tagName, type: el.type || null, name: el.name || null, id: el.id || null,
        placeholder: el.placeholder || null, "data-field": el.getAttribute("data-field"),
        text: el.textContent?.trim().slice(0, 50) || null, visible: el.offsetParent !== null,
        value: (el.value || "").slice(0, 30) || null,
      }))
    );
    const bodyText = await rawFrame.evaluate(() => document.body.innerText.slice(0, 400));
    console.log(`\n── ${label} (${inputs.length} interactive elements) ──`);
    console.log(`Body: ${bodyText.replace(/\n/g, " | ")}`);
    inputs.filter(e => e.visible).forEach((el, i) => console.log(`  [${i}] ${JSON.stringify(el)}`));
  } catch (e) {
    console.log(`  (dumpFrame error: ${e.message.slice(0, 60)})`);
  }
}

const rawFrame = page.frames().find(f => f.url().includes("razorpay.com"));

// ── Step 1: Contact screen ──────────────────────────────────────────────────
await dumpFrame(fl, rawFrame, "Contact screen");
await page.screenshot({ path: `${SS_DIR}/inspect-02-contact.png` });

// Read current value via raw frame
const currentVal = await rawFrame.evaluate(() =>
  document.querySelector('input[name="contact"]')?.value ?? "(null)"
);
console.log(`\n  Contact field value before interaction: "${currentVal}"`);

// Use pressSequentially on frameLocator — fires individual keystroke events React processes
const phoneInput = fl.locator('input[name="contact"]');
await phoneInput.click();
// Clear any existing content first
await phoneInput.selectText().catch(() => {});
// Try a realistic-looking number (not sequential/repetitive)
await phoneInput.pressSequentially("8041212323", { delay: 80 });
await page.waitForTimeout(500);
const valAfter = await rawFrame.evaluate(() =>
  document.querySelector('input[name="contact"]')?.value ?? "(null)"
);
console.log(`  Contact field value after pressSequentially: "${valAfter}"`);

// Monitor network to see if Razorpay makes API calls during Continue
const rzpRequests = [];
page.on('request', req => { if (req.url().includes('razorpay.com/v1/')) rzpRequests.push(req.url()); });

// Click Continue using frameLocator
await fl.locator('button[name="button"]:has-text("Continue")').click({ timeout: 5000 });
console.log("✓ Clicked Continue on contact screen");
await page.waitForTimeout(2500);
console.log(`  Razorpay API calls during Continue: ${rzpRequests.length}`);
rzpRequests.forEach(u => console.log(`    ${u.slice(0, 100)}...`));
await page.screenshot({ path: `${SS_DIR}/inspect-03-after-continue.png` });
console.log("📸 inspect-03-after-continue.png");

// ── Step 2: Payment method screen ────────────────────────────────────────────
const rawFrame2 = page.frames().find(f => f.url().includes("razorpay.com"));
await dumpFrame(fl, rawFrame2, "After contact → payment method screen");
await page.screenshot({ path: `${SS_DIR}/inspect-04-payment-methods.png` });
console.log("📸 inspect-04-payment-methods.png");

// Take screenshot of payment method screen
await page.screenshot({ path: `${SS_DIR}/inspect-04b-payment-methods.png` });
console.log("📸 inspect-04b-payment-methods.png");

// Dump ALL elements with text "Cards" or card-related text
const rawFrame3 = page.frames().find(f => f.url().includes("razorpay.com"));
const cardElements = await rawFrame3.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  return all
    .filter(el => el.children.length === 0 && (el.textContent?.trim() === 'Cards' || el.textContent?.trim() === 'Card'))
    .map(el => ({
      tag: el.tagName, id: el.id || null, class: el.className?.toString().slice(0,60) || null,
      role: el.getAttribute('role'), text: el.textContent?.trim(),
      visible: el.offsetParent !== null,
      parentTag: el.parentElement?.tagName, parentClass: el.parentElement?.className?.toString().slice(0,60) || null,
    }));
});
console.log("\n── Elements with text 'Cards' or 'Card' ──");
cardElements.forEach((el, i) => console.log(`  [${i}] ${JSON.stringify(el)}`));

// Try clicking via getByText
try {
  await fl.getByText("Cards", { exact: true }).first().click({ timeout: 5000 });
  console.log("✓ Clicked 'Cards' via getByText");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SS_DIR}/inspect-05-card-form.png` });
  console.log("📸 inspect-05-card-form.png");
  const rawFrame4 = page.frames().find(f => f.url().includes("razorpay.com"));
  await dumpFrame(fl, rawFrame4, "Card form (after clicking Cards)");
} catch (e) {
  console.log("getByText('Cards') failed:", e.message.slice(0, 100));
}

await browser.close();
console.log("\nDone.");
