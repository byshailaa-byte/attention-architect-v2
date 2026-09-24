import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

const pairs = await sql`
  SELECT
    r.assessment_id,
    a.child_name,
    a.is_internal,
    array_agg(r.id           ORDER BY r.generated_at) AS ids,
    array_agg(r.generated_at ORDER BY r.generated_at) AS generated_ats,
    array_agg(r.archetype    ORDER BY r.generated_at) AS archetypes,
    array_agg(r.archetype_fit_tier        ORDER BY r.generated_at) AS fit_tiers,
    array_agg(r.parent_instinct           ORDER BY r.generated_at) AS instincts,
    array_agg(r.parent_instinct_fit_tier  ORDER BY r.generated_at) AS instinct_tiers,
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
  generated_ats: Date[];
  archetypes: string[];
  fit_tiers: string[];
  instincts: string[];
  instinct_tiers: (string | null)[];
  moments: unknown[][];
  loops: unknown[][];
}[];

console.log(`Total pairs to verify: ${pairs.length}\n`);

let identicalCount = 0;
const differing: { assessment_id: string; child: string | null; internal: boolean; diffs: string[] }[] = [];

for (const p of pairs) {
  const diffs: string[] = [];

  if (p.archetypes[0] !== p.archetypes[1])
    diffs.push(`archetype: "${p.archetypes[0]}" vs "${p.archetypes[1]}"`);

  if (p.fit_tiers[0] !== p.fit_tiers[1])
    diffs.push(`archetype_fit_tier: "${p.fit_tiers[0]}" vs "${p.fit_tiers[1]}"`);

  if (p.instincts[0] !== p.instincts[1])
    diffs.push(`parent_instinct: "${p.instincts[0]}" vs "${p.instincts[1]}"`);

  if ((p.instinct_tiers[0] ?? null) !== (p.instinct_tiers[1] ?? null))
    diffs.push(`parent_instinct_fit_tier: "${p.instinct_tiers[0]}" vs "${p.instinct_tiers[1]}"`);

  // JSON compare for moments and loop
  const m1 = JSON.stringify(p.moments[0]);
  const m2 = JSON.stringify(p.moments[1]);
  if (m1 !== m2)
    diffs.push(`narrative_moments: DIFFER (lengths ${(p.moments[0] as unknown[]).length} vs ${(p.moments[1] as unknown[]).length})`);

  const l1 = JSON.stringify(p.loops[0]);
  const l2 = JSON.stringify(p.loops[1]);
  if (l1 !== l2)
    diffs.push(`family_attention_loop: DIFFER`);

  if (diffs.length === 0) {
    identicalCount++;
  } else {
    differing.push({ assessment_id: p.assessment_id, child: p.child_name, internal: p.is_internal, diffs });
  }
}

console.log(`Pairs identical across all 6 fields: ${identicalCount}`);
console.log(`Pairs with any difference:           ${differing.length}`);

if (differing.length > 0) {
  console.log("\n⚠ DIFFERING PAIRS — STOP before proceeding:\n");
  for (const d of differing) {
    console.log(`  ${d.assessment_id}  child=${d.child ?? 'null'}  internal=${d.internal}`);
    for (const diff of d.diffs) console.log(`    ${diff}`);
  }
} else {
  console.log("\nAll 45 pairs verified identical. Safe to proceed.");
}
