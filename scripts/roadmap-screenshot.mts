import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/roadmap-shots", { recursive: true });

const BASE = "http://localhost:3007";
// Arjun's session (Storm, 10-11) — arjun-test@thehumandecision.com
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/simplified/roadmap?session=${SESSION}`, { waitUntil: "networkidle" });

const body = await page.textContent("body") ?? "";

// Check for stale copy
const hasStale = body.includes("Not yet written") || body.includes("still being authored");
// Check all 6 week titles appear
const hasW4 = body.includes("When the Choice Goes Wrong");
const hasW5 = body.includes("Not Just His Choice");
const hasW6 = body.includes("Choosing Without Being Asked");
// Check new attention-building copy
const hasNewCopy = body.includes("How to notice it and talk about it");
const hasOldCopy = body.includes("Simple, real practices");

console.log(`Stale "Not yet written" present: ${hasStale} (want: false)`);
console.log(`Week 4 title visible: ${hasW4} (want: true)`);
console.log(`Week 5 title visible: ${hasW5} (want: true)`);
console.log(`Week 6 title visible: ${hasW6} (want: true)`);
console.log(`New attention-building copy present: ${hasNewCopy} (want: true)`);
console.log(`Old "Simple, real practices" present: ${hasOldCopy} (want: false)`);

await page.screenshot({ path: "/tmp/roadmap-shots/full-page.png", fullPage: true });
// Crop to the week preview section only
await page.locator("h2").filter({ hasText: "preview" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/roadmap-shots/week-grid.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
// Scroll to "What you'll receive"
await page.locator("h2").filter({ hasText: "receive" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: "/tmp/roadmap-shots/receive-section.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });

console.log("Screenshots saved to /tmp/roadmap-shots/");
await browser.close();
