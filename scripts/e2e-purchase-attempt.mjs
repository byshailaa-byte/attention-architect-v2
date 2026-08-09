/**
 * Attempts a checkout and observes:
 * 1. Whether the Razorpay key returned is test (rzp_test_) or live (rzp_live_)
 * 2. Whether the Razorpay modal loads and what it shows
 * 3. If test mode: attempt payment with Razorpay test credentials
 * 4. Whether /api/webhooks/razorpay is hit after payment
 *
 * Uses session b64778a6 (Arjun/Kavitha — existing published report, already claimed)
 */
import { chromium } from "playwright";

const BASE = "https://attentionparents.thehumandecision.in";
const SESSION = "b64778a6-5e21-4f9c-83a0-10f77be3e6ea";

const browser = await chromium.launch({ headless: false }); // visible so we can see the modal
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

let keyIdSeen = null;
let orderApiResponse = null;
let webhookHit = false;

// Intercept the /api/checkout/order response to see keyId prefix
page.on("response", async (resp) => {
  if (resp.url().includes("/api/checkout/order")) {
    try {
      const body = await resp.json();
      keyIdSeen = body.keyId;
      orderApiResponse = { status: resp.status(), orderId: body.orderId, keyId: body.keyId };
      console.log(`\n[CHECKOUT ORDER] status=${resp.status()} keyId=${body.keyId} orderId=${body.orderId}`);
      console.log(`[KEY MODE] ${body.keyId?.startsWith("rzp_test") ? "TEST MODE" : body.keyId?.startsWith("rzp_live") ? "LIVE MODE" : "UNKNOWN"}`);
    } catch {
      console.log(`[CHECKOUT ORDER] status=${resp.status()} (could not parse body)`);
    }
  }
  if (resp.url().includes("/api/webhooks/razorpay")) {
    webhookHit = true;
    console.log(`[WEBHOOK] hit: status=${resp.status()}`);
  }
});

console.log("Loading published report for Arjun...");
await page.goto(`${BASE}/report/${SESSION}`, { waitUntil: "networkidle", timeout: 40000 });
await page.screenshot({ path: "/tmp/purchase-1-report.png" });

// Scroll to price cards
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/purchase-2-cards.png" });

// Click ₹999 button
console.log("Clicking ₹999 button...");
const btn = page.locator("button").filter({ hasText: /Open.*Roadmap/ }).first();
await btn.click();
await page.waitForTimeout(5000); // wait for Razorpay modal to load

await page.screenshot({ path: "/tmp/purchase-3-modal.png" });
console.log(`Key mode: ${keyIdSeen?.startsWith("rzp_test") ? "TEST" : keyIdSeen?.startsWith("rzp_live") ? "LIVE" : "UNKNOWN ("+keyIdSeen+")"}`);

// Check if Razorpay modal is open
const frames = page.frames().filter(f => f.url().includes("razorpay") || f.url().includes("checkout"));
console.log(`Razorpay frames: ${frames.length}`);

if (keyIdSeen?.startsWith("rzp_test_") && frames.length > 0) {
  console.log("\n[TEST MODE DETECTED] Attempting payment with test UPI...");
  const frame = frames[0];

  // Try to find UPI option or card option in the Razorpay test modal
  try {
    // Razorpay test modal: look for a UPI option or card input
    await frame.waitForSelector("body", { timeout: 5000 });
    const frameBody = await frame.textContent("body").catch(() => "");
    console.log("Modal body (first 500 chars):", frameBody.slice(0, 500));

    // Try clicking "UPI" tab if visible
    const upiBtn = frame.locator("a, button, li").filter({ hasText: /UPI/i }).first();
    if (await upiBtn.count() > 0) {
      await upiBtn.click();
      await page.waitForTimeout(1000);
      // Enter test UPI ID
      const upiInput = frame.locator("input[placeholder*='UPI'], input[name*='upi'], input[id*='upi']").first();
      if (await upiInput.count() > 0) {
        await upiInput.fill("success@razorpay");
        await page.waitForTimeout(500);
        await frame.locator("button").filter({ hasText: /pay|submit/i }).first().click();
        console.log("Submitted test UPI payment — waiting for webhook...");
        await page.waitForTimeout(10000);
        await page.screenshot({ path: "/tmp/purchase-4-after-payment.png" });
      }
    }
  } catch (e) {
    console.log("Could not interact with modal:", e.message.slice(0, 100));
  }
} else if (frames.length > 0) {
  console.log("[LIVE MODE] Modal open — not attempting real payment. Screenshots taken.");
} else {
  console.log("[NO MODAL] Razorpay modal did not open.");
}

await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/purchase-5-final.png" });

console.log("\n=== RESULT ===");
console.log("Key mode:", keyIdSeen?.startsWith("rzp_test") ? "TEST" : keyIdSeen?.startsWith("rzp_live") ? "LIVE" : `UNKNOWN (${keyIdSeen})`);
console.log("Order created:", !!orderApiResponse?.orderId);
console.log("Razorpay modal opened:", frames.length > 0);
console.log("Webhook hit during session:", webhookHit);

await browser.close();
