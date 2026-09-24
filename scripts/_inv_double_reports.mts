import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── Q2: diff 5 real double-report assessments ────────────────────────────────
console.log("=== Q2: 5 real double-report assessments — field diffs ===\n");

const doubles = await sql`
  SELECT
    r.assessment_id,
    a.child_name,
    a.email,
    a.is_internal,
    array_agg(r.id ORDER BY r.generated_at) AS report_ids,
    array_agg(r.archetype ORDER BY r.generated_at) AS archetypes,
    array_agg(r.archetype_fit_tier ORDER BY r.generated_at) AS fit_tiers,
    array_agg(r.parent_instinct ORDER BY r.generated_at) AS instincts,
    array_agg(r.generated_at ORDER BY r.generated_at) AS generated_ats,
    array_agg(r.promoted_at ORDER BY r.generated_at) AS promoted_ats,
    array_agg(r.promoted_by ORDER BY r.generated_at) AS promoted_bys,
    array_agg(r.auto_generated ORDER BY r.generated_at) AS auto_generateds,
    array_agg(r.schema_version ORDER BY r.generated_at) AS schema_versions,
    array_agg(r.superseded_by::text ORDER BY r.generated_at) AS superseded_bys,
    array_agg(r.narrative_moments ORDER BY r.generated_at) AS all_moments
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND a.is_internal = false
  GROUP BY r.assessment_id, a.child_name, a.email, a.is_internal
  HAVING COUNT(*) > 1
  LIMIT 5
` as unknown as {
  assessment_id: string;
  child_name: string | null;
  email: string | null;
  is_internal: boolean;
  report_ids: string[];
  archetypes: string[];
  fit_tiers: string[];
  instincts: string[];
  generated_ats: Date[];
  promoted_ats: Date[];
  promoted_bys: string[];
  auto_generateds: boolean[];
  schema_versions: number[];
  superseded_bys: (string | null)[];
  all_moments: unknown[][];
}[];

for (const d of doubles) {
  const r1_gen = String(d.generated_ats[0]).substring(0,20);
  const r2_gen = String(d.generated_ats[1]).substring(0,20);
  const gap_ms = new Date(d.generated_ats[1]).getTime() - new Date(d.generated_ats[0]).getTime();
  const gap_min = Math.round(gap_ms / 60000);
  const gap_hours = Math.round(gap_ms / 3600000 * 10) / 10;

  console.log(`assessment_id=${d.assessment_id.substring(0,8)}…  child=${d.child_name ?? 'null'}  email=${d.email ?? 'null'}`);
  console.log(`  report 1 (older):  id=${d.report_ids[0].substring(0,8)}…  generated=${r1_gen}  promoted_by=${d.promoted_bys[0]}  auto=${d.auto_generateds[0]}  schema_v=${d.schema_versions[0]}`);
  console.log(`  report 2 (newer):  id=${d.report_ids[1].substring(0,8)}…  generated=${r2_gen}  promoted_by=${d.promoted_bys[1]}  auto=${d.auto_generateds[1]}  schema_v=${d.schema_versions[1]}`);
  console.log(`  time gap between generations: ${gap_min}m (${gap_hours}h)`);
  console.log(`  archetype:     ${d.archetypes[0]}  →  ${d.archetypes[1]}  ${d.archetypes[0] === d.archetypes[1] ? '(same)' : '⚠ DIFFERENT'}`);
  console.log(`  fit_tier:      ${d.fit_tiers[0]}  →  ${d.fit_tiers[1]}  ${d.fit_tiers[0] === d.fit_tiers[1] ? '(same)' : '⚠ DIFFERENT'}`);
  console.log(`  instinct:      ${d.instincts[0]}  →  ${d.instincts[1]}  ${d.instincts[0] === d.instincts[1] ? '(same)' : '⚠ DIFFERENT'}`);
  console.log(`  superseded_by: ${d.superseded_bys[0] ?? 'NULL'}  /  ${d.superseded_bys[1] ?? 'NULL'}`);

  // Diff narrative_moments by counting and checking topic overlap
  const m1 = d.all_moments[0] as { topic: string; text?: string; headline?: string }[];
  const m2 = d.all_moments[1] as { topic: string; text?: string; headline?: string }[];
  const t1 = m1.map((m: { topic: string }) => m.topic).sort().join(',');
  const t2 = m2.map((m: { topic: string }) => m.topic).sort().join(',');
  console.log(`  moments count: ${m1.length}  →  ${m2.length}`);
  console.log(`  moment topics same: ${t1 === t2 ? 'yes' : '⚠ DIFFERENT'}`);
  if (t1 !== t2) {
    console.log(`    r1 topics: ${t1}`);
    console.log(`    r2 topics: ${t2}`);
  }
  // Check first moment headline/text differ
  if (m1[0] && m2[0]) {
    const h1 = (m1[0] as { headline?: string; text?: string }).headline ?? (m1[0] as { text?: string }).text ?? '';
    const h2 = (m2[0] as { headline?: string; text?: string }).headline ?? (m2[0] as { text?: string }).text ?? '';
    const textSame = h1 === h2;
    console.log(`  first moment text same: ${textSame ? 'yes' : '⚠ DIFFERENT'}`);
    if (!textSame) {
      console.log(`    r1[0]: ${String(h1).substring(0,100)}`);
      console.log(`    r2[0]: ${String(h2).substring(0,100)}`);
    }
  }
  console.log();
}

