/**
 * Phase 7 — Capture screenshots of all preview reports.
 *
 * Queries the DB for preview report IDs, navigates to each admin preview URL,
 * takes a full-page screenshot, saves to /tmp/phase7-screenshots/.
 *
 * Run: node --env-file=.env.local scripts/phase7-screenshots.mjs
 *
 * Requires: @playwright/test installed and browsers downloaded.
 */

import { chromium } from "playwright";
import { neon } from "@neondatabase/serverless";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = "/tmp/phase7-screenshots";

const BASE_URL = "http://localhost:3005";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD not set in .env.local");
if (!DATABASE_URL) throw new Error("DATABASE_URL not set in .env.local");

const sql = neon(DATABASE_URL);

// Fetch all preview report IDs ordered by generated_at
const previewRows = await sql`
  SELECT r.id, r.archetype, r.archetype_fit_tier, r.generated_at
  FROM reports r
  WHERE r.status = 'preview'
  ORDER BY r.generated_at ASC
`;

if (previewRows.length === 0) {
  console.error("No preview reports found. Run phase7-preview-batch.ts first.");
  process.exit(1);
}

console.log(`Found ${previewRows.length} preview reports`);
await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  httpCredentials: {
    username: "admin",
    password: ADMIN_PASSWORD,
  },
  viewport: { width: 1280, height: 900 },
});

const savedPaths = [];

for (let i = 0; i < previewRows.length; i++) {
  const row = previewRows[i];
  const url = `${BASE_URL}/admin/report-preview/${row.id}`;
  const filename = `preview-${String(i + 1).padStart(2, "0")}-${(row.archetype ?? "unknown").replace(/\s+/g, "-").toLowerCase()}-${row.archetype_fit_tier ?? "unknown"}.png`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  console.log(`[${i + 1}/${previewRows.length}] ${row.archetype} (${row.archetype_fit_tier}) → ${filename}`);

  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  // Wait for fonts to load
  await page.waitForTimeout(1500);

  await page.screenshot({ path: outputPath, fullPage: true });
  await page.close();

  savedPaths.push(outputPath);
  console.log(`  saved: ${outputPath}`);
}

await browser.close();

console.log(`\nScreenshots saved to ${OUTPUT_DIR}:`);
savedPaths.forEach(p => console.log(`  ${p}`));
