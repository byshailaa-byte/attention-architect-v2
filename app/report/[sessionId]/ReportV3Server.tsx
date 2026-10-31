// Server wrapper for the v3 report: builds the facts bundle (incl. tonight's step from report_v2) and
// the REAL Week-1 LMS day-by-day for this child's pattern + age (name-free rewritten content, filled),
// then renders the client deck. Everything else is approved copy inside ReportV3.
import "server-only";
import { buildV3Facts } from "@/lib/report-v3/facts";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";
import ReportV3 from "./ReportV3";

type Row = {
  child_name: string | null; child_gender: string | null; age_band: string;
  archetype: string | null; concerns: string[] | null; weakest_two: string[] | null;
};

// 0-based break skill per archetype (internal key), from lib/report/skills.ts BREAK_IDX.
const BREAK_BY_KEY: Record<string, number> = { storm: 0, all_in: 4, inventor: 0, explorer: 1, magnet: 5, glue: 1, captain: 5, live_wire: 2 };
// weakest_two values (axes / legacy skill keys) → the week (1–6) they map to. 1:1 skill→week ordering.
const SKILL_WEEK: Record<string, number> = {
  stability: 1, resistance: 4, recovery: 5,
  focus: 3, follow_through: 6, following_through: 6,
  starting: 1, holding_on: 2, staying_with_it: 3, recovering: 4, carrying_it_over: 5, running_it_themselves: 6,
};

// The child's two focus weeks from the existing weakest-two logic; padded with the archetype's break
// skill if weakest_two maps to fewer than two distinct weeks.
function focusWeeks(weakestTwo: string[] | null, archKey: string): number[] {
  const ws = (weakestTwo ?? []).map((s) => SKILL_WEEK[s.toLowerCase().replace(/\s+/g, "_")]).filter(Boolean);
  const set = [...new Set(ws)];
  if (set.length < 2) { const b = (BREAK_BY_KEY[archKey] ?? 0) + 1; if (!set.includes(b)) set.push(b); }
  return set.slice(0, 2);
}

// Gender the LMS prose that wasn't tokenised (literal "them/they/their") from child_gender; leave null
// (they/them stays correct). Applied to BOTH the day title and the teaser.
function genderize(text: string, gender: Gender): string {
  if (gender !== "boy" && gender !== "girl") return text;
  const M: Record<string, string> = gender === "boy"
    ? { they: "he", them: "him", their: "his", themselves: "himself" }
    : { they: "she", them: "her", their: "her", themselves: "herself" };
  return text
    .replace(/\b(They|they)['’]re\b/g, (w) => (/^T/.test(w) ? (gender === "boy" ? "He's" : "She's") : (gender === "boy" ? "he's" : "she's")))
    .replace(/\b(They|they|Them|them|Their|their|Themselves|themselves)\b/g, (w) => {
      const r = M[w.toLowerCase()]; return /^[A-Z]/.test(w) ? r.charAt(0).toUpperCase() + r.slice(1) : r;
    });
}

// A preview-safe one-liner for a Week-1 day: markdown-stripped, internal references removed, pronouns
// gendered, cut at a sentence end (never mid-word).
function teaser(text: string, gender: Gender): string {
  let t = text.replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim();
  // Fix 6 — drop internal references (incl. the "(or your own, at the same level)" aside).
  t = t.replace(/\b(from|in|see) the weekly read\b/gi, "").replace(/\bthe weekly read\b/gi, "the reading")
       .replace(/\s*\((?:or your own|see)[^)]*\)/gi, "").replace(/\bfrom the report\b/gi, "")
       .replace(/\s{2,}/g, " ").replace(/\s+([.,])/g, "$1").trim();
  t = genderize(t, gender);
  // Fix 7 — first sentence; if long, cut at the last word boundary before 120 chars (never mid-word).
  const end = t.search(/[.?!]\s/);
  let s = end > 0 ? t.slice(0, end + 1) : t;
  if (s.length > 120) { s = s.slice(0, 120); s = s.slice(0, s.lastIndexOf(" ")).trimEnd() + "…"; }
  return s;
}

export default async function ReportV3Server({ sessionId, row }: { sessionId: string; row: Row }) {
  const facts = await buildV3Facts(sessionId, row);
  const gender = (facts.gender ?? null) as Gender;
  const fill = (s: string) => fillLmsContent(s, facts.name, gender);

  const wk = getLmsWeekContent(facts.archKey, 1, facts.band as AgeBand) ?? getLmsWeekContent(facts.archKey, 1);
  const week1Days = wk
    ? wk.days.map((d) => {
        const card = getDayCard(wk, d.day)!;
        const body = card.content[facts.band as AgeBand] ?? card.content["10-11"] ?? "";
        return { day: d.day, title: genderize(fill(card.title), gender), teaser: teaser(fill(body), gender), observe: d.day === 1 };
      })
    : [];

  return <ReportV3 sessionId={sessionId} facts={facts} week1Days={week1Days} focusWeeks={focusWeeks(row.weakest_two, facts.archKey)} />;
}
