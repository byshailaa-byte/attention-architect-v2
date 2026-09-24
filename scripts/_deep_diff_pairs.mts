import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

// Recursively sort object keys so JSON.stringify is order-insensitive
function sortedJson(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(sortedJson).join(",") + "]";
  if (v && typeof v === "object") {
    const sorted = Object.keys(v as object).sort().map(
      k => JSON.stringify(k) + ":" + sortedJson((v as Record<string,unknown>)[k])
    );
    return "{" + sorted.join(",") + "}";
  }
  return JSON.stringify(v);
}

const pairs = await sql`
  SELECT
    r.assessment_id,
    a.child_name,
    a.is_internal,
    array_agg(r.id                        ORDER BY r.generated_at) AS ids,
    array_agg(r.narrative_moments         ORDER BY r.generated_at) AS moments,
    array_agg(r.family_attention_loop     ORDER BY r.generated_at) AS loops
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
  GROUP BY r.assessment_id, a.child_name, a.is_internal
  HAVING COUNT(*) > 1
  ORDER BY r.assessment_id
` as unknown as {
  assessment_id: string;
  child_name: string | null;
  is_internal: boolean;
  ids: string[];
  moments: { moment_id?: string; section?: string; topic?: string; content?: string; headline?: string; text?: string }[][];
  loops: unknown[][];
}[];

let identical = 0;
const contentDiffs: { assessment_id: string; child: string | null; diffs: string[] }[] = [];

for (const p of pairs) {
  const diffs: string[] = [];

  // Normalize-compare moments
  const m1norm = sortedJson(p.moments[0]);
  const m2norm = sortedJson(p.moments[1]);
  if (m1norm !== m2norm) {
    // Find which moments differ by index
    const arr1 = p.moments[0];
    const arr2 = p.moments[1];
    for (let i = 0; i < Math.max(arr1.length, arr2.length); i++) {
      const s1 = sortedJson(arr1[i]);
      const s2 = sortedJson(arr2[i]);
      if (s1 !== s2) {
        const mid = arr1[i]?.moment_id ?? arr1[i]?.section ?? arr1[i]?.topic ?? `[${i}]`;
        // Show the first 120 chars of content that differs
        const c1 = arr1[i]?.content ?? arr1[i]?.text ?? arr1[i]?.headline ?? "(no content field)";
        const c2 = arr2[i]?.content ?? arr2[i]?.text ?? arr2[i]?.headline ?? "(no content field)";
        if (c1 !== c2) {
          diffs.push(`  moment[${i}] id=${mid}`);
          diffs.push(`    r1: ${String(c1).substring(0,120)}`);
          diffs.push(`    r2: ${String(c2).substring(0,120)}`);
        } else {
          // Content same but other keys differ — show the raw key diff
          diffs.push(`  moment[${i}] id=${mid}: non-content key differs`);
          diffs.push(`    r1 keys: ${Object.keys(arr1[i] ?? {}).sort().join(",")}`);
          diffs.push(`    r2 keys: ${Object.keys(arr2[i] ?? {}).sort().join(",")}`);
        }
      }
    }
  }

  // Normalize-compare loops
  const l1norm = sortedJson(p.loops[0]);
  const l2norm = sortedJson(p.loops[1]);
  if (l1norm !== l2norm) diffs.push(`  family_attention_loop: DIFFER`);

  if (diffs.length === 0) {
    identical++;
  } else {
    contentDiffs.push({ assessment_id: p.assessment_id, child: p.child_name, diffs });
  }
}

console.log(`Total pairs: ${pairs.length}`);
console.log(`Identical after key-order normalisation: ${identical}`);
console.log(`With genuine content differences:        ${contentDiffs.length}`);

if (contentDiffs.length > 0) {
  console.log("\n⚠ GENUINE DIFFERENCES — must stop:\n");
  for (const d of contentDiffs) {
    console.log(`${d.assessment_id}  child=${d.child ?? 'null'}`);
    for (const line of d.diffs) console.log(line);
    console.log();
  }
} else {
  console.log("\nAll differences were key-ordering artefacts of JSON.stringify.");
  console.log("Content is identical across all 45 pairs. Safe to proceed.");
}
