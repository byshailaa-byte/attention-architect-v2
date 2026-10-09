// Assessment v3 — worry-specific question STEMS. ONLY G1 and G2 get a worry-specific stem; their
// OPTIONS and all SCORING are unchanged. All other questions use their original text. Tokens
// ({Name}/{him}/{his}/{s:x|y}) are filled at render with fillTokens; the grammar checker guards them.
//
// Worry keys (the existing 7): reminders, homework, screens, giveup, confidence, finish, other.
import { GATEWAY_QUESTIONS } from "@/lib/engine/questions";

const [G1, G2] = GATEWAY_QUESTIONS;
export const G1_ORIGINAL = G1.text; // "When {name} gets completely absorbed in something, what does it usually look like?"
export const G2_ORIGINAL = G2.text; // "What's the first thing that pulls {name} away from something they're supposed to be doing?"

export type Worry = "reminders" | "homework" | "screens" | "giveup" | "confidence" | "finish" | "other";

// G2 — the activity the child is "supposed to be" doing, per worry.
const G2_ACTIVITY: Record<Exclude<Worry, "other">, string> = {
  homework:   "doing homework",
  reminders:  "doing what you asked",
  // Screens IS the worry — ask about the task screens pull away from, not the screen itself.
  screens:    "doing homework or a chore",
  finish:     "finishing something",
  giveup:     "working on something hard",
  confidence: "doing schoolwork",
};

// "other" G2 uses {Name} + the {he}{'s} agreement contraction → he's / she's / they're (NOT the
// broken "they's", and not the bank's generic "they").
const OTHER_G2 = "What's the first thing that pulls {Name} away from something {he}{'s} supposed to be doing?";

// G2 stem: "When {Name} is supposed to be <activity>, what pulls {him} away first?"
export function g2Stem(worry: string): string {
  const w = worry as Worry;
  if (w === "other" || !(w in G2_ACTIVITY)) return OTHER_G2;
  return `When {Name} is supposed to be ${G2_ACTIVITY[w as Exclude<Worry, "other">]}, what pulls {him} away first?`;
}

// G1 keeps its ORIGINAL wording for EVERY worry — only G2 is worry-specific (per review).
export function g1Stem(_worry: string): string {
  return G1_ORIGINAL.replace(/\{name\}/g, "{Name}");
}

export const ALL_WORRIES: Worry[] = ["reminders", "homework", "screens", "giveup", "confidence", "finish", "other"];

// For the grammar test + the review render.
export function allStems(): { worry: Worry; g1: string; g2: string }[] {
  return ALL_WORRIES.map((worry) => ({ worry, g1: g1Stem(worry), g2: g2Stem(worry) }));
}
