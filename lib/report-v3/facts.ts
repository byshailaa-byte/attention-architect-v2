// v3 facts — the small, typed bundle the v3 report renders from. Archetype/worry/gender/name/band come
// from the assessment; the ONE generated bit — tonight's step (Card 5) — still comes from report_v2
// (cache, else the deterministic fallback). Everything else on the page is approved copy from copy.ts.
import "server-only";
import { getSql } from "@/lib/db/client";
import { readCachedReportV2, loadAssessmentInput } from "@/lib/report-v2/service";
import { fallbackContentFor } from "@/lib/report-v2/generate";
import { fillTokens, type Gender } from "@/lib/report/pronouns";
import { ARCHETYPE_KEY, ARCHETYPE_KEYS, WORRY_KEYS, type ArchetypeKey, type WorryKey } from "@/lib/report-v3/copy";

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

  return {
    name,
    gender,
    band: row.age_band,
    archKey: toArchetypeKey(row.archetype),
    worryKey,
    tonightMoment: WORRY_MOMENT[worryKey],
    tonightStep: sw?.try ? fill(sw.try) : content?.tonight?.[0] ? fill(content.tonight[0]) : "Offer one small, real choice about how it starts.",
    tonightInstead: sw?.instead ? fill(sw.instead) : null,
    tonightNotice: sw?.after ? fill(sw.after) : "Notice what shifts in the first few minutes.",
    tonightSource: source,
  };
}
