// v3 facts — the small, typed bundle the v3 report renders from. Archetype/worry/gender/name/band come
// from the assessment; the ONE generated bit — tonight's step (Card 5) — still comes from report_v2
// (cache, else the deterministic fallback). Everything else on the page is approved copy from copy.ts.
import "server-only";
import { getSql } from "@/lib/db/client";
import { readCachedReportV2, loadAssessmentInput } from "@/lib/report-v2/service";
import { fallbackContentFor } from "@/lib/report-v2/generate";
import { fillTokens, type Gender } from "@/lib/report/pronouns";
import { ARCHETYPE_KEY, ARCHETYPE_KEYS, WORRY_KEYS, PATTERN_LINE, STRENGTH, PULL, STUCK, TODAY_TOWARD, CARD2, fillV3, type ArchetypeKey, type WorryKey } from "@/lib/report-v3/copy";

export type V3Facts = {
  name: string;
  gender: Gender;
  band: string;
  archKey: ArchetypeKey;
  worryKey: WorryKey;
  tonightMoment: string;          // Card 5 "One step, at <moment>."
  tonightStep: string;            // the thing to do tonight (from report_v2)
  tonightInstead: string | null;  // optional "Instead of …"
  tonightNotice: string;          // Card 5 "Notice: …"
  tonightSource: "llm" | "fallback";
};

// A plain everyday moment per worry, for Card 5's "One step, at <moment>".
const WORRY_MOMENT: Record<WorryKey, string> = {
  homework: "homework time",
  reminders: "the first ask",
  screens: "screen-off",
  confidence: "the next “I can’t”",
  giveup: "the first mistake",
  finish: "the halfway point",
  other: "tonight",
};

// A specific, full-sentence notice per worry — used when report_v2's `after` is missing or a fragment,
// so every profile (incl. the fallback) shows a real "Notice:" line, never "Then keep…".
const WORRY_NOTICE: Record<WorryKey, string> = {
  homework: "Whether getting started takes less of a push than usual.",
  reminders: "Whether {he} starts after one cue instead of five.",
  screens: "Whether the screen goes off without the usual fight.",
  confidence: "Whether {he} has a go even when {he}'s not sure.",
  giveup: "Whether {he} comes back after the first mistake.",
  finish: "Whether {he} gets a little further before drifting.",
  other: "What shifts in the first few minutes.",
};

// Strip surrounding / doubled quotes so a tonight line never shows ‟ "x" ”.
function unquote(s: string): string {
  return (s || "").trim().replace(/^[“”"'‘’\s]+/, "").replace(/[“”"'‘’\s]+$/, "").trim();
}
// A usable notice sentence: starts capital, ≥4 words, not a dangling fragment ("Then …", "And …").
function goodNotice(s: string): boolean {
  const t = unquote(s);
  return /^[A-Z]/.test(t) && t.split(/\s+/).filter(Boolean).length >= 4 && !/^(then|and|so|or|but)\b/i.test(t);
}

// Stored archetype may be the internal key ("storm") or the display name ("The Storm"). Never shown.
export function toArchetypeKey(a: string | null | undefined): ArchetypeKey {
  if (a && (ARCHETYPE_KEYS as string[]).includes(a)) return a as ArchetypeKey;
  return (a && ARCHETYPE_KEY[a]) || "storm";
}
export function toWorryKey(concerns: string[] | null | undefined): WorryKey {
  const c = concerns?.[0] ?? "";
  return (WORRY_KEYS as string[]).includes(c) ? (c as WorryKey) : "other";
}

export async function buildV3Facts(
  sessionId: string,
  row: { child_name: string | null; child_gender: string | null; age_band: string; archetype: string | null; concerns: string[] | null },
): Promise<V3Facts> {
  const sql = getSql();
  let content = await readCachedReportV2(sql, sessionId);
  let source: "llm" | "fallback" = content?.source ?? "fallback";
  if (!content) {
    const input = await loadAssessmentInput(sql, sessionId);
    content = input ? fallbackContentFor(input) : null;
    source = "fallback";
  }

  const name = row.child_name || "your child";
  const gender = (row.child_gender ?? null) as Gender;
  const fill = fillTokens(name, gender);
  const worryKey = toWorryKey(row.concerns);
  const sw = content?.switch ?? null;

  const rawNotice = sw?.after ? fill(sw.after) : "";
  return {
    name,
    gender,
    band: row.age_band,
    archKey: toArchetypeKey(row.archetype),
    worryKey,
    tonightMoment: WORRY_MOMENT[worryKey],
    tonightStep: unquote(sw?.try ? fill(sw.try) : content?.tonight?.[0] ? fill(content.tonight[0]) : "Offer one small, real choice about how it starts."),
    tonightInstead: sw?.instead ? unquote(fill(sw.instead)) : null,
    tonightNotice: goodNotice(rawNotice) ? unquote(rawNotice) : unquote(fill(WORRY_NOTICE[worryKey])),
    tonightSource: source,
  };
}

// ── v3 facts for the CALL SCRIPT (Part C) ──────────────────────────────────────────────────────────
// The caller reads from v3 facts (pattern line / strength / stuck / pull / today→toward / tonight step
// + the Card-5 tap), never from report_v2's seenIt/hardPart/tryLine/goal. report_v2 still generates
// tonight's step (reused here) and runs its own judge — that's the only thing kept from report_v2.
export type V3CallFacts = {
  patternLine: string;
  strength: string;
  stuck: string;
  pull: string;
  todayToward: [string, string][];
  tonightStep: string;
  tonightTap: "worked" | "mixed" | "didnt_land" | null;
};

export async function buildV3CallFacts(
  sessionId: string,
  row: { child_name: string | null; child_gender: string | null; age_band: string; archetype: string | null; concerns: string[] | null },
): Promise<V3CallFacts> {
  const f = await buildV3Facts(sessionId, row);
  const fill = (s: string) => fillV3(s, f.name, f.gender, f.band);
  const tapRows = (await getSql()`SELECT outcome FROM report_tonight_tap WHERE session_id = ${sessionId}::uuid ORDER BY created_at DESC LIMIT 1`.catch(() => [])) as unknown as { outcome: "worked" | "mixed" | "didnt_land" }[];
  return {
    patternLine: `${fill(CARD2.patternPrefix)}${fill(PATTERN_LINE[f.archKey])}.`,
    strength: fill(STRENGTH[f.archKey]),
    stuck: fill(STUCK[f.worryKey]),
    pull: fill(PULL[f.archKey]),
    todayToward: TODAY_TOWARD[f.worryKey].map(([a, b]) => [fill(a), fill(b)] as [string, string]),
    tonightStep: f.tonightStep,
    tonightTap: tapRows[0]?.outcome ?? null,
  };
}
