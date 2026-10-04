// Concern → goal mapping for Report/Plan v2 (decided 2026-10-04). The goal is now
// concern-driven (v1 derived it from the archetype). Parents can still override via
// /api/report/goal. Tokens {Name}/{their}/{they} are filled per child.
import { displayChildName, buildPronounTokens, type Gender } from "@/lib/report/pronouns";

export const CONCERN_GOAL: Record<string, string> = {
  homework:   "{Name} starts homework without a fight.",
  reminders:  "{Name} starts on {their} own, the first time.",
  screens:    "Screens off without a battle.",
  confidence: "{Name} tries the hard thing before asking for help.",
  giveup:     "{Name} keeps going after the first try fails.",
  finish:     "{Name} finishes what {they} starts.",
  other:      "{Name} starts and finishes on {their} own.",
};

// Legacy / alias concern keys → canonical.
export const CONCERN_ALIAS: Record<string, string> = {
  focus: "reminders", attention: "reminders",
  motivation: "giveup", potential: "confidence",
  school: "homework", emotions: "other",
};

// Human label per canonical concern (used in "Why the {worry} doesn't stick").
export const CONCERN_LABEL: Record<string, string> = {
  homework: "homework", reminders: "reminders", screens: "screens",
  confidence: "confidence", giveup: "giving up", finish: "finishing", other: "focus",
};

// §1 headline per concern.
export const CONCERN_HEADLINE: Record<string, string> = {
  homework:   "{Name} turns homework into a daily fight.",
  reminders:  "{Name} needs reminders for almost everything.",
  screens:    "{Name} fights hardest over screens.",
  confidence: "{Name} gives up before really trying.",
  giveup:     "{Name} quits the moment it gets hard.",
  finish:     "{Name} starts things but rarely finishes.",
  other:      "{Name} struggles to get going and keep going.",
};

export const GOLD_LINE = "Here’s why, and it isn’t laziness.";

export function canonicalConcern(key: string | null | undefined): string {
  if (!key) return "other";
  if (key in CONCERN_GOAL) return key;
  return CONCERN_ALIAS[key] ?? "other";
}

function fill(tmpl: string, name: string, gender: Gender): string {
  const nm = name.trim() ? displayChildName(name) : "Your child";
  const t = buildPronounTokens(gender, nm);
  return tmpl
    .replace(/\{Name\}/g, nm)
    .replace(/\{their\}/g, t.child_pronoun_poss)
    .replace(/\{they\}/g, t.child_pronoun_subj);
}

export function goalForConcern(concernKey: string | null | undefined, name: string, gender: Gender): string {
  return fill(CONCERN_GOAL[canonicalConcern(concernKey)], name, gender);
}
export function headlineForConcern(concernKey: string | null | undefined, name: string, gender: Gender): string {
  return fill(CONCERN_HEADLINE[canonicalConcern(concernKey)], name, gender);
}
export function worryLabelFor(concernKey: string | null | undefined): string {
  return CONCERN_LABEL[canonicalConcern(concernKey)];
}
// All goals, for the "pick another goal" bottom sheet (§7).
export function allGoals(name: string, gender: Gender): { key: string; text: string }[] {
  return Object.keys(CONCERN_GOAL).map((key) => ({ key, text: fill(CONCERN_GOAL[key], name, gender) }));
}
