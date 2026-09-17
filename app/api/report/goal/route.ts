// POST /api/report/goal
// Writes the parent's chosen goal onto their assessment.
// Body: { sessionId, skill, goalKey, source, freeText? }
//
// Order of operations is deliberate and must not be reordered:
//   1. Safeguarding screen runs FIRST — before any model call and before any goal
//      write. A flag records ONLY goal_flagged, stores no raw text, returns the
//      fixed SAFEGUARDING_RESPONSE, and nothing else happens.
//   2. Validate source against the three CHECK values.
//   3. Validate skill (always required — it drives the objectives).
//      Free text: trim, cap at 200 (reject, don't truncate), empty → null.
//   4. Branch on source:
//        'free_text'            → goalKey rejected; goal_text is the parent's typed
//                                 text (already trimmed/capped/screened); goal_key null.
//        'recommended'|'chosen' → goalKey required + validated against authored
//                                 goals; goal_text is the rendered authored goal;
//                                 freeText not allowed.
//   5. Write the goal fields.
//
// Gate 3: goal_flagged and goal_free_text (and anything screen-derived beyond the
// fixed copy) must NEVER appear in the response.

import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { assertBootGuards } from "@/lib/boot-guard";
import { screenGoalText } from "@/lib/safeguarding/goal-screen";
import { goalsBySkill, SAFEGUARDING_RESPONSE } from "@/content/goals";
import { SKILL_NAMES } from "@/lib/report/skills";
import { fillLmsContent } from "@/lib/lms/render";
import { CHILD_NAME_FALLBACK, type Gender } from "@/lib/report/pronouns";

assertBootGuards();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FREE_TEXT = 200;
const VALID_SOURCES = new Set(["recommended", "chosen", "free_text"]);
const SKILL_SET = new Set<string>(SKILL_NAMES);

// Sentence-safe: authored goals may open with {{child_name}}, so the rendered
// goal_text must start capitalised regardless of the name's own casing (a
// lowercase-typed real name, or the fallback).
const capitaliseFirst = (s: string): string =>
  s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;

type Body = {
  sessionId?: string;
  skill?: string;
  goalKey?: string;
  source?: string;
  freeText?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { sessionId, skill, goalKey, source, freeText } = (await req.json()) as Body;

    // Basic request validation (not a model call or DB write) — fine to run before the screen.
    if (!sessionId || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid or missing sessionId" }, { status: 400 });
    }

    const sql = getSql();

    // ── 1. SAFEGUARDING SCREEN — FIRST ─────────────────────────────────────────
    // Deterministic, synchronous, no model/network. On a flag: record only
    // goal_flagged, store no raw text, return the fixed copy. Nothing else runs —
    // not even skill/source validation.
    const screen = screenGoalText(freeText);
    if (screen.flagged) {
      await sql`
        UPDATE assessments SET goal_flagged = true
        WHERE session_id = ${sessionId}::uuid
      `.catch((e: unknown) => console.warn("[goal] flag write failed:", (e as Error).message));
      // Gate 3: fixed copy ONLY — never the reason, the flag, or the input text.
      return NextResponse.json({ safeguarding: SAFEGUARDING_RESPONSE });
    }

    // ── 2. Validate source ─────────────────────────────────────────────────────
    if (!source || !VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    // ── 3. Validate skill (always required — it drives the objectives) ─────────
    if (!skill || !SKILL_SET.has(skill)) {
      return NextResponse.json({ error: "Unknown skill" }, { status: 400 });
    }

    // Free text — trim, cap at 200 (reject, don't truncate), empty → null.
    let freeTextValue: string | null = null;
    if (freeText !== null && freeText !== undefined) {
      if (typeof freeText !== "string") {
        return NextResponse.json({ error: "freeText must be a string" }, { status: 400 });
      }
      const trimmed = freeText.trim();
      if (trimmed.length > MAX_FREE_TEXT) {
        return NextResponse.json(
          { error: `freeText must be ${MAX_FREE_TEXT} characters or fewer` },
          { status: 400 },
        );
      }
      freeTextValue = trimmed || null;
    }

    // ── 4. Branch on source ────────────────────────────────────────────────────
    // 'free_text': goalKey rejected, freeText is the goal itself (already screened).
    // 'recommended' | 'chosen': goalKey required + validated; freeText not allowed.
    let goalKeyToStore: string | null;
    let goalTextToStore: string;
    let freeTextToStore: string | null;

    if (source === "free_text") {
      if (goalKey !== null && goalKey !== undefined) {
        return NextResponse.json({ error: "goalKey must be omitted for free_text" }, { status: 400 });
      }
      if (!freeTextValue) {
        return NextResponse.json({ error: "freeText is required for free_text" }, { status: 400 });
      }
      // goal_text is the parent's own words (already trimmed, capped, and screened
      // at step 1) — not run through fillLmsContent. goal_skill still comes from the
      // (validated) skill, since that drives the objectives.
      goalKeyToStore = null;
      goalTextToStore = freeTextValue;
      freeTextToStore = freeTextValue;
    } else {
      // recommended | chosen
      if (freeTextValue) {
        return NextResponse.json({ error: "freeText is not allowed for this source" }, { status: 400 });
      }
      const goal = goalsBySkill[skill as (typeof SKILL_NAMES)[number]].goals.find((g) => g.key === goalKey);
      if (!goal) {
        return NextResponse.json({ error: "Unknown goalKey for skill" }, { status: 400 });
      }
      // Fetch child identity so goal_text renders exactly as the LMS renders it.
      const rows = (await sql`
        SELECT child_name, child_gender FROM assessments
        WHERE session_id = ${sessionId}::uuid
        LIMIT 1
      `) as unknown as { child_name: string | null; child_gender: string | null }[];
      if (rows.length === 0) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      const childName = rows[0].child_name || CHILD_NAME_FALLBACK;
      const childGender = (rows[0].child_gender ?? null) as Gender;
      // Pronoun source: assessments.child_gender, via fillLmsContent → buildPronounTokens
      // (they/their fallback when null) — the same substitution the LMS uses.
      goalKeyToStore = goal.key;
      goalTextToStore = capitaliseFirst(fillLmsContent(goal.text, childName, childGender));
      freeTextToStore = null;
    }

    // ── 5. Write ───────────────────────────────────────────────────────────────
    const updated = (await sql`
      UPDATE assessments SET
        goal_skill     = ${skill},
        goal_key       = ${goalKeyToStore},
        goal_text      = ${goalTextToStore},
        goal_source    = ${source},
        goal_free_text = ${freeTextToStore},
        goal_flagged   = false
      WHERE session_id = ${sessionId}::uuid
      RETURNING id
    `) as unknown as { id: string }[];
    if (updated.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Gate 3: never return goal_flagged or goal_free_text.
    return NextResponse.json({ ok: true, skill, goalKey: goalKeyToStore, goalText: goalTextToStore });
  } catch (e) {
    console.error("[goal]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
