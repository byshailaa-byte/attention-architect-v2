import { chromium } from "playwright";

const SESSION = "7b8b008a-1326-42d6-925b-f9bde8f11be8";
const BASE = "https://attentionparents.thehumandecision.in";
const URL = `${BASE}/report/${SESSION}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Track navigation and API calls
const navigations = [];
const apiCalls = [];

page.on("request", req => {
  if (req.url().includes("/checkout")) navigations.push(req.url());
  if (req.url().includes("/api/checkout/order")) apiCalls.push(req.url());
});

page.on("response", resp => {
  if (resp.url().includes("/api/checkout/order")) {
    apiCalls.push(`RESPONSE ${resp.status()} ${resp.url()}`);
  }
});

console.log("Loading report page...");
const res = await page.goto(URL, { waitUntil: "networkidle", timeout: 40000 });
console.log("Page status:", res?.status());

// Screenshot: before click — shows price cards area
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/before-click.png", fullPage: false });
console.log("Before-click screenshot saved.");

// Find the ₹999 button — should now be a <button> not <a>
const btn999 = page.locator("button").filter({ hasText: "Open" }).filter({ hasText: "Roadmap" }).first();
const btn499 = page.locator("button").filter({ hasText: "₹499" }).first();

console.log("₹999 button found:", await btn999.count() > 0);
console.log("₹499 button found:", await btn499.count() > 0);

// Check no <a href="/checkout"> anchor links remain
const brokenLinks = await page.locator('a[href*="/checkout?session"]').count();
console.log("Broken <a href=/checkout?...> links remaining:", brokenLinks, "(should be 0)");

// Click the ₹999 button
console.log("Clicking ₹999 button...");
await btn999.click();

// Wait a bit for the API call + Razorpay iframe to load
await page.waitForTimeout(4000);

// Screenshot after click
await page.screenshot({ path: "/tmp/after-click.png", fullPage: false });
console.log("After-click screenshot saved.");

// Check for Razorpay iframe
const razorpayFrame = page.frameLocator('iframe[src*="razorpay"]').first();
const razorpayVisible = await razorpayFrame.locator("body").count().catch(() => 0);
console.log("Razorpay iframe present:", razorpayVisible > 0 ? "YES" : "checking frames...");

// Check all frames
const frames = page.frames();
const razorFrames = frames.filter(f => f.url().includes("razorpay") || f.url().includes("checkout"));
console.log("Razorpay/checkout frames:", razorFrames.length, razorFrames.map(f => f.url()).join(", "));

console.log("\n=== Network summary ===");
console.log("Navigations to /checkout:", navigations.length > 0 ? navigations : "NONE (good)");
console.log("API calls to /api/checkout/order:", apiCalls.length > 0 ? apiCalls : "none");

await browser.close();
