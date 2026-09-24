import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/roadmap-wts", { recursive: true });

const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";
const URL = `http://localhost:3007/simplified/roadmap?session=${SESSION}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

// Extract ALL text from the page for phrase comparison
const fullText = await page.evaluate(() => document.body.innerText);

// Check WHAT TO SAY section presence
const hasWhatToSay = fullText.includes("WHAT TO SAY");
const hasWeek1Phrase = fullText.includes("Which one first — your call.") ||
  fullText.includes("Take as long as you need") ||
  fullText.includes("Do it your way") ||
  fullText.includes("Write it down, then come back") ||
  fullText.includes("I'll be right here") ||
  fullText.includes("We're good. Whenever you're ready") ||
  fullText.includes("This one's yours. Tell me") ||
  fullText.includes("Ten minutes on the clock");

const hasWeek6 = fullText.includes("Nothing. That is the week.");

console.log("WHAT TO SAY section:", hasWhatToSay ? "FOUND" : "NOT FOUND");
console.log("Week 1 phrase:", hasWeek1Phrase ? "FOUND" : "NOT FOUND");
console.log("Week 6 universal:", hasWeek6 ? "FOUND" : "NOT FOUND");

// Find and screenshot the WHAT TO SAY section
const wtsEls = page.getByText("WHAT TO SAY").first();
const wtsBox = await wtsEls.boundingBox().catch(() => null);
if (wtsBox) {
  await page.screenshot({
    path: "/tmp/roadmap-wts/wts-section.png",
    clip: { x: 0, y: Math.max(0, wtsBox.y - 20), width: 1440, height: 500 },
  });
  console.log("WHAT TO SAY section screenshot: /tmp/roadmap-wts/wts-section.png");
} else {
  console.log("No WHAT TO SAY element found for crop — taking full page shot");
}
await page.screenshot({ path: "/tmp/roadmap-wts/full.png", fullPage: true });
console.log("Full page: /tmp/roadmap-wts/full.png");

// Extract the actual phrases rendered
const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);
const wtsIdx = lines.findIndex(l => l.includes("WHAT TO SAY"));
if (wtsIdx >= 0) {
  console.log("\nLines around WHAT TO SAY:");
  lines.slice(wtsIdx, wtsIdx + 10).forEach(l => console.log(" ", l));
}

await browser.close();
process.exit(0);
