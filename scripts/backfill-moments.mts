// One-off: backfill the simplified-surface derived moments for already-published
// reports that are missing them (the lazy-path was generating them on first view).
// Replicates the exact generation the render used. Production only.
//
//   npx tsx scripts/backfill-moments.mts <internal|real> <limit> [--verbose]
//
// Guarantees:
//  - only-if-absent: generates only moments not already present (per report)
//  - guarded, dedupe-and-append UPDATE: strips any existing copy of the ids it
//    writes (race safety vs a live lazy view) then appends — atomic + idempotent
//  - sequential (throttled): one report at a time, generators run in series
//  - failures reported by session id; NEVER retried silently

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { generateInstinctInteractionFallback, selectFallbackDimensions } from "@/lib/narrative/instinct-interaction-fallback";
import { generateSimplifiedStrengths, selectStrengthDimensions } from "@/lib/narrative/simplified-strengths";
import { generateSimplifiedActions, selectActionDimensions } from "@/lib/narrative/simplified-actions";
import { reformatM01 } from "@/lib/narrative/simplified-reformatter";
import { CHILD_NAME_FALLBACK, resolveChildPronoun, type Gender } from "@/lib/report/pronouns";

const envText = readFileSync(".env.local", "utf8").split("\n");
const getEnv = (k: string) => {
  const l = envText.find((x) => x.startsWith(k + "="));
  return l ? l.slice(k.length + 1).trim().replace(/^["']|["']$/g, "") : "";
};
const DB = getEnv("DATABASE_URL_PROD");
if (!DB.includes("ep-green-truth-aqxygaj2")) throw new Error("Refusing: not the ep-green-truth-aqxygaj2 production endpoint");
process.env.ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing from .env.local");
const sql = neon(DB);

const verbose = process.argv.includes("--verbose");
// --force: regenerate even if a moment already exists, and bypass the junk-name
//          skip. Intended for explicit verification/internal re-runs only.
const force = process.argv.includes("--force");
// --sessions=id,id : target these exact sessions instead of the missing-moment query.
const sessionsArg = process.argv.find((a) => a.startsWith("--sessions="));
const explicitSessions = sessionsArg
  ? sessionsArg.slice("--sessions=".length).split(",").map((s) => s.trim()).filter(Boolean)
  : null;

const mode = process.argv[2];
const limit = parseInt(process.argv[3] ?? "0", 10);
if (!explicitSessions && ((mode !== "internal" && mode !== "real") || !Number.isFinite(limit) || limit <= 0)) {
  throw new Error("usage: backfill-moments.mts <internal|real> <limit> [--verbose] | --sessions=id,id [--force]");
}
const isInternal = mode === "internal";
const str = (v: unknown, def: string): string => (typeof v === "string" ? v : def);

const targets: { sid: string }[] = explicitSessions
  ? explicitSessions.map((sid) => ({ sid }))
  : ((await sql`
      SELECT a.session_id::text AS sid
      FROM reports r JOIN assessments a ON a.id = r.assessment_id
      WHERE a.is_internal = ${isInternal}
        AND r.status = 'published' AND r.superseded_by IS NULL
        AND a.parent_name IS NOT NULL
        AND NOT (r.narrative_moments @> '[{"moment_id":"m_simplified_strengths"}]'::jsonb
             AND r.narrative_moments @> '[{"moment_id":"m_simplified_actions"}]'::jsonb
             AND r.narrative_moments @> '[{"moment_id":"m_01_simplified"}]'::jsonb)
      ORDER BY a.created_at ASC
      LIMIT ${limit}
    `) as unknown as { sid: string }[]);

console.log(`Backfill ${explicitSessions ? `sessions=[${explicitSessions.length}]` : `mode=${mode} limit=${limit}`}${force ? " --force" : ""} — ${targets.length} target(s)\n`);

const failures: { sid: string; error: string }[] = [];
const skippedJunk: { sid: string; name: string }[] = [];
let ok = 0;

for (const { sid } of targets) {
  try {
    const rows = (await sql`
      SELECT a.child_name, a.age_band, a.child_gender, a.archetype, a.archetype_fit_tier,
             a.parent_pattern, a.parent_instinct_fit_tier,
             r.narrative_moments, r.behaviour_signature
      FROM reports r JOIN assessments a ON a.id = r.assessment_id
      WHERE a.session_id = ${sid}::uuid AND r.status = 'published' AND r.superseded_by IS NULL
      LIMIT 1
    `) as unknown as Record<string, unknown>[];
    if (!rows.length) { failures.push({ sid, error: "no published report row" }); console.log(`FAIL ${sid}: no row`); continue; }
    const row = rows[0];
    const moments = (row.narrative_moments ?? []) as { moment_id: string; title: string; content: string }[];
    const sigDimensions = ((row.behaviour_signature as { dimensions?: unknown[] } | null)?.dimensions ?? []) as Parameters<typeof selectStrengthDimensions>[0];
    const present = new Set(moments.map((m) => m.moment_id));

    const archetype = str(row.archetype, "The All-In Kid");
    const parentPattern = str(row.parent_pattern, "The Quick Fixer");
    const parentInstinctSlug = parentPattern.toLowerCase().replace(/^the /, "").replace(/\s+/g, "-");
    // Junk-name exclusion (script-only): skip 1–2 char TYPED names — "we won't
    // overwrite what a parent typed." Null/empty (len 0) is NOT junk; it uses the
    // "Your child" fallback. --force bypasses this (verification/internal).
    const rawName = str(row.child_name, "").trim();
    if (!force && rawName.length >= 1 && rawName.length <= 2) {
      skippedJunk.push({ sid, name: rawName });
      console.log(`SKIP ${sid}: junk child_name ${JSON.stringify(rawName)} (len ${rawName.length})`);
      continue;
    }
    const childName = rawName || CHILD_NAME_FALLBACK;
    const ageBand = str(row.age_band, "10-11");
    const g = (typeof row.child_gender === "string" ? row.child_gender : null) as Gender;
    const childPronouns = { subj: resolveChildPronoun(g, "subj"), obj: resolveChildPronoun(g, "obj"), poss: resolveChildPronoun(g, "poss") };

    const newMoments: { moment_id: string; title: string; content: string }[] = [];
    const skipped: string[] = [];

    if (force || !present.has("m_simplified_strengths")) {
      const dims = selectStrengthDimensions(sigDimensions);
      if (dims.length > 0) {
        const strengths = await generateSimplifiedStrengths({ childName, childPronouns, ageBand, archetype, dimensions: dims });
        newMoments.push({ moment_id: "m_simplified_strengths", title: "strengths", content: JSON.stringify(strengths) });
      } else skipped.push("m_simplified_strengths(no-sig-dims)");
    }
    // Fallback belongs ONLY to no-loop reports (m_03 absent). --force regenerates
    // it only in that case — never alongside an existing m_03.
    if (!present.has("m_03") && (force || !present.has("m_instinct_interaction_fallback"))) {
      const dims = selectFallbackDimensions(sigDimensions);
      if (dims.length > 0) {
        const gen = await generateInstinctInteractionFallback({
          childName,
          childPronouns,
          ageBand, archetype,
          archetypeFitTier: str(row.archetype_fit_tier, "primary"),
          parentInstinct: parentInstinctSlug, parentInstinctDisplay: parentPattern,
          parentInstinctFitTier: str(row.parent_instinct_fit_tier, "primary"),
          dimensions: dims,
        });
        newMoments.push({ moment_id: "m_instinct_interaction_fallback", title: gen.section, content: gen.content });
      } else skipped.push("m_instinct_interaction_fallback(no-sig-dims)");
    }
    if (force || !present.has("m_simplified_actions")) {
      const dims = selectActionDimensions(sigDimensions);
      if (dims.length > 0) {
        const actions = await generateSimplifiedActions({ childName, childPronouns, ageBand, archetype, parentInstinct: parentInstinctSlug, parentInstinctDisplay: parentPattern, dimensions: dims });
        newMoments.push({ moment_id: "m_simplified_actions", title: "actions", content: JSON.stringify(actions) });
      } else skipped.push("m_simplified_actions(no-sig-dims)");
    }
    if (force || !present.has("m_01_simplified")) {
      const m01 = moments.find((m) => m.moment_id === "m_01");
      if (m01) {
        const bullets = await reformatM01(m01.content);
        newMoments.push({ moment_id: "m_01_simplified", title: "detail01_bullets", content: JSON.stringify(bullets) });
      } else skipped.push("m_01_simplified(no-m_01)");
    }

    if (newMoments.length === 0) { console.log(`SKIP ${sid}: nothing to generate${skipped.length ? " [" + skipped.join(",") + "]" : ""}`); ok++; continue; }

    const newIds = newMoments.map((m) => m.moment_id);
    const upd = (await sql`
      UPDATE reports r
      SET narrative_moments = (
        SELECT COALESCE(jsonb_agg(e), '[]'::jsonb)
        FROM jsonb_array_elements(r.narrative_moments) e
        WHERE NOT (e->>'moment_id' = ANY(${newIds}))
      ) || ${JSON.stringify(newMoments)}::jsonb
      FROM assessments a
      WHERE r.assessment_id = a.id AND a.session_id = ${sid}::uuid
        AND r.status = 'published' AND r.superseded_by IS NULL
      RETURNING r.id
    `) as unknown as { id: string }[];
    if (upd.length === 0) { failures.push({ sid, error: "guarded UPDATE matched 0 rows" }); console.log(`FAIL ${sid}: update 0 rows`); continue; }

    ok++;
    console.log(`OK   ${sid}: wrote [${newIds.join(", ")}]${skipped.length ? " skipped[" + skipped.join(",") + "]" : ""}`);
    if (verbose) for (const m of newMoments) console.log(`   ── ${m.moment_id} ──\n${m.content}\n`);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    failures.push({ sid, error: msg });
    console.log(`FAIL ${sid}: ${msg}`);
  }
}

console.log(`\nDone. ok=${ok} skipped-junk=${skippedJunk.length} failures=${failures.length}`);
for (const s of skippedJunk) console.log(`  SKIPPED-JUNK ${s.sid}: child_name=${JSON.stringify(s.name)}`);
for (const f of failures) console.log(`  FAILURE ${f.sid}: ${f.error}`);
