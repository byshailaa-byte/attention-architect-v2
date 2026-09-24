// Test C: first-touch sessionStorage persistence across navigation
// Verify: params captured on first page, not overwritten when navigating to a page without params.
import { chromium } from "playwright";

const BASE = "http://localhost:3007";
const KEY = "aa_utm";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

// 1. Land on start page WITH UTM params
await page.goto(`${BASE}/simplified/start?utm_source=meta&utm_medium=paid&utm_campaign=test_sept&utm_content=creative_a&fbclid=abc123`);
await page.waitForLoadState("networkidle");
const afterLanding = await page.evaluate((k) => sessionStorage.getItem(k), KEY);
console.log("\n[1] After landing with params:");
console.log("    sessionStorage['aa_utm'] =", afterLanding);

// 2. Navigate to /simplified/start WITHOUT params (simulates clicking a nav link with no tracking)
await page.goto(`${BASE}/simplified/start`);
await page.waitForLoadState("networkidle");
const afterBlankNav = await page.evaluate((k) => sessionStorage.getItem(k), KEY);
console.log("\n[2] After navigating to /simplified/start (no params):");
console.log("    sessionStorage['aa_utm'] =", afterBlankNav);

// 3. Navigate to the homepage (different page entirely)
await page.goto(`${BASE}/`);
await page.waitForLoadState("networkidle");
const afterHome = await page.evaluate((k) => sessionStorage.getItem(k), KEY);
console.log("\n[3] After navigating to / (homepage):");
console.log("    sessionStorage['aa_utm'] =", afterHome);

// 4. Back to start page, still no params in URL
await page.goto(`${BASE}/simplified/start`);
await page.waitForLoadState("networkidle");
const afterReturn = await page.evaluate((k) => sessionStorage.getItem(k), KEY);
console.log("\n[4] After returning to /simplified/start (still no params in URL):");
console.log("    sessionStorage['aa_utm'] =", afterReturn);

const original = JSON.parse(afterLanding ?? "{}");
const final = JSON.parse(afterReturn ?? "{}");
const preserved = JSON.stringify(original) === JSON.stringify(final);
console.log("\n─────────────────────────────────────");
console.log(preserved
  ? "✓ PASS — first-touch UTM survived all navigation"
  : "✗ FAIL — UTM was overwritten");

await browser.close();
process.exit(preserved ? 0 : 1);
