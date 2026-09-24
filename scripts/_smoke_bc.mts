import { chromium } from "playwright";
import fs from "fs";

// Inventor × Quick Fixer (prod, simplified variant)
const SESSION_ID = "e46fbb11-8313-42a8-b3d8-ecc41c6062db";
// The Glue × Negotiator (prod, different archetype+instinct for contrast)
const SESSION_ID_2 = "3876b5dc-acb7-4f4b-895b-829465147448";
const BASE = "https://attention-architect-v2.vercel.app";
const OUT = "/tmp/smoke-bc";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

// ── SECTION B: REPORT ────────────────────────────────────────────────────────
console.log("\n=== B: REPORT (Explorer × Quick Fixer) ===");
const report = await ctx.newPage();
// /report/[sessionId] redirects simplified variants → /preview/simplified-v1?session=...
await report.goto(`${BASE}/report/${SESSION_ID}`, { waitUntil: "load", timeout: 30000 });
await report.waitForTimeout(2500);
console.log(`  Final URL: ${report.url()}`);

await report.screenshot({ path: `${OUT}/b-report-full.png`, fullPage: true });
console.log("✓ Full report screenshot saved");

// §2 Snapshot
const snapshotEl = report.locator("text=Attention Health Snapshot").first();
const snapshotCount = await snapshotEl.count();
if (snapshotCount > 0) {
  await snapshotEl.scrollIntoViewIfNeeded();
  await report.waitForTimeout(500);
  await report.screenshot({ path: `${OUT}/b-report-snapshot.png`, fullPage: false });
  console.log("✓ Snapshot section visible");
} else {
  console.log("✗ 'Attention Health Snapshot' NOT found");
}

const working = await report.locator("text=Working").count();
const startHere = await report.locator("text=Start here").count();
console.log(`  Grid tags — Working: ${working}, Start here: ${startHere} (expect 2 each)`);

// §5 Fit — scroll and screenshot collapsed state
const fitEl = report.locator("text=Your Attention Fit").first();
const fitCount = await fitEl.count();
if (fitCount > 0) {
  await fitEl.scrollIntoViewIfNeeded();
  await report.waitForTimeout(600);
  await report.screenshot({ path: `${OUT}/b-report-fit-collapsed.png`, fullPage: false });
  console.log("✓ Fit section visible (collapsed)");
} else {
  console.log("✗ 'Your Attention Fit' NOT found");
}

const whereTheyMeet = await report.locator("text=Where they meet").count();
const needsLabel   = await report.locator("text=needs").count();
const offersLabel  = await report.locator("text=You offer").count();
console.log(`  Tension block "Where they meet": ${whereTheyMeet > 0 ? "✓" : "✗ missing"}`);
console.log(`  Pairing: "needs" count=${needsLabel}, "You offer" count=${offersLabel}`);

// Expand collapsed narrative via aar-details toggle
const detailsSummary = report.locator(".aar-details summary").first();
if (await detailsSummary.count() > 0) {
  await detailsSummary.scrollIntoViewIfNeeded();
  await detailsSummary.click();
  await report.waitForTimeout(500);
  await report.screenshot({ path: `${OUT}/b-report-fit-expanded.png`, fullPage: false });
  console.log("✓ Narrative expanded — details toggle works");
} else {
  console.log("✗ .aar-details summary NOT found — collapsed narrative missing");
}

await report.close();

// ── SECTION B: ROADMAP ───────────────────────────────────────────────────────
console.log("\n=== B: ROADMAP (Explorer × Quick Fixer) ===");
const roadmap = await ctx.newPage();
await roadmap.goto(`${BASE}/roadmap?session=${SESSION_ID}`, { waitUntil: "load", timeout: 30000 });
await roadmap.waitForTimeout(2500);
console.log(`  Final URL: ${roadmap.url()}`);

await roadmap.screenshot({ path: `${OUT}/b-roadmap-top.png`, fullPage: false });
await roadmap.screenshot({ path: `${OUT}/b-roadmap-full.png`, fullPage: true });
console.log("✓ Roadmap screenshots saved");

// Six-week timeline rows
const weekRows = await roadmap.locator(".rm-wk-row").count();
console.log(`  .rm-wk-row count: ${weekRows} (expect 6)`);

// Week 1 accordion — screenshot closed then open
const firstAccordion = roadmap.locator(".rm-wk-det summary").first();
if (await firstAccordion.count() > 0) {
  await firstAccordion.scrollIntoViewIfNeeded();
  await roadmap.waitForTimeout(300);
  await roadmap.screenshot({ path: `${OUT}/b-roadmap-weeks-closed.png`, fullPage: false });

  await firstAccordion.click();
  await roadmap.waitForTimeout(500);
  await roadmap.screenshot({ path: `${OUT}/b-roadmap-week1-open.png`, fullPage: false });
  console.log("✓ Week 1 accordion opened");

  const youDot   = await roadmap.locator(".rm-dot-f").count();
  const childDot = await roadmap.locator(".rm-dot-o").count();
  console.log(`  .rm-dot-f (You): ${youDot}, .rm-dot-o (Child): ${childDot}`);
} else {
  console.log("✗ .rm-wk-det summary NOT found — week accordions missing");
}

// Arc section — "A school night with"
const arcEl = roadmap.locator("text=A school night with").first();
if (await arcEl.count() > 0) {
  await arcEl.scrollIntoViewIfNeeded();
  await roadmap.waitForTimeout(400);
  await roadmap.screenshot({ path: `${OUT}/b-roadmap-arc.png`, fullPage: false });
  console.log("✓ Arc heading 'A school night with' found");
} else {
  console.log("✗ Arc heading 'A school night with' NOT found");
}

