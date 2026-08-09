import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const res = await page.goto(
  "https://attentionparents.thehumandecision.in/report/7b8b008a-1326-42d6-925b-f9bde8f11be8",
  { waitUntil: "networkidle", timeout: 30000 }
);
console.log("Status:", res?.status());
await page.screenshot({ path: "/tmp/new-report.png", fullPage: false });
console.log("Done.");
await browser.close();