// ── Q7: time gaps and promoters for ALL 45 double-report assessments ─────────
console.log("=== Q7: all 45 doubles — promotion pattern ===\n");

const allDoubles = await sql`
  SELECT
    r.assessment_id,
    a.child_name,
    a.is_internal,
    array_agg(r.generated_at ORDER BY r.generated_at) AS generated_ats,
    array_agg(r.promoted_at ORDER BY r.generated_at) AS promoted_ats,
    array_agg(r.promoted_by ORDER BY r.generated_at) AS promoted_bys,
    array_agg(r.auto_generated ORDER BY r.generated_at) AS auto_generateds
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
  GROUP BY r.assessment_id, a.child_name, a.is_internal
  HAVING COUNT(*) > 1
  ORDER BY a.is_internal, r.assessment_id
` as unknown as {
  assessment_id: string;
  child_name: string | null;
  is_internal: boolean;
  generated_ats: Date[];
  promoted_ats: (Date | null)[];
  promoted_bys: (string | null)[];
  auto_generateds: boolean[];
}[];

// Summarise pattern
const patterns: Record<string, number> = {};
let zeroGap = 0, under1h = 0, under24h = 0, over24h = 0;
let r1Auto_r2Admin = 0, both_auto = 0, both_admin = 0, r1Admin_r2Auto = 0;
let nullPromotedBy = 0;

for (const d of allDoubles) {
  const p1 = d.promoted_bys[0] ?? 'null';
  const p2 = d.promoted_bys[1] ?? 'null';
  const a1 = d.auto_generateds[0];
  const a2 = d.auto_generateds[1];
  const gap_ms = new Date(d.generated_ats[1]).getTime() - new Date(d.generated_ats[0]).getTime();
  const gap_min = Math.round(gap_ms / 60000);

  const pattern = `${p1}/${p2}  auto:${a1}/${a2}`;
  patterns[pattern] = (patterns[pattern] ?? 0) + 1;

  if (gap_ms === 0) zeroGap++;
  else if (gap_ms < 3600000) under1h++;
  else if (gap_ms < 86400000) under24h++;
  else over24h++;

  if (p1 === 'null') nullPromotedBy++;
  if (a1 && !a2) r1Auto_r2Admin++;
  else if (!a1 && a2) r1Admin_r2Auto++;
  else if (a1 && a2) both_auto++;
  else both_admin++;

  const label = d.is_internal ? '[INT]' : '[REAL]';
  const gapStr = gap_min < 60 ? `${gap_min}m` : `${Math.round(gap_min/60)}h`;
  console.log(`${label} ${d.assessment_id.substring(0,8)}… ${(d.child_name??'null').padEnd(14)} gap=${gapStr.padStart(5)}  r1=${String(p1).padEnd(14)} auto=${String(a1)}  r2=${String(p2).padEnd(14)} auto=${String(a2)}`);
}

