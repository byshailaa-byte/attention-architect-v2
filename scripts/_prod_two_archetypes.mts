import { chromium } from "playwright";

const PROD = "https://attention-architect-v2.vercel.app";
const CHECKS = [
  { archetype: "The Storm", session: "b7a5bff5-5b85-4214-8e25-638a73eb9b53" },
  { archetype: "The Glue",  session: "3876b5dc-acb7-4f4b-895b-829465147448" },
];

const browser = await chromium.launch({ headless: true });

async function extractPhrases(session: string): Promise<string[]> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${PROD}/simplified/roadmap?session=${session}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
  });
  await page.waitForTimeout(400);
  const phrases = await page.evaluate(() => {
    const result: string[] = [];
    document.querySelectorAll("details").forEach(det => {
      const italic = det.querySelector("div[style*='italic']") as HTMLElement | null;
      if (italic) result.push(italic.innerText.trim());
    });
    return result;
  });
  await ctx.close();
  return phrases;
}

for (const { archetype, session } of CHECKS) {
  const phrases = await extractPhrases(session);
  console.log(`\n${archetype}:`);
  phrases.forEach((p, i) => console.log(`  Week ${i + 1}: ${p}`));
}

await browser.close();
process.exit(0);
