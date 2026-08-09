import { chromium } from "playwright";

const BASE  = "https://attentionparents.thehumandecision.in";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Step 1
console.log("Step 1: landing page initial state...");
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
await page.screenshot({ path: "/tmp/lp-step1-blank.png" });

// Select age and concern
await page.locator("button.chip-btn").filter({ hasText: "10–11" }).first().click();
await page.waitForTimeout(150);
await page.locator("button.chip-btn").filter({ hasText: "Focus" }).first().click();
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp-step1-filled.png" });
console.log("  ✓ step1 with selections");

// Continue to step 2
await page.locator("button.cta-btn").first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/lp-step2.png" });
console.log("  ✓ step2 follow-up");

// Select follow-up option
await page.locator("button").nth(1).click();
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/lp-reveal-top.png" });
console.log("  ✓ personalized reveal");

// Scroll through sections
await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp-unfair-fight.png" });

await page.evaluate(() => window.scrollTo({ top: 1200, behavior: "instant" }));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp-measure-section.png" });

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight - 900, behavior: "instant" }));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp-testimonials.png" });

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight - 400, behavior: "instant" }));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp-pretrust.png" });

await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/lp-final-cta.png" });

// Check sticky bar
const stickyVisible = await page.locator(".land-sticky.show").isVisible().catch(() => false);
console.log("  sticky bar visible:", stickyVisible);

// Analytics check: verify gtag is defined
const gtagDefined = await page.evaluate(() => typeof window.gtag === "function");
console.log("  gtag defined:", gtagDefined);

await browser.close();
console.log("\n✓ All landing page screenshots captured");
