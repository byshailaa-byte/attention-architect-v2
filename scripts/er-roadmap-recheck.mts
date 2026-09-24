import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("/tmp/er-shots", { recursive: true });
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";
const BASE = "http://localhost:3007";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/simplified/roadmap?session=${SESSION}`, { waitUntil: "networkidle" });
const body = await page.textContent("body") ?? "";
console.log(`"{{child_pronoun_subj}}" still present = ${body.includes("{{child_pronoun_subj}}")}`);
console.log(`"they owned" present = ${body.includes("they owned")}`);
// Scroll to week preview
await page.locator("text=A preview of").scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/er-shots/06b-roadmap-weeks-fixed.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
await browser.close();
console.log("Done");
