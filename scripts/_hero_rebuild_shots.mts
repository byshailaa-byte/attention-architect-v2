import { chromium } from "playwright";
import fs from "fs";

const URL = "http://localhost:3007/";
const OUT = "/Users/ablespace/attention-architect-v2/tmp-hero-rebuild";
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "mobile-375",   width: 375,  height: 812 },
  { name: "mobile-412",   width: 412,  height: 915 },
  { name: "mobile-430",   width: 430,  height: 932 },
];

const browser = await chromium.launch({ headless: true });

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(1500);
  // Hero viewport shot
  await page.screenshot({ path: `${OUT}/${vp.name}-hero.png`, fullPage: false });
  // Full page shot
  await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });
  await ctx.close();
  console.log(`${vp.name} done`);
}

await browser.close();
console.log("All shots saved to", OUT);
console.log(fs.readdirSync(OUT).sort().join(", "));
