import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/roadmap-say", { recursive: true });

const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";
const browser = await chromium.launch({ headless: true });

async function capture(label: string, baseUrl: string, tag: string) {
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}/simplified/roadmap?session=${SESSION}`, { waitUntil: "networkidle", timeout: 30000 });

  // Open all <details> elements
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
  });
  await page.waitForTimeout(300);

  // Extract the "Say" labels and phrases
  const phrases = await page.evaluate(() => {
    const results: { week: number; phrase: string }[] = [];
    document.querySelectorAll("details").forEach((det, i) => {
      // Look for the italic div (the phrase)
      const italic = det.querySelector("div[style*='italic']") as HTMLElement | null;
      if (italic) results.push({ week: i + 1, phrase: italic.innerText.trim() });
    });
    return results;
  });

  console.log(`\n[${label}] Rendered phrases:`);
  phrases.forEach(p => console.log(`  Week ${p.week}: ${p.phrase}`));

  // Find the "THE SIX WEEKS" section and screenshot it
  const sixWeeksEl = page.getByText("THE SIX WEEKS").first();
  const box = await sixWeeksEl.boundingBox().catch(() => null);
  if (box) {
    await page.screenshot({
      path: `/tmp/roadmap-say/${tag}.png`,
      clip: { x: 0, y: Math.max(0, box.y - 10), width: 1440, height: 900 },
    });
  } else {
    await page.screenshot({ path: `/tmp/roadmap-say/${tag}.png`, fullPage: false });
  }
  console.log(`  Screenshot: /tmp/roadmap-say/${tag}.png`);
  await ctx.close();
  return phrases;
}

const [localPhrases, oldPhrases] = await (async () => {
  const local = await capture("NEW CODE (SAY_BY_ARCHETYPE import)", "http://localhost:3007", "new");
  // Temporarily check old code by stashing — done separately via shell
  return [local, local]; // placeholder — see shell output
})();

await browser.close();
process.exit(0);
