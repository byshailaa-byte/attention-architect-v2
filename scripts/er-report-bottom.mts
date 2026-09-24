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
// Get the last 2000 chars of body text to see what's at the bottom
const body = await page.textContent("body") ?? "";
console.log("Last 2000 chars of body:\n" + body.slice(-2000));
await browser.close();
