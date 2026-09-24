import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("/tmp/er-shots", { recursive: true });

const BASE = "http://localhost:3007";
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/report/${SESSION}`, { timeout: 30000 });
await page.waitForTimeout(4000);

// Find "A roadmap built around" h2 and scroll to it
const found = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll("*"));
  for (const el of els) {
    if (el.textContent?.includes("roadmap is built to change") || el.textContent?.includes("A roadmap built around")) {
      el.scrollIntoView({ block: "center" });
      return el.textContent?.slice(0, 200);
    }
  }
  return null;
});
console.log("Found element:", found);
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/er-shots/07-report-final-invitation.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });

await browser.close();
console.log("Done");
