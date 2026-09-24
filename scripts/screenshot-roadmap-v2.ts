import { chromium } from "playwright";
import * as fs from "fs";

const BASE = "http://localhost:3007";

// Sessions for diverse archetypes
const TARGETS = [
  { name: "all-in-kid-default", url: `${BASE}/simplified/roadmap`, label: "All-In Kid (default)" },
  { name: "explorer", url: `${BASE}/simplified/roadmap?session=bd22d038-579a-4463-b067-79c98f51fdd9`, label: "The Explorer" },
  { name: "storm", url: `${BASE}/simplified/roadmap?session=3b8fdbbc-fb26-4ed2-accc-f454121c7496`, label: "Storm (test)" },
];

const OUT_DIR = "/tmp/roadmap-v2-screenshots";
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const target of TARGETS) {
  console.log(`\nCapturing: ${target.label}`);

  // Desktop
  const desktop = await browser.newPage();
  await desktop.setViewportSize({ width: 1280, height: 900 });
  await desktop.goto(target.url, { waitUntil: "networkidle" });

  // Scroll to the six-components section and capture the full below-fold content
  await desktop.evaluate(() => window.scrollTo(0, 0));
  await desktop.screenshot({ path: `${OUT_DIR}/${target.name}-desktop-top.png`, fullPage: false });
  await desktop.screenshot({ path: `${OUT_DIR}/${target.name}-desktop-full.png`, fullPage: true });

  // Open week 2 (to show both collapsed and expanded)
  await desktop.evaluate(() => {
    document.querySelectorAll("details").forEach((d, i) => {
      if (i === 1) d.setAttribute("open", "");  // week 2
    });
  });
  await desktop.screenshot({ path: `${OUT_DIR}/${target.name}-desktop-expanded.png`, fullPage: true });

  await desktop.close();

  // Mobile 375px
  const mobile = await browser.newPage();
  await mobile.setViewportSize({ width: 375, height: 812 });
  await mobile.goto(target.url, { waitUntil: "networkidle" });
  await mobile.evaluate(() => window.scrollTo(0, 0));
  await mobile.screenshot({ path: `${OUT_DIR}/${target.name}-mobile-top.png`, fullPage: false });
  await mobile.screenshot({ path: `${OUT_DIR}/${target.name}-mobile-full.png`, fullPage: true });
  await mobile.close();

  console.log(`  Saved to ${OUT_DIR}/${target.name}-*`);
}

await browser.close();
console.log("\nDone.");
