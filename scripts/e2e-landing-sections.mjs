import { chromium } from "playwright";

const BASE = "https://attentionparents.thehumandecision.in";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Navigate through to reveal
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
await page.locator("button.chip-btn").filter({ hasText: "10–11" }).first().click();
await page.waitForTimeout(100);
await page.locator("button.chip-btn").filter({ hasText: "Focus" }).first().click();
await page.waitForTimeout(100);
await page.locator("button.cta-btn").first().click();
await page.waitForTimeout(300);
// Pick second follow-up option (index 1)
await page.locator("button").filter({ hasText: /Goes deep/ }).first().click();
await page.waitForTimeout(600);

// Now scroll to each section
const sections = [
  { section: "reveal",       scrollY: 0,    file: "/tmp/lp2-reveal.png" },
  { section: "unfair",       scrollY: 700,  file: "/tmp/lp2-unfair.png" },
  { section: "measure-top",  scrollY: 1400, file: "/tmp/lp2-measure.png" },
  { section: "archetypes",   scrollY: 2200, file: "/tmp/lp2-archetypes.png" },
  { section: "testimonials", scrollY: 3000, file: "/tmp/lp2-testimonials.png" },
];

for (const { scrollY, file, section } of sections) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), scrollY);
  await page.waitForTimeout(400);
  await page.screenshot({ path: file });
  console.log(`  ✓ ${section}`);
}

// Find and screenshot pretrust block
const pretrust = page.locator("[data-section='pretrust']");
await pretrust.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp2-pretrust.png" });
console.log("  ✓ pretrust");

// Final CTA
const finalcta = page.locator("[data-section='finalcta']");
await finalcta.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp2-finalcta.png" });
console.log("  ✓ finalcta");

// Verify analytics fires
const events = [];
page.on("request", req => {
  if (req.url().includes("/api/track/scroll") || req.url().includes("google-analytics")) {
    events.push(req.url().split("?")[0]);
  }
});
// Trigger scroll tracking
await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
await page.waitForTimeout(1000);

// Verify gtag
const gtagWorks = await page.evaluate(() => {
  const events = [];
  const originalGtag = window.gtag;
  window.gtag = (...args) => { events.push(args[0]); if (originalGtag) originalGtag(...args); };
  window.dispatchEvent(new Event("scroll"));
  return typeof originalGtag === "function";
});
console.log("  gtag present:", gtagWorks);

await browser.close();
console.log("\n✓ Done");
