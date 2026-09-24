import { chromium } from "playwright";
import { mkdirSync } from "fs";

mkdirSync("/tmp/roadmap-compare", { recursive: true });

// Session used in the existing roadmap-screenshot.mts (Arjun, Storm, 10-11)
const SESSION = "575cf34f-7095-44f2-b7e4-ad05b039db31";
const LOCAL  = `http://localhost:3007/simplified/roadmap?session=${SESSION}`;
const PROD   = `https://attention-architect-v2.vercel.app/simplified/roadmap?session=${SESSION}`;

const browser = await chromium.launch({ headless: true });

async function shot(url: string, tag: string) {
  const ctx  = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // Extract every "WHAT TO SAY" phrase visible on the page
  const phrases = await page.evaluate(() => {
    const items: string[] = [];
    document.querySelectorAll("*").forEach(el => {
      const t = (el as HTMLElement).innerText?.trim();
      // Only leaf-ish nodes with short text (the phrases are ≤ 80 chars)
      if (t && t.length < 100 && t.length > 5 && el.children.length === 0) items.push(t);
    });
    return [...new Set(items)];
  });

  // Filter to lines that look like the scripted phrases (contain "—" or common phrase markers)
  const sayPhrases = phrases.filter(p =>
    /your call|hold you|still there|interrupt|stopping point|when you're done|park it|right here|wobble|ten minutes|clock/i.test(p)
  );

  console.log(`\n[${tag}] WHAT TO SAY phrases found (${sayPhrases.length}):`);
  sayPhrases.forEach(p => console.log(`  • ${p}`));

  await page.screenshot({ path: `/tmp/roadmap-compare/${tag}.png`, fullPage: true });
  console.log(`  Screenshot: /tmp/roadmap-compare/${tag}.png`);
  await ctx.close();
  return sayPhrases;
}

const [localPhrases, prodPhrases] = await Promise.all([
  shot(LOCAL,  "local"),
  shot(PROD,   "prod"),
]);

const localSet = new Set(localPhrases);
const prodSet  = new Set(prodPhrases);

const onlyLocal = localPhrases.filter(p => !prodSet.has(p));
const onlyProd  = prodPhrases.filter(p => !localSet.has(p));

console.log("\n=== DIFF ===");
if (onlyLocal.length === 0 && onlyProd.length === 0) {
  console.log("IDENTICAL — no differences in WHAT TO SAY phrases");
} else {
  if (onlyLocal.length) console.log("Only in LOCAL:", onlyLocal);
  if (onlyProd.length)  console.log("Only in PROD:",  onlyProd);
}

await browser.close();
process.exit(0);
