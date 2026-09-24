import { chromium } from "playwright";
import fs from "fs";

const BASE = "https://attention-architect-v2.vercel.app";
const SESSION_ID = "e46fbb11-8313-42a8-b3d8-ecc41c6062db"; // Inventor × Quick Fixer
const OUT = "/Users/ablespace/attention-architect-v2/tmp-smoke-prod";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

// ── /admin 401 ───────────────────────────────────────────────────────────────
console.log("\n=== /admin ===");
const admin = await (await browser.newContext()).newPage();
await admin.goto(`${BASE}/admin`, { waitUntil: "load", timeout: 20000 });
const adminStatus = admin.url();
const adminText = await admin.locator("body").innerText().catch(() => "");
console.log(`  URL: ${adminStatus}`);
console.log(`  Body snippet: ${adminText.substring(0, 80)}`);
console.log(`  401 check: ${adminText.includes("401") || adminText.toLowerCase().includes("unauthorized") ? "✓" : "✗ NOT 401"}`);
await admin.close();

// ── /report/[sessionId] ───────────────────────────────────────────────────────
console.log("\n=== /report/[sessionId] ===");
const rCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const report = await rCtx.newPage();
await report.goto(`${BASE}/report/${SESSION_ID}`, { waitUntil: "load", timeout: 30000 });
await report.waitForTimeout(2500);
console.log(`  Final URL: ${report.url()}`);
const snapshot = await report.locator("text=Attention Health Snapshot").count();
const fitEl   = await report.locator("text=Your Attention Fit").count();
console.log(`  Snapshot section: ${snapshot > 0 ? "✓" : "✗"}`);
console.log(`  Fit section: ${fitEl > 0 ? "✓" : "✗"}`);
await report.screenshot({ path: `${OUT}/report-top.png`, fullPage: false });
await report.close();

// ── LMS for same session ──────────────────────────────────────────────────────
console.log("\n=== LMS ===");
const lms = await rCtx.newPage();
await lms.goto(`${BASE}/lms?session=${SESSION_ID}`, { waitUntil: "load", timeout: 30000 });
await lms.waitForTimeout(2000);
console.log(`  Final URL: ${lms.url()}`);
const lmsH = await lms.locator("h1,h2").first().innerText().catch(() => "(none)");
console.log(`  First heading: ${lmsH}`);
console.log(`  LMS loaded: ${!lms.url().includes("/start") ? "✓" : "✗ redirected to /start"}`);
await lms.screenshot({ path: `${OUT}/lms-top.png`, fullPage: false });
await lms.close();

// ── Homepage — DOM checks + screenshots at 375, 412, 430 ────────────────────
console.log("\n=== Homepage ===");
for (const width of [375, 412, 430]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/simplified`, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(1500);

  // DOM checks (run once at 375)
  if (width === 375) {
    const h1Text = await page.locator("h1").first().innerText().catch(() => "");
    console.log(`  H1: "${h1Text.replace(/\n/g, " / ")}"`);
    const pillCount = await page.locator("text=For parents of 8").count();
    console.log(`  Eyebrow pill: ${pillCount === 0 ? "✓ gone" : "✗ STILL PRESENT"}`);
    const proofStrip = await page.locator(".aa-proof-strip").count();
    console.log(`  Proof strip: ${proofStrip === 0 ? "✓ gone" : "✗ STILL PRESENT"}`);

    // Band sequence — check section marker labels in order
    const markers = await page.locator(".aa-site [class*='section'], section").allInnerTexts().catch(() => []);
    const s2 = await page.locator("text=WHY NOBODY HAS GIVEN YOU THIS BEFORE").count();
    const s3 = await page.locator("text=WHAT MAKES THIS DIFFERENT").count();
    const s4 = await page.locator("text=THE PROCESS").count();
    const s5 = await page.locator("text=WHAT THIS IS BUILT ON").count();
    const s6 = await page.locator("text=REAL PARENTS").count();
    console.log(`  S2 "Why nobody": ${s2 > 0 ? "✓" : "✗"}`);
    console.log(`  S3 "What makes this different": ${s3 > 0 ? "✓" : "✗"}`);
    console.log(`  S4 "The process": ${s4 > 0 ? "✓" : "✗"}`);
    console.log(`  S5 "What this is built on": ${s5 > 0 ? "✓" : "✗"}`);
    console.log(`  S6 "Real parents": ${s6 > 0 ? "✓" : "✗"}`);
  }

  await page.screenshot({ path: `${OUT}/hp-${width}.png`, fullPage: true });
  console.log(`  ${width}px screenshot saved`);
  await page.close();
  await ctx.close();
}

await browser.close();
console.log(`\nScreenshots in: ${OUT}`);
fs.readdirSync(OUT).sort().forEach(f => console.log("  " + f));
