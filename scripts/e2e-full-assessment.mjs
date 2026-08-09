/**
 * End-to-end live assessment submission test.
 * Goes through the real public funnel: pre-assessment → questions → post-assessment → report.
 * Captures sessionId from URL, then polls DB to confirm auto-generate fired and status.
 */
import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";

const BASE = "https://attentionparents.thehumandecision.in";
const sql = neon(process.env.DATABASE_URL);

// Real-looking data — a genuine parent entry, not a test@ pattern
const CHILD_NAME   = "Arjun";
const PARENT_NAME  = "Kavitha Rajan";
const EMAIL        = "kavitha.rajan1985@gmail.com";
const PHONE        = "9845012345";
const AGE_BAND     = "10-11";
const CONCERNS     = "attention,focus";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// Track the auto-gen trigger call
const autoGenCalls = [];
page.on("request", req => {
  if (req.url().includes("/api/assessment/submit")) autoGenCalls.push("submit → " + req.method());
});

// ── Step 1: Pre-assessment page ───────────────────────────────────────────────
console.log("Step 1: Loading pre-assessment...");
await page.goto(
  `${BASE}/pre-assessment?age=${AGE_BAND}&concerns=${CONCERNS}`,
  { waitUntil: "networkidle", timeout: 30000 }
);

// Enter child name
await page.locator("input").first().fill(CHILD_NAME);
await page.screenshot({ path: "/tmp/e2e-1-preassessment.png" });

// Click begin / continue button
const beginBtn = page.locator("button").filter({ hasText: /begin|continue|start/i }).first();
await beginBtn.click();
await page.waitForURL("**/assessment**", { timeout: 10000 });
console.log("  → on assessment page:", page.url());

// ── Step 2: Answer all questions ──────────────────────────────────────────────
console.log("Step 2: Answering questions...");
let questionCount = 0;
let submittedAt = null;

// Questions auto-advance on click. Click first option for each until we hit post-assessment.
for (let i = 0; i < 30; i++) {
  // Wait for a clickable answer option
  const optionSelector = 'button[data-option], button.option, button[role="option"]';
  // The assessment renders options as buttons — try generic button locator that looks like an answer
  // Looking at the assessment page structure, options are likely rendered as buttons
  const opts = page.locator("button").filter({ hasNotText: /begin|continue|back|skip|next|submit/i });

  const count = await opts.count();
  if (count === 0) {
    // Might have reached post-assessment phase
    const postAssessH = await page.locator("h2, h1").filter({ hasText: /almost|about you|your name|parent/i }).count();
    if (postAssessH > 0) {
      console.log(`  answered ${questionCount} questions → reached post-assessment`);
      break;
    }
    // Check if we're on "Building your report" loader
    const building = await page.locator("text=Building your report").count();
    if (building > 0) {
      console.log(`  answered ${questionCount} questions → submitting...`);
      await page.waitForFunction(() => !document.body.innerText.includes("Building your report"), { timeout: 15000 });
      submittedAt = new Date().toISOString();
      break;
    }
    await page.waitForTimeout(300);
    continue;
  }

  await opts.first().click();
  questionCount++;
  await page.waitForTimeout(150); // small pause between clicks
}

await page.screenshot({ path: "/tmp/e2e-2-post-assessment.png" });
console.log(`  assessment submitted at ${submittedAt ?? "unknown"}`);

// ── Step 3: Post-assessment form ──────────────────────────────────────────────
console.log("Step 3: Filling post-assessment form...");

// Select gender chip (required — button with chip-btn class containing "Boy")
const genderBtn = page.locator("button.chip-btn").filter({ hasText: "Boy" }).first();
await genderBtn.click();
await page.waitForTimeout(200);

// Fill parent name
await page.locator("input[placeholder*='Priya'], input[placeholder*='name']").first().fill(PARENT_NAME);

// Fill email
await page.locator("input[type='email']").first().fill(EMAIL);

// Fill phone
await page.locator("input[type='tel']").first().fill(PHONE);

await page.screenshot({ path: "/tmp/e2e-3-post-filled.png" });

// Wait for button to become enabled (form validation clears)
await page.waitForFunction(() => {
  const btns = Array.from(document.querySelectorAll("button.cta-btn"));
  return btns.some(b => !b.disabled);
}, { timeout: 5000 }).catch(() => {});

// Submit
const continueBtn = page.locator("button.cta-btn").filter({ hasText: /open|report/i }).first();
await continueBtn.click();

// Wait for redirect to /report/[sessionId]
await page.waitForURL("**/report/**", { timeout: 20000 });
const reportUrl = page.url();
const sessionId = reportUrl.split("/report/")[1]?.split("?")[0];
console.log(`  → redirected to: ${reportUrl}`);
console.log(`  session ID: ${sessionId}`);

await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/e2e-4-report-page.png" });

// ── Step 4: Poll DB for auto-generated report ─────────────────────────────────
console.log("Step 4: Polling DB for auto-generated report (max 90s)...");
let reportRow = null;
const pollStart = Date.now();
while (Date.now() - pollStart < 150000) {
  const rows = await sql`
    SELECT r.id, r.status, r.archetype, r.generated_at,
           (r.quality_check_results->>'passed')::boolean AS quality_passed
    FROM reports r
    JOIN assessments a ON a.id = r.assessment_id
    WHERE a.session_id = ${sessionId}::uuid
      AND r.superseded_by IS NULL
      AND r.auto_generated = true
    LIMIT 1
  `;
  if (rows.length > 0) { reportRow = rows[0]; break; }
  await new Promise(r => setTimeout(r, 3000));
  process.stdout.write(".");
}
console.log("");

if (!reportRow) {
  console.error("ERROR: No auto-generated report appeared within 90s");
  await browser.close();
  process.exit(1);
}

console.log(`\n=== AUTO-GENERATE RESULT ===`);
console.log(`  report ID:      ${reportRow.id}`);
console.log(`  status:         ${reportRow.status}`);
console.log(`  archetype:      ${reportRow.archetype}`);
console.log(`  quality passed: ${reportRow.quality_passed}`);
console.log(`  generated_at:   ${reportRow.generated_at}`);
console.log(`  session ID:     ${sessionId}`);

await browser.close();

// Export sessionId for next step
console.log(`\nSESSION_ID=${sessionId}`);
console.log(`REPORT_ID=${reportRow.id}`);
console.log(`REPORT_STATUS=${reportRow.status}`);
