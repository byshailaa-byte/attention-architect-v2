import { chromium } from "playwright";
import { mkdirSync } from "fs";

const SESSION = "c340e492-2866-4626-b0ee-ff97d126097e";
const URL = `http://localhost:3007/preview/simplified-v1?session=${SESSION}`;
const OUT = "/tmp/phase-b-screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function captureReport(label, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 90000 });

  // Click the Report tab (3rd tab)
  await page.click("button.tab:nth-child(3)");
  await page.waitForTimeout(1000);

  // Full-page screenshot
  await page.screenshot({ path: `${OUT}/${label}-full.png`, fullPage: true });
  console.log(`${label}-full.png ✓`);

  // Individual section crops — find by DETAIL NUM span text
  for (const num of ["DETAIL 01","DETAIL 02","DETAIL 03","DETAIL 04","DETAIL 05","DETAIL 06","TRY TONIGHT"]) {
    const slug = num.toLowerCase().replace(/\s+/g, "-");
    try {
      // Find the span with this text, walk up to the containing card/box
      const span = page.locator(`span:text-is("${num}")`).first();
      await span.waitFor({ timeout: 3000 });

      // Try parent cards — report-card or tonight-box
      const card = page.locator(
        `div.report-card:has(span:text-is("${num}")), div.tonight-box:has(span:text-is("${num}"))`
      ).first();
      await card.screenshot({ path: `${OUT}/${label}-${slug}.png` });
      console.log(`  ${label}-${slug}.png ✓`);
    } catch (e) {
      console.log(`  ${label}-${slug}.png — skip (${e.message.slice(0, 60)})`);
    }
  }

  await ctx.close();
}

await captureReport("desktop", { width: 1280, height: 900 });
await captureReport("mobile",  { width: 390,  height: 844 });

await browser.close();
console.log("\nAll done →", OUT);
