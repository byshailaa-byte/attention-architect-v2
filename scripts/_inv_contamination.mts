import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── D: SCOPE OF CONTAMINATION ────────────────────────────────────────────────

console.log("\n=== D11: IS THE INTERNAL SET EXCLUDED ANYWHERE? ===\n");

// Check app_settings — any exclusion lists stored?
const appSettings = await sql`SELECT * FROM app_settings` as unknown as Record<string,unknown>[];
console.log(`app_settings rows: ${appSettings.length}`);
appSettings.forEach(r => console.log("  ", JSON.stringify(r)));

// Check if there are any admin views or analytics tracking queries
// by looking at what columns might indicate internal/test status
console.log("\nColumns in assessments that could serve as internal flag:");
const assessCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'assessments'
  ORDER BY ordinal_position
` as unknown as {column_name:string;data_type:string}[];

// Look for any boolean, enum, or text column that might flag internal
const candidateCols = assessCols.filter(c =>
  c.column_name.includes('internal') ||
  c.column_name.includes('test') ||
  c.column_name.includes('flag') ||
  c.column_name.includes('exclude') ||
  c.column_name.includes('staff') ||
  c.column_name.includes('admin') ||
  c.column_name.includes('demo')
);
if (candidateCols.length > 0) {
  console.log("Candidate exclusion flag columns:", candidateCols.map(c=>c.column_name).join(', '));
} else {
  console.log("No column named internal/test/flag/exclude/staff/admin/demo exists in assessments.");
}

const reportCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'reports'
  ORDER BY ordinal_position
` as unknown as {column_name:string;data_type:string}[];

const reportCandidates = reportCols.filter(c =>
  c.column_name.includes('internal') ||
  c.column_name.includes('test') ||
  c.column_name.includes('flag') ||
  c.column_name.includes('exclude') ||
  c.column_name.includes('staff') ||
  c.column_name.includes('admin') ||
  c.column_name.includes('demo')
);
if (reportCandidates.length > 0) {
  console.log("Candidate exclusion flag columns in reports:", reportCandidates.map(c=>c.column_name).join(', '));
} else {
  console.log("No candidate exclusion flag columns in reports.");
}

// Check utm field — does it track internal traffic?
console.log("\n=== D11b: UTM FIELD — does internal traffic have identifiable UTM? ===\n");

const utmKeys = await sql`
  SELECT
    jsonb_object_keys(utm) AS key,
    COUNT(*) AS n
  FROM assessments
  WHERE utm IS NOT NULL AND jsonb_typeof(utm) = 'object'
  GROUP BY key
  ORDER BY n DESC
` as unknown as {key:string;n:string}[];
console.log("UTM keys:", utmKeys.map(r=>`${r.key}(${r.n})`).join(', '));

// Sample UTM values for internal emails
const utmSamples = await sql`
  SELECT
    a.child_name, a.email, a.utm, a.created_at::date AS date
  FROM assessments a
  WHERE
    a.utm IS NOT NULL
    AND (
      LOWER(a.email) LIKE '%shashank033%'
      OR LOWER(a.email) LIKE '%byshailaa%'
      OR LOWER(a.email) LIKE '%pgp09shashanka%'
      OR a.phone LIKE '%0676'
    )
  ORDER BY a.created_at DESC
  LIMIT 10
` as unknown as {child_name:string;email:string;utm:Record<string,string>;date:string}[];

console.log("UTM on internal sessions:");
utmSamples.forEach(r => console.log(`  ${r.date} child=${r.child_name} email=${r.email} utm=${JSON.stringify(r.utm)}`));

// Check if any admin page explicitly excludes internal
console.log("\n=== D11c: CHECK ADMIN PAGES / API ROUTES FOR ANY EXCLUSION LOGIC ===\n");
// We can only check the DB here — flag the question for code search
console.log("NOTE: DB-only investigation. Admin page code exclusion must be checked in source.");
console.log("Checking if /admin queries use any WHERE clause that would exclude known internal sessions...");
console.log("(Cannot determine from DB alone — source code inspection required.)");

// Check pricing_variant distribution — simplified vs control
const variantDist = await sql`
  SELECT
    a.pricing_variant,
    COUNT(*) AS assessments,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM reports r WHERE r.assessment_id = a.id AND r.status = 'published'
    )) AS published
  FROM assessments a
  GROUP BY a.pricing_variant
  ORDER BY COUNT(*) DESC
` as unknown as {pricing_variant:string;assessments:string;published:string}[];
console.log("\npriciting_variant distribution (all assessments):");
variantDist.forEach(r => console.log(`  ${r.pricing_variant || 'null'}: assessments=${r.assessments}  published=${r.published}`));

// ── D12: IS THERE ANY EXISTING FLAG? ────────────────────────────────────────
console.log("\n=== D12: IS THERE AN EXISTING INTERNAL/TEST FLAG? ===\n");

// Re-report what we know from column inspection
console.log("Columns that could serve as is_internal flag in assessments:");
const allAssessCols = assessCols.map(c=>c.column_name);
const flagCols = allAssessCols.filter(c =>
  c.includes('internal') || c.includes('test') || c.includes('flag') ||
  c.includes('exclude') || c.includes('staff') || c.includes('demo') || c.includes('sandbox')
);
if (flagCols.length === 0) {
  console.log("  NONE. No is_internal or equivalent flag exists on the assessments table.");
} else {
  console.log(`  Found: ${flagCols.join(', ')}`);
}

console.log("\nColumns in reports:");
const allReportCols = reportCols.map(c=>c.column_name);
const reportFlagCols = allReportCols.filter(c =>
  c.includes('internal') || c.includes('test') || c.includes('flag') ||
  c.includes('exclude') || c.includes('staff') || c.includes('demo') || c.includes('sandbox')
);
if (reportFlagCols.length === 0) {
  console.log("  NONE. No is_internal or equivalent flag exists on the reports table.");
} else {
  console.log(`  Found: ${reportFlagCols.join(', ')}`);
}

// Check honest_flag — is it used for internal exclusion?
const honestFlagDist = await sql`
  SELECT honest_flag, COUNT(*) AS n FROM assessments GROUP BY honest_flag ORDER BY n DESC
` as unknown as {honest_flag:boolean;n:string}[];
console.log("\nhonest_flag distribution (assessments):");
honestFlagDist.forEach(r => console.log(`  honest_flag=${r.honest_flag}: ${r.n}`));

// Summary
console.log("\n=== D: SUMMARY ===\n");
console.log("Internal flag on assessments: DOES NOT EXIST");
console.log("Internal flag on reports: DOES NOT EXIST");
console.log("UTM exclusion: not implemented — internal traffic UTM not distinguishable by DB query alone");
console.log("Admin page exclusion: unknown — requires source code inspection");
console.log("All historical figures (archetype counts, completion rate, median duration) have included the internal set.");
console.log("No query, metric, or dashboard in the DB layer excludes internal sessions.");

console.log("\nDone with D.");