// Confirm standalone school-night section is gone from rendered DOM
// It was a two-column grid with heading "School night" or specific class
const snGridCount = await roadmap.locator(".rm-sn-grid").count();
// Also check for the old heading text that was unique to the deleted section
const snTextCount = await roadmap.locator("text=Without the plan").count();
console.log(`  Old .rm-sn-grid: ${snGridCount} (expect 0)`);
console.log(`  Old "Without the plan" text: ${snTextCount} (expect 0)`);

// ── SECTION C: PRICING / RAZORPAY / WHATSAPP ─────────────────────────────────
console.log("\n=== C: PRICING / RAZORPAY / WHATSAPP ===");

// Track /api/checkout calls
const orderCalls: { url: string; body: string }[] = [];
roadmap.on("request", req => {
  if (req.url().includes("/api/checkout")) {
    orderCalls.push({ url: req.url(), body: req.postData() ?? "" });
  }
});

// Scroll to pricing section (find by amount text — amounts are in div above buttons)
const price1 = roadmap.locator("text=₹2,999").first();
const price2 = roadmap.locator("text=₹4,999").first();
const p1count = await price1.count();
const p2count = await price2.count();
console.log(`  ₹2,999 visible: ${p1count > 0 ? "✓" : "✗ NOT found"}`);
console.log(`  ₹4,999 visible: ${p2count > 0 ? "✓" : "✗ NOT found"}`);

if (p1count > 0) {
  await price1.scrollIntoViewIfNeeded();
  await roadmap.waitForTimeout(400);
  await roadmap.screenshot({ path: `${OUT}/c-pricing.png`, fullPage: false });
}

// WhatsApp — "Book your free call →" uses window.open (not anchor).
// Click it and capture the popup page URL.
const waBtn = roadmap.locator("button", { hasText: /Book your free call/ }).first();
if (await waBtn.count() > 0) {
  await waBtn.scrollIntoViewIfNeeded();
  const [popup] = await Promise.all([
    ctx.waitForEvent("page"),
    waBtn.click(),
  ]);
  const waUrl = popup.url();
  console.log(`  WhatsApp popup URL: ${waUrl.substring(0, 120)}`);
  console.log(`  Opens wa.me: ${waUrl.includes("wa.me") ? "✓" : "✗"}`);
  console.log(`  Prefilled message: ${waUrl.includes("text=") ? "✓" : "✗"}`);
  await popup.close();
} else {
  console.log("  WhatsApp 'Book your free call' button: ✗ NOT found");
}

// Buy buttons — tier2 = "Start [child]'s roadmap →", tier1 = "Choose this plan →"
const tier2Btn = roadmap.locator("button", { hasText: /roadmap/ }).first();
const tier1Btn = roadmap.locator("button", { hasText: /Choose this plan/ }).first();
console.log(`  Tier2 button ("Start…roadmap"): ${await tier2Btn.count() > 0 ? "✓ found" : "✗ NOT found"}`);
console.log(`  Tier1 button ("Choose this plan"): ${await tier1Btn.count() > 0 ? "✓ found" : "✗ NOT found"}`);

// Click tier2 (₹4,999) — screenshot Razorpay, then dismiss
if (await tier2Btn.count() > 0) {
  await tier2Btn.scrollIntoViewIfNeeded();
  await roadmap.waitForTimeout(300);
  await roadmap.screenshot({ path: `${OUT}/c-tier2-before-click.png`, fullPage: false });
  await tier2Btn.click();
  await roadmap.waitForTimeout(4000); // Razorpay init takes ~2-3s
  await roadmap.screenshot({ path: `${OUT}/c-razorpay-tier2.png`, fullPage: false });
  console.log(`  Tier2 (₹4,999) clicked — order calls: ${orderCalls.length}`);
  orderCalls.forEach(r => console.log(`    ${r.url} | body: ${r.body.substring(0, 100)}`));
  // Razorpay iframe in headless Chrome doesn't respond to Escape — use a fresh page for tier1
}

// Tier1 (₹2,999) — fresh page so Razorpay from tier2 doesn't block
const roadmap2 = await ctx.newPage();
const orderCalls2: { url: string; body: string }[] = [];
roadmap2.on("request", req => {
  if (req.url().includes("/api/checkout")) {
    orderCalls2.push({ url: req.url(), body: req.postData() ?? "" });
  }
});
await roadmap2.goto(`${BASE}/roadmap?session=${SESSION_ID}`, { waitUntil: "load", timeout: 30000 });
await roadmap2.waitForTimeout(2500);

const tier1BtnP2 = roadmap2.locator("button", { hasText: /Choose this plan/ }).first();
if (await tier1BtnP2.count() > 0) {
  await tier1BtnP2.scrollIntoViewIfNeeded();
  await roadmap2.waitForTimeout(300);
  await tier1BtnP2.click();
  await roadmap2.waitForTimeout(4000);
  await roadmap2.screenshot({ path: `${OUT}/c-razorpay-tier1.png`, fullPage: false });
  console.log(`  Tier1 (₹2,999) clicked — order calls: ${orderCalls2.length}`);
  orderCalls2.forEach(r => console.log(`    ${r.url} | body: ${r.body.substring(0, 100)}`));
} else {
  console.log("  Tier1 button not found on fresh page");
}
await roadmap2.close();

await roadmap.close();

await browser.close();

console.log(`\n✓ Done. Screenshots in ${OUT}`);
fs.readdirSync(OUT).sort().forEach(f => console.log("  " + f));
