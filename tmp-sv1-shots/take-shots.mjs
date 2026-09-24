import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION = "cdd3b23e-54cf-4a96-89a1-9387308a2699";
const BASE = "http://localhost:3007";
const URL = `${BASE}/preview/simplified-v1?session=${SESSION}`;
const OUT = __dirname;

const WIDTHS = [375, 412, 430];

const browser = await chromium.launch({ headless: true });
for (const w of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });
  const out = path.join(OUT, `sv1-${w}px.png`);
  await page.screenshot({ path: out, fullPage: true });
  console.log("saved:", out);
  await ctx.close();
}
await browser.close();
console.log("done");
