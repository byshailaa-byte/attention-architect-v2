// scripts/investigate-archetype-mismatch.mts
// Part 3 of go-live build: archetype/LMS-content mismatch investigation for paid customers.
//
// For every paid assessment (purchases.status = 'paid'), this script:
//   1. Rebuilds the full scoring pipeline from stored answers
//   2. Compares new_archetype vs stored archetype
//   3. For each customer, finds which LMS weeks/days they've consumed (from lms_progress)
//   4. Checks whether the consumed day-card content text references the archetype by name
//   5. Reports numeric findings
//
// SAFE: read-only. Does not write anything.
//
// Run: npx tsx scripts/investigate-archetype-mismatch.mts

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ── Import engine modules ─────────────────────────────────────────────────────

import { buildHdg } from "../lib/graph/hdg.js";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph.js";
import { buildBehaviourSignature } from "../lib/graph/signature.js";
import { buildConfidenceVector } from "../lib/graph/confidence.js";
import { scoreAssessment } from "../lib/engine/scorer.js";
import type { Dimensions } from "../lib/engine/scorer.js";

// ── Import LMS content ────────────────────────────────────────────────────────

// All content files — import statically so we can scan day-card text
import { weekContent as stormW1 } from "../content/lms/week-1/storm.js";
import { weekContent as captainW1 } from "../content/lms/week-1/captain.js";
import { weekContent as allInKidW1 } from "../content/lms/week-1/all-in-kid.js";
import { weekContent as explorerW1 } from "../content/lms/week-1/explorer.js";
import { weekContent as glueW1 } from "../content/lms/week-1/glue.js";
import { weekContent as inventorW1 } from "../content/lms/week-1/inventor.js";
import { weekContent as liveWireW1 } from "../content/lms/week-1/live-wire.js";
import { weekContent as magnetW1 } from "../content/lms/week-1/magnet.js";
import { weekContent as stormW2 } from "../content/lms/week-2/storm.js";
import { weekContent as captainW2 } from "../content/lms/week-2/captain.js";
import { weekContent as allInKidW2 } from "../content/lms/week-2/all-in-kid.js";
import { weekContent as explorerW2 } from "../content/lms/week-2/explorer.js";
import { weekContent as glueW2 } from "../content/lms/week-2/glue.js";
import { weekContent as inventorW2 } from "../content/lms/week-2/inventor.js";
import { weekContent as liveWireW2 } from "../content/lms/week-2/live-wire.js";
import { weekContent as magnetW2 } from "../content/lms/week-2/magnet.js";
import type { LmsWeekContent } from "../content/types.js";

const CONTENT_MAP: Record<string, Record<number, LmsWeekContent>> = {
  storm:        { 1: stormW1,      2: stormW2 },
  captain:      { 1: captainW1,    2: captainW2 },
  "all-in-kid": { 1: allInKidW1,   2: allInKidW2 },
  explorer:     { 1: explorerW1,   2: explorerW2 },
  glue:         { 1: glueW1,       2: glueW2 },
  inventor:     { 1: inventorW1,   2: inventorW2 },
  "live-wire":  { 1: liveWireW1,   2: liveWireW2 },
  magnet:       { 1: magnetW1,     2: magnetW2 },
};

// Archetype display names that appear in prose (these are what we scan for)
const ARCHETYPE_DISPLAY_NAMES: Record<string, string[]> = {
  storm:        ["The Storm", "Storm"],
  captain:      ["The Captain", "Captain"],
  "all-in-kid": ["The All-In Kid", "All-In Kid"],
  explorer:     ["The Explorer", "Explorer"],
  glue:         ["The Glue", "Glue"],
  inventor:     ["The Inventor", "Inventor"],
  "live-wire":  ["The Live Wire", "Live Wire"],
  magnet:       ["The Magnet", "Magnet"],
};

function toSlug(archetype: string): string {
  return archetype.toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, "-");
}

// Collect all text strings from any object recursively (used to scan arbitrary content blobs)
function extractStrings(obj: unknown, parts: string[] = []): string[] {
  if (typeof obj === "string") { parts.push(obj); return parts; }
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) extractStrings(v, parts);
  }
  return parts;
}

// All text in the weekly reading (shown on the week landing page before any day card)
function weeklyReadingText(weekContent: LmsWeekContent): string {
  return extractStrings(weekContent.weeklyReading).join("\n");
}

// All text in a specific day card
function dayCardText(weekContent: LmsWeekContent, day: number): string {
  const card = weekContent.days.find(d => d.day === day);
  if (!card) return "";
  return extractStrings(card).join("\n");
}

// All text in the weekend review
function weekendText(weekContent: LmsWeekContent): string {
  return extractStrings(weekContent.weekendReview ?? {}).join("\n");
}

