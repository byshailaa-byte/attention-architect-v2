import { chromium } from "playwright";
import { mkdirSync } from "fs";
mkdirSync("/tmp/accordion-shots", { recursive: true });

const BASE = "http://localhost:3007";
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";
const URL = `${BASE}/simplified/roadmap?session=${SESSION}`;

const browser = await chromium.launch({ headless: true });

// --- Desktop ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  // Scroll to accordion section
  await page.locator("text=Six weeks that build on each other").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/accordion-shots/01-desktop-accordion-hero.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Scroll to show more weeks (collapsed + expanded state)
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.screenshot({ path: "/tmp/accordion-shots/02-desktop-accordion-weeks.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  // Verify content
  const body = await page.textContent("body") ?? "";
  console.log(`"Six weeks that build" header: ${body.includes("Six weeks that build")}`);
  console.log(`"Starts small" stage label: ${body.includes("Starts small")}`);
  console.log(`"Tested where it's hardest" stage label: ${body.includes("Tested where")}`);
  console.log(`"Becomes automatic" stage label: ${body.includes("Becomes automatic")}`);
  console.log(`"Three moves:" label: ${body.includes("Three moves:")}`);
  console.log(`"The Opening Choice" week title unchanged: ${body.includes("The Opening Choice")}`);
  console.log(`Real content "Offer one opening choice" unchanged: ${body.includes("Offer one opening choice")}`);
  console.log(`"A preview of" old header still present: ${body.includes("A preview of")}`);
  await ctx.close();
}

// --- Mobile 375px ---
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.locator("text=Six weeks that build on each other").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/accordion-shots/03-mobile-accordion.png", clip: { x: 0, y: 0, width: 375, height: 812 } });
  await page.evaluate(() => window.scrollBy(0, 120));
  await page.screenshot({ path: "/tmp/accordion-shots/04-mobile-accordion-weeks.png", clip: { x: 0, y: 0, width: 375, height: 812 } });
  await ctx.close();
}

await browser.close();
console.log("Done — /tmp/accordion-shots/");
