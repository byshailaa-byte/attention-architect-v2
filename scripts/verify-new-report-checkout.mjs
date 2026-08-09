import { chromium } from "playwright";

const SESSION = "b64778a6-5e21-4f9c-83a0-10f77be3e6ea";
const BASE = "https://attentionparents.thehumandecision.in";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const apiHits = [];
page.on("response", resp => {
  if (resp.url().includes("/api/checkout/order")) apiHits.push(`${resp.status()}`);
});

// Load the freshly auto-generated report
const res = await page.goto(`${BASE}/report/${SESSION}`, { waitUntil: "networkidle", timeout: 40000 });
console.log("Page status:", res?.status());
await page.screenshot({ path: "/tmp/new-autogen-report.png", fullPage: false });

// Confirm narrative view rendered (not static fallback)
const hasNarrativeMarker = await page.locator("text=What we noticed, text=Behaviour Pattern, text=Family Attention Loop, text=Recognition").count();
const hasHeroH1 = await page.locator("h1").count();
console.log("Has narrative h1:", hasHeroH1 > 0);

// Scroll to price cards
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(600);

const btn999 = await page.locator("button").filter({ hasText: /Open.*Roadmap/ }).count();
const btn499 = await page.locator("button").filter({ hasText: /₹499/ }).count();
const brokenLinks = await page.locator('a[href*="/checkout?session"]').count();
console.log("₹999 button:", btn999 > 0 ? "found" : "MISSING");
console.log("₹499 button:", btn499 > 0 ? "found" : "MISSING");
console.log("Broken <a> links:", brokenLinks, "(must be 0)");

await page.screenshot({ path: "/tmp/new-autogen-pricecards.png", fullPage: false });

// Click ₹999
await page.locator("button").filter({ hasText: /Open.*Roadmap/ }).first().click();
await page.waitForTimeout(4000);

const frames = page.frames().filter(f => f.url().includes("razorpay"));
console.log("Razorpay opened:", frames.length > 0 ? "YES" : "NO");
console.log("/api/checkout/order response:", apiHits[0] ?? "no hit");

await page.screenshot({ path: "/tmp/new-autogen-razorpay.png", fullPage: false });
await browser.close();

console.log("\nAll checks passed:", res?.status() === 200 && btn999 > 0 && brokenLinks === 0 && apiHits[0] === "200" && frames.length > 0);