// Check if any of the archetype's display names appear in the text
function archetypeNameInText(slug: string, text: string): { found: boolean; matches: string[] } {
  const names = ARCHETYPE_DISPLAY_NAMES[slug] ?? [];
  const matches = names.filter(n => text.includes(n));
  return { found: matches.length > 0, matches };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const sql = neon(process.env.DATABASE_URL!);

const ALL_DIMENSIONS = [
  "attention_shape",
  "reward_driver",
  "friction_response",
  "parent_instinct",
  "attention_competition",
  "recharge_type",
] as const;
const MAX_DATA_POINTS = 18;

type PaidAssessment = {
  assessment_id: string;
  user_id: string;
  email: string | null;
  stored_archetype: string;
  answers: Record<string, string>;
  dimensions_json: Record<string, { value: string; consistency: number; data_points: number; winning_votes: number }>;
};

type LmsProgressRow = {
  user_id: string;
  week: number;
  day: number;
};

async function main() {
  console.log("=== Archetype / LMS-content mismatch investigation ===\n");

  // 1. Fetch all paid assessments
  const paidRows = (await sql`
    SELECT
      a.id            AS assessment_id,
      p.user_id,
      u.email,
      a.archetype     AS stored_archetype,
      a.answers,
      a.dimensions    AS dimensions_json
    FROM purchases p
    JOIN assessments a ON a.id = p.assessment_id
    JOIN users u       ON u.id = p.user_id
    WHERE p.status = 'paid'
    ORDER BY p.created_at
  `) as unknown as PaidAssessment[];

  console.log(`Paid assessments: ${paidRows.length}`);

  // 2. Fetch LMS progress for all involved users
  const userIds = [...new Set(paidRows.map(r => r.user_id))];
  const progressRows = userIds.length > 0
    ? (await sql`
        SELECT user_id::text, week, day
        FROM lms_progress
        WHERE user_id = ANY(${userIds}::uuid[])
        ORDER BY user_id, week, day
      `) as unknown as LmsProgressRow[]
    : [];

  // Index progress by user
  const progressByUser = new Map<string, { week: number; day: number }[]>();
  for (const r of progressRows) {
    const list = progressByUser.get(r.user_id) ?? [];
    list.push({ week: r.week, day: r.day });
    progressByUser.set(r.user_id, list);
  }

  // 3. For each assessment: re-run engine, compare archetypes, check consumed content
  let archetypeMatches          = 0;
  let archetypeMismatches       = 0;
  let emptyTestAccounts         = 0;  // assessments with no stored answers (manually seeded)
  let realMismatches            = 0;  // mismatches in assessments with real answers
  let consumedWithNameRef       = 0;
  let consumedWithWrongNameRef  = 0;

  for (const row of paidRows) {
    const storedSlug = toSlug(row.stored_archetype);

    // Detect empty/test assessments (no answers stored — manually seeded records)
    const hasAnswers = row.answers && Object.keys(row.answers).length > 0;
    const hasDimensions = row.dimensions_json && Object.keys(row.dimensions_json).length > 0;
    const isEmptyTestAccount = !hasAnswers && !hasDimensions;

    // Rebuild dimensions
    const dimensions: Dimensions = {} as Dimensions;
    for (const dim of ALL_DIMENSIONS) {
      const stored = row.dimensions_json?.[dim];
      if (stored) {
        dimensions[dim] = stored;
      } else {
        dimensions[dim] = { value: "unknown", consistency: 0, data_points: 0, winning_votes: 0 };
      }
    }

    // Re-run scoring pipeline
    const hdg = buildHdg(row.answers ?? {});
    const bg  = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);
    const cv  = buildConfidenceVector(hdg, bg, sig);
    const scoring = scoreAssessment(dimensions, MAX_DATA_POINTS, cv.overall_confidence);

    const newSlug    = toSlug(scoring.archetype);
    const matches    = storedSlug === newSlug;
    const emailLabel = row.email ?? "(no email)";

    if (isEmptyTestAccount) emptyTestAccounts++;
    if (matches) {
      archetypeMatches++;
    } else {
      archetypeMismatches++;
      if (!isEmptyTestAccount) realMismatches++;
    }

    // Find consumed LMS content (days with a lms_progress row — day 0 = weekend review)
    const userProgress = progressByUser.get(row.user_id) ?? [];
    const consumedDays = userProgress.filter(p => p.day > 0); // day 0 = weekend, ignore for day-card scan
    const consumedWeekend = userProgress.filter(p => p.day === 0);

    let contentRefsStoredArchetype = false;
    const contentFindings: string[] = [];

    // Weeks the user engaged with (any day or weekend completed → they saw the weekly reading)
    const engagedWeeks = [...new Set(userProgress.map(p => p.week))];

    // Weekly reading is shown on the week landing page before starting any day card.
    // Any user who completed at least one item in a week necessarily saw the weekly reading.
    for (const week of engagedWeeks) {
      const weekContent = CONTENT_MAP[storedSlug]?.[week];
      if (!weekContent) continue;
      const text = weeklyReadingText(weekContent);
      const { found, matches: nameMatches } = archetypeNameInText(storedSlug, text);
      if (found) {
        contentRefsStoredArchetype = true;
        contentFindings.push(`  Week ${week} reading: mentions "${nameMatches.join('", "')}"`);
      }
    }

    for (const { week, day } of consumedDays) {
      const weekContent = CONTENT_MAP[storedSlug]?.[week];
      if (!weekContent) continue;
      const text = dayCardText(weekContent, day);
      const { found, matches: nameMatches } = archetypeNameInText(storedSlug, text);
      if (found) {
        contentRefsStoredArchetype = true;
        contentFindings.push(`  Week ${week} Day ${day}: mentions "${nameMatches.join('", "')}"`);
      }
    }

    for (const { week } of consumedWeekend) {
      const weekContent = CONTENT_MAP[storedSlug]?.[week];
      if (!weekContent) continue;
      const text = weekendText(weekContent);
      const { found, matches: nameMatches } = archetypeNameInText(storedSlug, text);
      if (found) {
        contentRefsStoredArchetype = true;
        contentFindings.push(`  Week ${week} Weekend: mentions "${nameMatches.join('", "')}"`);
      }
    }

    if (contentRefsStoredArchetype) consumedWithNameRef++;
    if (!matches && contentRefsStoredArchetype) consumedWithWrongNameRef++;

    // Per-customer log
    console.log(`───────────────────────────────────────`);
    console.log(`User:      ${emailLabel} (${row.user_id.slice(0, 8)})`);
    console.log(`Assessment ${row.assessment_id.slice(0, 8)}`);
    console.log(`Stored archetype:  ${row.stored_archetype} (${storedSlug})`);
    console.log(`New engine result: ${scoring.archetype} (${newSlug}) [fit_tier=${scoring.archetype_fit_tier}]`);
    console.log(`Empty test account: ${isEmptyTestAccount ? "YES (no answers/dimensions stored — engine result unreliable)" : "no"}`);
    console.log(`Archetype match:   ${isEmptyTestAccount ? "N/A (empty data)" : matches ? "✓ YES" : "✗ NO — MISMATCH"}`);
    console.log(`LMS days consumed: ${userProgress.length > 0 ? userProgress.map(p => `W${p.week}D${p.day}`).join(", ") : "none"}`);
    if (contentFindings.length > 0) {
      console.log(`Content name refs (stored archetype):`);
      contentFindings.forEach(f => console.log(f));
    } else {
      console.log(`Content name refs: none found in consumed days`);
    }
    console.log();
  }

  // 4. Summary
  console.log("=== SUMMARY ===");
  console.log(`Total paid assessments:              ${paidRows.length}`);
  console.log(`  Empty/test accounts (no answers):  ${emptyTestAccounts}`);
  console.log(`  With real answer data:             ${paidRows.length - emptyTestAccounts}`);
  console.log(`Archetype matches (stored = new):    ${archetypeMatches}`);
  console.log(`Archetype mismatches (total):        ${archetypeMismatches}`);
  console.log(`  Real mismatches (w/ actual data):  ${realMismatches}`);
  console.log(`  Test-account mismatches (unreliable): ${archetypeMismatches - realMismatches}`);
  console.log(`Consumed content with archetype name in text:        ${consumedWithNameRef}`);
  console.log(`Mismatched (real) AND consumed named content:        ${consumedWithWrongNameRef}`);
  console.log();
  if (realMismatches === 0) {
    console.log("✓ No real archetype mismatches found.");
    if (emptyTestAccounts > 0) {
      console.log(`  (${emptyTestAccounts} empty test account(s) excluded from mismatch analysis — no answers stored.)`);
    }
    if (consumedWithNameRef > 0) {
      console.log(`  ${consumedWithNameRef} customer(s) consumed content that references archetype name by text.`);
      console.log(`  All archetype references match stored archetype — no visible inconsistency.`);
    }
    console.log("→ Safe to publish for paid customers with real data, pending archetype content review.");
  } else {
    console.log(`⚠ ${realMismatches} real mismatch(es) found (assessments with actual stored answers).`);
    if (consumedWithWrongNameRef > 0) {
      console.log(`⚠ ${consumedWithWrongNameRef} customer(s) consumed named-archetype content that conflicts with new engine.`);
      console.log("  → Do NOT publish new reports for these customers without resolving the content mismatch.");
    } else {
      console.log("  → No consumed content referenced the (now-wrong) archetype name — LMS experience not visibly inconsistent.");
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
