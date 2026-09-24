import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/roadmap-phrases", { recursive: true });

const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";
const URL = `http://localhost:3007/simplified/roadmap?session=${SESSION}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

// The phrases render inside a styled div as &ldquo;phrase&rdquo;
// Grab all italic text (fontStyle: italic) — that's where the phrases render
const phrases = await page.evaluate(() => {
  const results: string[] = [];
  document.querySelectorAll("div").forEach(el => {
    const style = (el as HTMLElement).style;
    if (style.fontStyle === "italic" && (el as HTMLElement).innerText?.trim()) {
      results.push((el as HTMLElement).innerText.trim());
    }
  });
  return results;
});

console.log("Italic phrases found:", phrases);

// Also get the full text and look for quoted phrases
const fullText = await page.evaluate(() => document.body.innerText);
const quoteMatches = [...fullText.matchAll(/“([^"]+)”/g)].map(m => m[1].trim());
console.log("\nQuoted phrases (“...”) found:", quoteMatches);

// Screenshot the week strip area
await page.screenshot({ path: "/tmp/roadmap-phrases/week-strip.png", clip: { x: 0, y: 400, width: 1440, height: 600 } });
console.log("\nWeek strip screenshot: /tmp/roadmap-phrases/week-strip.png");

await browser.close();
process.exit(0);
