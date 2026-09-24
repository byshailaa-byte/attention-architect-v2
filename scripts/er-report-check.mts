import { chromium } from "playwright";

const BASE = "http://localhost:3007";
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/report/${SESSION}`, { timeout: 30000 });
// Wait for the FinalInvitation section heading
await page.waitForSelector("h2", { timeout: 20000 });
await page.waitForTimeout(3000);
const body = await page.textContent("body") ?? "";
console.log(`"six weeks, one move at a time" present = ${body.includes("six weeks, one move at a time")}`);
console.log(`"exists to help" present = ${body.includes("exists to help")}`);
console.log(`"roadmap is built to change" present = ${body.includes("roadmap is built to change")}`);
// Find section
const idx = body.indexOf("You understand what has been happening");
if (idx >= 0) console.log(`Context: ...${body.slice(idx, idx + 120)}...`);
else console.log("FinalInvitation bridge text not found in body");
await browser.close();
