/**
 * Smoke tests C + D
 * C: WHAT_TO_SAY — two archetypes, weeks 1-5 differ, week 6 identical
 * D: Razorpay initiation (no completion), WhatsApp CTA
 */
import { chromium } from "playwright";

const BASE = "https://attention-architect-v2.vercel.app";
// All-In Kid from smoke test B, Explorer from prod
const SESSIONS = [
  { sid: "0091dac0-9ac5-4023-8eec-cd2c95c85ed8", label: "All-In Kid" },
  { sid: "df788bfc-ac2d-49e0-96a7-175b13b1d9da", label: "Explorer"   },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  // ── SMOKE C ─────────────────────────────────────────────────────────────────
  console.log("=== SMOKE C: WHAT_TO_SAY ===\n");

  const weekScripts: Record<string, string[]> = {};

  for (const { sid, label } of SESSIONS) {
    console.log(`Loading roadmap for ${label}...`);
    await page.goto(`${BASE}/simplified/roadmap?session=${sid}`, {
      waitUntil: "networkidle", timeout: 30000
    });
    await page.waitForTimeout(1000);

    const finalUrl = page.url();
    console.log(`  URL: ${finalUrl}`);

    if (!finalUrl.includes("/roadmap")) {
      console.log(`  REDIRECTED — skipping content check`);
      weekScripts[label] = [];
      continue;
    }

    // Open all accordion details
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => d.setAttribute('open', 'true'));
    });
    await page.waitForTimeout(300);

    // Extract "What to say" script lines
    // Structure: <div style="...8px...">What to say</div><p>"script text"</p>
    const scripts = await page.evaluate(() => {
      const results: string[] = [];
      const allDivs = Array.from(document.querySelectorAll('div'));
      for (const div of allDivs) {
        if (div.childElementCount === 0 && div.textContent?.trim() === 'What to say') {
          const next = div.nextElementSibling;
          if (next?.tagName === 'P') {
            results.push(next.textContent?.replace(/[""«»]/g, '').trim() ?? '');
          }
        }
      }
      return results;
    });

    if (scripts.length === 0) {
      // Fallback: try to get all italic <p> inside details
      const fallback = await page.evaluate(() => {
        const details = Array.from(document.querySelectorAll('details'));
        return details.map(d => {
          const p = d.querySelector('p');
          return p?.textContent?.replace(/[""]/g, '').trim() ?? '';
        }).filter(Boolean);
      });
      console.log(`  Fallback scripts: ${fallback.length}`);
      weekScripts[label] = fallback;
    } else {
      weekScripts[label] = scripts;
    }

    console.log(`  ${label} scripts (${weekScripts[label].length} weeks):`);
    weekScripts[label].forEach((s, i) => console.log(`    Week ${i+1}: "${s}"`));
    console.log();
  }

  // Verify C
  const aik = weekScripts["All-In Kid"] ?? [];
  const exp = weekScripts["Explorer"] ?? [];
  let cPass = aik.length >= 6 && exp.length >= 6;

  if (!cPass) {
    console.log(`Verification: INSUFFICIENT DATA (All-In Kid: ${aik.length} weeks, Explorer: ${exp.length} weeks)`);
  } else {
    console.log("Verification:");
    for (let i = 0; i < 5; i++) {
      const same = aik[i] === exp[i];
      if (same) { console.log(`  Week ${i+1}: ✗ IDENTICAL: "${aik[i]}"`); cPass = false; }
      else        console.log(`  Week ${i+1}: ✓ differs`);
    }
    const same6 = aik[5] === exp[5];
    console.log(`  Week 6: ${same6 ? `✓ identical: "${aik[5]}"` : `✗ DIFFERS: "${aik[5]}" vs "${exp[5]}"`}`);
    if (!same6) cPass = false;
  }
  console.log(`Smoke C: ${cPass ? "✓ PASS" : "✗ FAIL"}\n`);

  // ── SMOKE D ─────────────────────────────────────────────────────────────────
  console.log("=== SMOKE D: COMMERCE ===\n");

  // Use Explorer session (known good prod session)
  const roadmapSid = SESSIONS[1].sid;
  await page.goto(`${BASE}/simplified/roadmap?session=${roadmapSid}`, {
    waitUntil: "networkidle", timeout: 30000
  });
  await page.waitForTimeout(800);

  console.log(`Roadmap URL: ${page.url()}`);

  // Check prices
  const priceTexts = await page.evaluate(() => {
    const text = document.body.innerText;
    return [...new Set((text.match(/₹[\d,]+/g) ?? []))];
  });
  console.log(`Prices visible: ${priceTexts.join(", ") || "none"}`);

  // WhatsApp link
  const waLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]'));
    return links.map(l => (l as HTMLAnchorElement).href.slice(0, 80));
  });
  console.log(`WhatsApp links: ${waLinks.length > 0 ? waLinks.join(", ") : "checking buttons..."}`);
  if (waLinks.length === 0) {
    // WhatsApp may be triggered from a button's onClick
    const btnTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim().slice(0,40)).filter(Boolean);
    });
    console.log(`All buttons: ${btnTexts.join(" | ")}`);
  }

  // Screenshot to inspect layout
  await page.screenshot({ path: "/tmp/smoke-d-roadmap.png", fullPage: false });

  await browser.close();
  console.log("\nDone.");
})().catch(e => { console.error(e); process.exit(1); });
