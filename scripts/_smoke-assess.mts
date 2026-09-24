/**
 * Smoke test B — full assessment on production.
 * Bypasses pre-assessment by passing required URL params directly.
 * Intercepts /api/assessment/submit to capture question sequence + Recovery axis.
 */
import { chromium } from "playwright";

const BASE = "https://attention-architect-v2.vercel.app";

// Direct URL that bypasses /pre-assessment and shows the meta phase
const ASSESS_URL = `${BASE}/assessment?name=SmokeKid&age=10-11&concerns=focus%2Cattention&followup=test&variant=simplified`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  let submitPayload: Record<string, unknown> | null = null;
  let submitResponse: Record<string, unknown> | null = null;
  let capturedSessionId: string | null = null;

  // Intercept the submit request
  await ctx.route("**/api/assessment/submit", async (route) => {
    const req = route.request();
    try {
      const body = JSON.parse(req.postData() ?? "{}");
      submitPayload = body;
      capturedSessionId = body.sessionId ?? null;
    } catch { /* ignore */ }
    const res = await route.fetch();
    try { submitResponse = await res.json(); } catch { /* ignore */ }
    await route.fulfill({ response: res });
  });

  // ── 1. Load the assessment (meta phase) ─────────────────────────────────────
  console.log("Loading assessment (with params)...");
  await page.goto(ASSESS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/smoke-01-meta.png" });

  // Confirm we're in meta phase (look for Begin button)
  const beginBtn = await page.$('button:has-text("Begin")');
  if (!beginBtn) {
    console.log("Meta phase not found — checking current URL:", page.url());
    await page.screenshot({ path: "/tmp/smoke-error.png" });
    // Try clicking any CTA button
    const anyBtn = await page.$('button.cta-btn, button[class*="cta"]');
    if (anyBtn) {
      console.log("Found cta-btn, clicking...");
      await anyBtn.click();
    }
  } else {
    console.log("Meta phase confirmed. Clicking Begin →");
    await beginBtn.click();
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/smoke-02-q1.png" });

  // ── 2. Question loop ────────────────────────────────────────────────────────
  let questionCount = 0;
  const MAX = 25;
  const questionLog: string[] = [];

  for (let attempt = 0; attempt < MAX; attempt++) {
    await page.waitForTimeout(600);
    const url = page.url();

    // Off the assessment page = done with questions
    if (!url.includes("/assessment")) {
      console.log(`\nNavigated away: ${url}`);
      break;
    }

    // Read the "X of Y" progress counter to see question number
    const counterText = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        if (/^\d+ of \d+$/.test(node.textContent?.trim() ?? '')) {
          return node.textContent?.trim();
        }
      }
      return null;
    });

    // Get option buttons — they're styled with border-radius:12px and border:1.5px solid
    // Use the .q-wrap container to scope to question options only
    const optBtns = await page.$$('.q-wrap button, div[style*="flex-direction: column"] button[style*="border-radius: 12px"]');

    if (optBtns.length === 0) {
      // Check if we're in the gate phase
      const gateVisible = await page.$('input[type="email"]');
      if (gateVisible) {
        console.log("\nGate phase reached — assessment questions complete");
        break;
      }
      console.log(`  No options at attempt ${attempt} (${counterText ?? url})`);
      // Check for engagement screen "Continue" button
      const continueBtn = await page.$('button:has-text("Continue"), button:has-text("continue")');
      if (continueBtn) {
        console.log("  Clicking engagement screen continue...");
        await continueBtn.click();
      }
      continue;
    }

    questionCount++;
    const optText = (await optBtns[0].textContent())?.trim().slice(0, 60) ?? "?";
    questionLog.push(`Q${questionCount} (${counterText ?? '?'}): ${optText}`);
    console.log(`  ${questionLog[questionLog.length - 1]}`);

    await optBtns[0].click();

    // Wait for submit to be triggered (last question auto-submits)
    if (counterText) {
      const parts = counterText.split(" of ");
      if (parts.length === 2 && parts[0] === parts[1]) {
        // Last question — wait longer for submission
        console.log("  Last question — waiting for submit...");
        await page.waitForTimeout(3000);
        break;
      }
    }
  }

  // Give submission time to complete
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "/tmp/smoke-03-post.png" });

  // ── 3. Results ──────────────────────────────────────────────────────────────
  console.log("\n=== SMOKE TEST B RESULTS ===");
  console.log(`Questions answered: ${questionCount}`);
  console.log(`Session ID: ${capturedSessionId ?? "not captured"}`);

  if (submitPayload) {
    const seq = (submitPayload.questionSequence as Array<{ id: string; dimension: string }>) ?? [];
    console.log(`\nFull question sequence (${seq.length} questions):`);
    seq.forEach((q, i) => console.log(`  ${String(i+1).padStart(2)}. ${q.id.padEnd(10)} [${q.dimension}]`));

    const hasR1 = seq.some(q => q.id === "R1");
    const hasR2 = seq.some(q => q.id === "R2");
    const hasR3 = seq.some(q => q.id === "R3");
    console.log(`\nR1: ${hasR1 ? "✓ PRESENT" : "✗ MISSING"}`);
    console.log(`R2: ${hasR2 ? "✓ PRESENT" : "✗ MISSING"}`);
    console.log(`R3: ${hasR3 ? "✓ PRESENT" : "✗ MISSING"}`);
    console.log(`Count: ${seq.length} (expected 13–15) — ${seq.length >= 13 && seq.length <= 15 ? "✓ PASS" : "✗ FAIL"}`);
  } else {
    console.log("\nWARNING: submit payload not captured");
  }

  if (submitResponse) {
    const res = submitResponse as {
      axes?: { recovery?: { value: number; norm: number; band: string; eligible: boolean } };
      archetype?: string;
      weakest_two?: string[];
    };
    console.log(`\nArchetype: ${res.archetype ?? "?"}`);
    console.log(`weakest_two: ${JSON.stringify(res.weakest_two)}`);
    if (res.axes?.recovery) {
      const r = res.axes.recovery;
      console.log(`Recovery: value=${r.value.toFixed(4)}, norm=${r.norm.toFixed(4)}, band=${r.band}, eligible=${r.eligible}`);
    } else {
      console.log("Recovery: not in API response");
    }
  } else {
    console.log("\nWARNING: submit response not captured");
  }

  // ── 4. Verify report page loads ─────────────────────────────────────────────
  if (capturedSessionId) {
    console.log(`\nChecking report page...`);
    await page.goto(`${BASE}/preview/simplified-v1?session=${capturedSessionId}`, {
      waitUntil: "networkidle", timeout: 30000
    });
    await page.screenshot({ path: "/tmp/smoke-04-report.png" });
    const status = page.url().includes("/simplified") || page.url().includes("/preview")
      ? "appears to be on report/gate page"
      : `on ${page.url()}`;
    console.log(`Report page: ${status}`);
  }

  console.log(`\nFinal URL: ${page.url()}`);
  await browser.close();
  console.log("Done.");
})().catch(e => { console.error(e); process.exit(1); });
