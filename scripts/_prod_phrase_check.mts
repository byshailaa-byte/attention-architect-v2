import { chromium } from "playwright";

const PROD = "https://attention-architect-v2.vercel.app";
const SESSIONS = [
  { label: "The Storm (known archetype)", session: "3876b5dc-acb7-4f4b-895b-829465147448" },
];

// We'll also grab a Storm session and an All-In Kid session if we can,
// but let's first extract all archetype+phrases from one session to see
// which archetype it is, then also spot-check via the content file directly.

const browser = await chromium.launch({ headless: true });

async function extractPhrases(session: string): Promise<{ archetype: string; weeks: string[] }> {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${PROD}/simplified/roadmap?session=${session}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Open all <details>
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
  });
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    // Find archetype name — it's typically in a heading near top
    const bodyText = document.body.innerText;

    // Extract italic phrases from details elements
    const phrases: string[] = [];
    document.querySelectorAll("details").forEach(det => {
      const italic = det.querySelector("div[style*='italic']") as HTMLElement | null;
      if (italic) phrases.push(italic.innerText.trim());
    });

    // Try to find archetype label in the page
    const archetypeMatch = bodyText.match(/The (?:Storm|All-In Kid|Anchor|Avoider|Reluctant Leader|Worrier|Captain|Glue)/);

    return { archetype: archetypeMatch?.[0] ?? "unknown", phrases };
  });

  await ctx.close();
  return { archetype: result.archetype, weeks: result.phrases };
}

const r1 = await extractPhrases("3876b5dc-acb7-4f4b-895b-829465147448");
console.log(`\nArchetype: ${r1.archetype}`);
r1.weeks.forEach((p, i) => console.log(`  Week ${i+1}: ${p}`));

await browser.close();
process.exit(0);
