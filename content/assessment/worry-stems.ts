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

// "other" uses the same {Name}/{him} tokens as the rest (not the bank's generic "they").
const OTHER_G2 = "What's the first thing that pulls {Name} away from something {he}'s supposed to be doing?";
const OTHER_G1 = "When {Name} gets completely absorbed in something, what does it usually look like?";

// G2 stem: "When {Name} is supposed to be <activity>, what pulls {him} away first?"
export function g2Stem(worry: string): string {
  const w = worry as Worry;
  if (w === "other" || !(w in G2_ACTIVITY)) return OTHER_G2;
  return `When {Name} is supposed to be ${G2_ACTIVITY[w as Exclude<Worry, "other">]}, what pulls {him} away first?`;
}

// G1 stem — same contrastive style: acknowledge the worry, then ask what GENUINE absorption looks
// like (the options describe the focus shape). Worry-specific framing per key.
const G1_STEM: Record<Exclude<Worry, "other">, string> = {
  homework:   "Homework may be a battle — but when {Name} really gets into something, what does it look like?",
  reminders:  "{Name} may need reminding — but when something truly grabs {him}, what does that focus look like?",
  screens:    "Screens aside, when {Name} gets completely absorbed in something, what does it look like?",
  finish:     "{Name} may leave things unfinished — but when {he}'s genuinely absorbed, what does it look like?",
  giveup:     "Hard things may stop {him} — but when {Name} is deep in something {he} loves, what does it look like?",
  confidence: "{Name} may doubt {himself} on schoolwork — but when {he}'s absorbed in something, what does it look like?",
};

export function g1Stem(worry: string): string {
  const w = worry as Worry;
  if (w === "other" || !(w in G1_STEM)) return OTHER_G1;
  return G1_STEM[w as Exclude<Worry, "other">];
}

export const ALL_WORRIES: Worry[] = ["reminders", "homework", "screens", "giveup", "confidence", "finish", "other"];

// For the grammar test + the review render.
export function allStems(): { worry: Worry; g1: string; g2: string }[] {
  return ALL_WORRIES.map((worry) => ({ worry, g1: g1Stem(worry), g2: g2Stem(worry) }));
}
