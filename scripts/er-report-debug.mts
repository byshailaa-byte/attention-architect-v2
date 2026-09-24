import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("/tmp/er-shots", { recursive: true });

const BASE = "http://localhost:3007";
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/report/${SESSION}`, { timeout: 30000 });
await page.waitForTimeout(5000);

// Take full page screenshot
await page.screenshot({ path: "/tmp/er-shots/report-full.png", fullPage: true });
console.log("Full page screenshot saved.");

// Get text of all p and h2 elements
const texts = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll("p, h1, h2, h3, section > *"));
  return els.map(e => e.textContent?.trim().slice(0,100)).filter(Boolean).slice(-30);
});
console.log("Last 30 text elements:\n" + texts.join("\n---\n"));

await browser.close();
