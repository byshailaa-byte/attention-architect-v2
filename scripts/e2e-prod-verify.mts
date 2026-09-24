// Production verification: full simplified flow from / to thank-you screen.
// Uses real phone 7389070676. Screenshots at each step.
// Pauses after gate submit so the owner can confirm WhatsApp receipt.

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = "https://attentionparents.thehumandecision.in";
const OUT  = path.join(__dirname, "../tmp-prod-verify");
mkdirSync(OUT, { recursive: true });

async function ss(page: Awaited<ReturnType<typeof chromium.launch>>["contexts"][0]["pages"][0], name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page    = await ctx.newPage();

  // ── Step 1: Homepage ────────────────────────────────────────────────────────
  console.log("Step 1: Homepage /");
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
  console.log("         URL:", page.url());
  await ss(page, "01-homepage");

  // ── Step 2: CTA → /start ────────────────────────────────────────────────────
  console.log("Step 2: Clicking primary CTA");
  await page.click("button:has-text('See where my child is today')", { timeout: 10000 });
  await page.waitForURL(url => /\/(start|assessment)/.test(url.toString()), { timeout: 15000 });
  console.log("         URL:", page.url());
  await ss(page, "02-start");

  // ── Step 3: /start step 1 — name + age + concern ───────────────────────────
  console.log("Step 3: /start — name, age, concern");
  await page.fill("input[placeholder*='Arjun']", "Arjun", { timeout: 8000 });
  await page.click("button:has-text('10–11')", { timeout: 8000 });
  await page.waitForTimeout(200);
  await page.click("button:has-text('Homework')", { timeout: 8000 });
  await page.waitForTimeout(200);
  await page.click("button:has-text('Continue →')", { timeout: 8000 });
  await page.waitForTimeout(500);
  await ss(page, "03-start-followup");
  console.log("         Followup step visible");

  // ── Step 4: /start step 2 — followup answer ─────────────────────────────────
  console.log("Step 4: Followup");
  // Click first real option (index 1, since index 0 is ← Back)
  await page.locator("button").nth(1).click({ timeout: 8000 });
  await page.waitForURL(url => url.toString().includes("assessment"), { timeout: 15000 });
  console.log("         URL:", page.url());
  const hasSimplified = page.url().includes("variant=simplified");
  console.log("         variant=simplified in URL:", hasSimplified);
  await ss(page, "04-assessment-start");

  // ── Step 5: Answer all questions ────────────────────────────────────────────
  console.log("Step 5: Assessment questions");
  await page.waitForTimeout(800);
  let qCount = 0;
  while (qCount < 70) {
    // Answer option buttons have no class attribute; gate submit has class sv-gate-submit
    const opts = page.locator("button:not([class]):not(:empty)");
    const n = await opts.count();
    if (n === 0) {
      const gateVis  = await page.locator("text=Where should we send it?").isVisible({ timeout: 2000 }).catch(() => false);
      const thankVis = await page.locator("text=Report on the way").isVisible({ timeout: 1000 }).catch(() => false);
      if (gateVis) { console.log("  → Gate appeared"); break; }
      if (thankVis) { console.log("  → Thank-you screen (no gate step)"); break; }
      console.log("  no answer options, stopping");
      break;
    }
    await opts.first().click();
    await page.waitForTimeout(180);
    qCount++;
  }
  console.log(`         answered ${qCount} questions`);

  // ── Step 6: Inline contact gate ─────────────────────────────────────────────
  console.log("Step 6: Contact gate");
  try {
    await page.locator("text=Where should we send it?").waitFor({ timeout: 15000 });
  } catch {
    console.log("  ❌ GATE DID NOT APPEAR. URL:", page.url());
    await ss(page, "06-gate-MISSING");
    await browser.close();
    process.exit(1);
  }
  console.log("         Gate visible ✓");
  await ss(page, "06-gate");

  // Fill and submit
  await page.fill("input[placeholder*='Priya']", "Verify Parent");
  await page.fill("input[type='email']", "verify@test.com");
  await page.fill("input[type='tel']", "7389070676");
  await ss(page, "06-gate-filled");

  const urlBeforeSubmit = page.url();
  await page.evaluate(() => {
    const btn = document.querySelector(".sv-gate-submit") as HTMLButtonElement | null;
    if (btn) btn.click();
  });
  console.log("         Gate submitted — waiting for thank-you screen…");

  // ── Step 7: Thank-you screen ─────────────────────────────────────────────────
  console.log("Step 7: Thank-you screen");
  try {
    await page.locator("text=Report on the way").waitFor({ timeout: 20000 });
  } catch {
    const url = page.url();
    if (url.includes("generating")) {
      console.log("  ❌ REGRESSION: navigated to /generating. Bug NOT fixed. URL:", url);
      await ss(page, "07-REGRESSION-generating");
    } else {
      console.log("  ❌ Thank-you screen did not appear. URL:", url);
      const body = await page.locator("body").textContent().catch(() => "");
      console.log("  Page text (first 200):", body?.slice(0, 200));
      await ss(page, "07-MISSING-thankyou");
    }
    await browser.close();
    process.exit(1);
  }

  const urlAfterSubmit = page.url();
  console.log("         Thank-you screen appeared ✓");
  console.log("         URL before submit:", urlBeforeSubmit);
  console.log("         URL after submit:", urlAfterSubmit);
  console.log("         Stayed on assessment page:", urlAfterSubmit.includes("assessment") || urlAfterSubmit === urlBeforeSubmit);

  const heading = await page.locator("h1").first().textContent().catch(() => null);
  console.log("         h1:", heading?.trim());

  const phoneText = await page.locator("text=+91").first().textContent().catch(() => null);
  console.log("         Phone displayed:", phoneText?.trim());

  const notYourNum = await page.locator("text=Not your number?").isVisible().catch(() => false);
  console.log("         'Not your number?' visible:", notYourNum);

  const reportOnWay = await page.locator("text=Report on the way").isVisible().catch(() => false);
  console.log("         'Report on the way' eyebrow:", reportOnWay);

  await ss(page, "07-thankyou-390px");

  // Responsive screenshots
  await page.setViewportSize({ width: 375, height: 812 });
  await ss(page, "07-thankyou-375px");
  await page.setViewportSize({ width: 412, height: 892 });
  await ss(page, "07-thankyou-412px");
  await page.setViewportSize({ width: 430, height: 932 });
  await ss(page, "07-thankyou-430px");

  // ── Step 8: Resources link ───────────────────────────────────────────────────
  await page.setViewportSize({ width: 390, height: 844 });
  console.log("Step 8: Resources link");
  const resLink = page.locator("a[href*='resources']").first();
  const resHref = await resLink.getAttribute("href").catch(() => null);
  console.log("         href:", resHref);

  if (resHref) {
    const resPage = await ctx.newPage();
    const dest = resHref.startsWith("http") ? resHref : BASE + resHref;
    await resPage.goto(dest, { waitUntil: "networkidle", timeout: 20000 });
    console.log("         Resources URL:", resPage.url());
    const resourcesOk = resPage.url().includes("/resources");
    console.log("         Resources page correct:", resourcesOk);
    await resPage.screenshot({ path: path.join(OUT, "08-resources.png"), fullPage: false });
    console.log("  📸 08-resources.png");
    await resPage.close();
  }

  // ── Save lookup query for DB check after WA confirmation ────────────────────
  writeFileSync(
    path.join(OUT, "session-info.txt"),
    [
      `Submitted: ${new Date().toISOString()}`,
      `URL before: ${urlBeforeSubmit}`,
      `URL after: ${urlAfterSubmit}`,
      `Phone: 7389070676`,
      `DB query (run against production):`,
      `SELECT session_id::text, whatsapp_report_sent_at, whatsapp_send_claimed_at, whatsapp_send_attempts, created_at FROM assessments WHERE phone='7389070676' ORDER BY created_at DESC LIMIT 1;`,
    ].join("\n"),
  );

  console.log("\n══════════════════════════════════════════════════════");
  console.log("PAUSED — waiting for owner to confirm WhatsApp receipt (7389070676)");
  console.log("Screenshots:", OUT);
  console.log("══════════════════════════════════════════════════════\n");

  await browser.close();
})();