console.log(`\nPromotion pattern breakdown:`);
for (const [pat, n] of Object.entries(patterns).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${pat}: ${n}`);
}
console.log(`\nGeneration gap distribution (43 real + 2 internal = 45 total):`);
console.log(`  0 minutes:    ${zeroGap}`);
console.log(`  <1 hour:      ${under1h}`);
console.log(`  <24 hours:    ${under24h}`);
console.log(`  ≥24 hours:    ${over24h}`);
console.log(`\nPromoter pattern:`);
console.log(`  r1=auto-pipeline, r2=admin: ${r1Auto_r2Admin}`);
console.log(`  r1=admin, r2=auto-pipeline: ${r1Admin_r2Auto}`);
console.log(`  both auto:                  ${both_auto}`);
console.log(`  both admin:                 ${both_admin}`);
console.log(`  r1 promoted_by IS NULL:     ${nullPromotedBy}`);

// ── Q9: how many of the 43 real double-report assessments have a purchase? ───
console.log("\n=== Q9: purchases against real double-report assessments ===\n");

const purchaseCheck = await sql`
  SELECT
    COUNT(DISTINCT sub.assessment_id) AS assessments_with_purchase,
    COUNT(DISTINCT sub.assessment_id) FILTER (WHERE sub.has_purchase) AS has_purchase
  FROM (
    SELECT
      r.assessment_id,
      EXISTS(
        SELECT 1 FROM purchases p
        WHERE p.assessment_id = r.assessment_id
          AND p.status = 'paid'
      ) AS has_purchase
    FROM reports r
    JOIN assessments a ON a.id = r.assessment_id
    WHERE r.status = 'published'
      AND a.is_internal = false
    GROUP BY r.assessment_id
    HAVING COUNT(*) > 1
  ) sub
` as unknown as { assessments_with_purchase: string; has_purchase: string }[];
console.log(`Real double-report assessments: 43`);
console.log(`Of those with a paid purchase: ${purchaseCheck[0].has_purchase}`);

// Detail those that have purchases
const purchaseDetail = await sql`
  SELECT
    a.session_id,
    a.child_name,
    a.email,
    p.tier,
    p.status AS purchase_status,
    p.created_at AS purchase_date,
    array_agg(r.id ORDER BY r.generated_at) AS report_ids,
    array_agg(r.generated_at ORDER BY r.generated_at) AS generated_ats
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  JOIN purchases p ON p.assessment_id = a.id AND p.status = 'paid'
  WHERE r.status = 'published'
    AND a.is_internal = false
  GROUP BY a.session_id, a.child_name, a.email, p.tier, p.status, p.created_at
  HAVING COUNT(r.id) > 1
  ORDER BY p.created_at
` as unknown as { session_id: string; child_name: string | null; email: string | null; tier: string; purchase_status: string; purchase_date: Date; report_ids: string[]; generated_ats: Date[] }[];

if (purchaseDetail.length === 0) {
  console.log("No paid purchases found against real double-report assessments.");
} else {
  console.log("\nPaid purchases on real double-report assessments:");
  for (const r of purchaseDetail) {
    const gap = Math.round((new Date(r.generated_ats[1]).getTime() - new Date(r.generated_ats[0]).getTime()) / 60000);
    console.log(`  session=${r.session_id.substring(0,8)}…  child=${r.child_name ?? 'null'}  email=${r.email ?? 'null'}  tier=${r.tier}  purchase=${String(r.purchase_date).substring(0,10)}  report_gap=${gap}m`);
  }
}

// ── Q10: WhatsApp-sent sessions among the 45 doubles ─────────────────────────
console.log("\n=== Q10: WhatsApp-sent status for double-report sessions ===\n");

const waSent = await sql`
  SELECT
    a.session_id,
    a.child_name,
    a.email,
    a.is_internal,
    a.whatsapp_report_sent_at,
    array_agg(r.id ORDER BY r.generated_at) AS report_ids,
    array_agg(r.generated_at ORDER BY r.generated_at) AS generated_ats,
    array_agg(r.promoted_by ORDER BY r.generated_at) AS promoted_bys
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
  GROUP BY a.session_id, a.child_name, a.email, a.is_internal, a.whatsapp_report_sent_at
  HAVING COUNT(r.id) > 1
  ORDER BY a.is_internal, a.whatsapp_report_sent_at NULLS LAST
` as unknown as {
  session_id: string;
  child_name: string | null;
  email: string | null;
  is_internal: boolean;
  whatsapp_report_sent_at: Date | null;
  report_ids: string[];
  generated_ats: Date[];
  promoted_bys: (string | null)[];
}[];

const waTotal = waSent.length;
const waSentCount = waSent.filter(r => r.whatsapp_report_sent_at !== null).length;
const waSentReal = waSent.filter(r => !r.is_internal && r.whatsapp_report_sent_at !== null).length;

console.log(`Total double-report assessments: ${waTotal} (43 real + 2 internal)`);
console.log(`With whatsapp_report_sent_at set: ${waSentCount} (${waSentReal} real customers)`);
console.log();

for (const r of waSent.filter(s => s.whatsapp_report_sent_at !== null && !s.is_internal)) {
  const waTs = String(r.whatsapp_report_sent_at).substring(0,20);
  const gen1 = String(r.generated_ats[0]).substring(0,20);
  const gen2 = String(r.generated_ats[1]).substring(0,20);
  const waTsMs = new Date(r.whatsapp_report_sent_at!).getTime();
  const gen2Ms = new Date(r.generated_ats[1]).getTime();
  const sentBeforeSecond = waTsMs < gen2Ms;
  console.log(`  session=${r.session_id.substring(0,8)}…  child=${r.child_name ?? 'null'}  wa_sent=${waTs}`);
  console.log(`    report1_generated=${gen1} (by ${r.promoted_bys[0] ?? 'null'})`);
  console.log(`    report2_generated=${gen2} (by ${r.promoted_bys[1] ?? 'null'})`);
  console.log(`    WA sent BEFORE second report generated: ${sentBeforeSecond ? 'yes — link resolves to report 2 now' : 'no — second report already existed when WA sent'}`);
  // The WA link always points to /report/[sessionId], which serves the latest generated_at DESC.
  // So if WA was sent when report1 was the only published one, parent got link → now sees report2.
  console.log(`    link /report/${r.session_id.substring(0,8)}… now serves: report ${sentBeforeSecond ? '2 (not what WA described at send time)' : '2 (same epoch)'}`);
  console.log();
}

if (waSentReal === 0) {
  console.log("No real customer double-report sessions have had WhatsApp sent.");
}

console.log("Done.");
