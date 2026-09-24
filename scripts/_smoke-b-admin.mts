/**
 * Smoke B — admin report crash guard.
 * Loads a pre-deploy session's report page and confirms it renders HTML,
 * not a 500. Pre-deploy sessions have weakest_two without "Attention"
 * so AXIS_TO_DIM["Attention"] would return undefined for old sessions —
 * that's fine for client.tsx (just teal). But the /report/[sessionId] page
 * uses axisFullMap which could crash on unknown axis names — the ?? "" guards
 * must hold.
 */
import { chromium } from "playwright";

const BASE = "https://attention-architect-v2.vercel.app";

// Known pre-deploy session (All-In Kid, scored before this deploy)
const OLD_SID = "0091dac0-9ac5-4023-8eec-cd2c95c85ed8";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Intercept any 500 responses
  const errors: string[] = [];
  page.on("response", res => {
    if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
  });

  console.log("=== SMOKE B: ADMIN REPORT CRASH GUARD ===\n");

  // /report/[sessionId] (admin-style report) — uses axisFullMap that could crash
  await page.goto(`${BASE}/report/${OLD_SID}`, {
    waitUntil: "networkidle",
    timeout: 30000
  });
  const reportUrl = page.url();
  const reportStatus = errors.length === 0 ? "✓ no 500s" : `✗ ${errors.join(", ")}`;
  // Check that meaningful content rendered
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log(`Report page URL: ${reportUrl}`);
  console.log(`Status: ${reportStatus}`);
  console.log(`Body preview: "${bodyText.replace(/\n/g, " ").trim().slice(0, 150)}"`);
  console.log();

  // /preview/simplified-v1 — parent-facing report
  errors.length = 0;
  await page.goto(`${BASE}/preview/simplified-v1?session=${OLD_SID}`, {
    waitUntil: "networkidle",
    timeout: 30000
  });
  const prevUrl = page.url();
  const prevStatus = errors.length === 0 ? "✓ no 500s" : `✗ ${errors.join(", ")}`;
  const prevBody = await page.evaluate(() => document.body.innerText.slice(0, 200));
  console.log(`Simplified preview URL: ${prevUrl}`);
  console.log(`Status: ${prevStatus}`);
  console.log(`Body preview: "${prevBody.replace(/\n/g, " ").trim().slice(0, 150)}"`);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
