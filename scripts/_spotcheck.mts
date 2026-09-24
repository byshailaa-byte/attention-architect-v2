import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

// Three real-customer pairs: one backfill, one auto-pipeline, one backfill different archetype
// assessment_id → newer_report_id (what /report/[sessionId] must now serve)
const checks = [
  {
    label: "Jaggu (backfill)",
    assessment_id: "0caa3bdf-7baf-4d58-8572-b54122be8000",
    newer_report_id: "14940f92-c7cd-42cd-a233-b7dded813a46",
  },
  {
    label: "Rathnavel (auto-pipeline)",
    assessment_id: "8d3a0993-6807-42b9-96e4-6e7daa319f82",
    newer_report_id: "4a79e211-8798-4e5a-94dc-1db7733ab433",
  },
  {
    label: "Priya (auto-pipeline, 25s gap)",
    assessment_id: "ac2a4fb2-db30-40b0-b64f-e810e99a7f76",
    newer_report_id: "ea71133a-96cf-4822-a140-9779952c62ee",
  },
];

for (const check of checks) {
  // 1. Get session_id and verify only one live published row remains
  const [aRow] = await sql`
    SELECT a.session_id,
           r.id AS served_report_id,
           r.narrative_moments,
           r.archetype,
           r.generated_at,
           r.superseded_by
    FROM assessments a
    JOIN reports r ON r.assessment_id = a.id
    WHERE a.id = ${check.assessment_id}::uuid
      AND r.status = 'published'
      AND r.superseded_by IS NULL
  ` as unknown as {
    session_id: string;
    served_report_id: string;
    narrative_moments: { moment_id: string; content: string }[];
    archetype: string;
    generated_at: Date;
    superseded_by: string | null;
  }[];

  // 2. Get the newer row's moments directly for comparison
  const [newerRow] = await sql`
    SELECT narrative_moments, archetype, generated_at
    FROM reports
    WHERE id = ${check.newer_report_id}::uuid
  ` as unknown as {
    narrative_moments: { moment_id: string; content: string }[];
    archetype: string;
    generated_at: Date;
  }[];

  console.log(`\n── ${check.label} ──`);
  console.log(`session_id:      ${aRow?.session_id ?? "NOT FOUND"}`);
  console.log(`served_report:   ${aRow?.served_report_id ?? "NOT FOUND"}`);
  console.log(`expected_newer:  ${check.newer_report_id}`);
  console.log(`report_id match: ${aRow?.served_report_id === check.newer_report_id ? "YES ✓" : "NO ✗ — WRONG REPORT SERVED"}`);

  if (!aRow || !newerRow) {
    console.log("ERROR: row not found");
    continue;
  }

  // Compare moment content at positions 0 and 1 between served and newer row
  const servedM = aRow.narrative_moments as { moment_id: string; content: string }[];
  const newerM  = newerRow.narrative_moments as { moment_id: string; content: string }[];

  let allMatch = true;
  for (let i = 0; i < Math.min(servedM.length, newerM.length); i++) {
    if (servedM[i].content !== newerM[i].content) {
      allMatch = false;
      console.log(`moment[${i}] content MISMATCH`);
    }
  }
  if (servedM.length !== newerM.length) {
    allMatch = false;
    console.log(`moment count mismatch: served=${servedM.length} newer=${newerM.length}`);
  }

  console.log(`moments match newer row: ${allMatch ? "YES ✓" : "NO ✗"}`);
  console.log(`archetype: ${aRow.archetype}`);
  console.log(`served generated_at: ${new Date(aRow.generated_at).toISOString()}`);
  console.log(`newer  generated_at: ${new Date(newerRow.generated_at).toISOString()}`);
  console.log(`superseded_by on served row: ${aRow.superseded_by ?? "NULL ✓"}`);

  // Show first 100 chars of m_cover to eyeball prose
  const cover = servedM.find(m => m.moment_id === "m_cover");
  console.log(`m_cover first 100 chars: "${(cover?.content ?? "").substring(0, 100)}"`);
}

console.log("\n── Done ──");
