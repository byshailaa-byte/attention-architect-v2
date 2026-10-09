// First-open onboarding — FIXED templates + tap chips, NO LLM. Short separate bubbles, in order:
//   a. intro (one goal line per worry)
//   b. how it works
//   c. baseline question (per worry) + chips → confirm
//   d. today's step card (content comes from resolveTrialDays Day 1)
//   e. commit-to-a-time chips → done
// Every template carries the single-brace agreement tokens ({Name}/{he}/{his}/{s:x|y}); the caller
// fills them with fillTokens and the grammar checker (agreementErrors) guards every one in tests.
//
// Numbers are NEVER invented or rounded — the baseline is exactly the chip the parent taps.

export type Chip = { label: string; value: string };

export const WORRIES = ["reminders", "homework", "screens", "confidence", "giveup", "finish", "other"] as const;
export type Worry = (typeof WORRIES)[number];

function canonicalWorry(w: string | null | undefined): Worry {
  const v = (w ?? "").toLowerCase();
  return (WORRIES as readonly string[]).includes(v) ? (v as Worry) : "other";
}

// (a) One goal line per worry — from the plan's "what we work toward" (Week 1 outcome).
const GOAL: Record<Worry, string> = {
  reminders:  "{Name} getting started without being told twice",
  homework:   "{Name} sitting down to homework without the fight",
  screens:    "{Name} turning the screen off calmly, without a battle",
  confidence: "{Name} trying the hard bit before asking for help",
  giveup:     "{Name} having another go after the first try doesn't work",
  finish:     "{Name} seeing things through to done",
  other:      "{Name} getting started and keeping going",
};

// The one-thing goal line for a worry (carries {Name}; fill with fillTokens at the call site).
export function worryGoalLine(worry: string): string {
  return GOAL[canonicalWorry(worry)];
}

export function introBubble(worry: string): string {
  return `Hi, I'm your Attention Coach. For the next 4 days I'll help you with one thing: ${worryGoalLine(worry)}.`;
}

// (b) How it works — the intro line + bullets in ONE bubble, then the reassurance as its own.
export const HOW_IT_WORKS: string[] = [
  "Here's how it works:\n• One small step a day, about 5 minutes.\n• Each evening you tap one number for me.\n• On Day 4 we look at what changed, together.",
  "Day 1 might feel messy. That's normal.",
];

// (c) Baseline question + chips per worry.
const NUM_1_5: Chip[] = [
  { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3", value: "3" },
  { label: "4", value: "4" }, { label: "5+", value: "5+" },
];
const NUM_0_3: Chip[] = [
  { label: "0", value: "0" }, { label: "1", value: "1" }, { label: "2", value: "2" }, { label: "3+", value: "3+" },
];

type Baseline = { question: string; chips: Chip[] };
const BASELINE: Record<Worry, Baseline> = {
  reminders: {
    question: "On a usual day, how many times do you remind {Name} before {he} {s:starts|start} {his} homework?",
    chips: NUM_1_5,
  },
  homework: {
    question: "On a usual day, how long does it take {Name} to sit down to homework?",
    chips: [{ label: "Under 5 min", value: "<5" }, { label: "5–10 min", value: "5–10" }, { label: "10–20 min", value: "10–20" }, { label: "20+ min", value: "20+" }],
  },
  screens: {
    question: "On a usual day, how many times do you remind {Name} before the screen actually goes off?",
    chips: NUM_1_5,
  },
  confidence: {
    question: "On a usual day, how many times {s:does|do} {he} say “I can't” or ask for help before even trying?",
    chips: NUM_0_3,
  },
  giveup: {
    question: "On a usual day, how many times {s:does|do} {he} try again after the first try doesn't work?",
    chips: NUM_0_3,
  },
  finish: {
    question: "On a usual day, how much of {his} homework actually gets finished?",
    chips: [{ label: "None", value: "none" }, { label: "About half", value: "half" }, { label: "Most", value: "most" }, { label: "All", value: "all" }],
  },
  other: {
    question: "On a usual day, how often does the thing you're worried about happen with {Name}?",
    chips: NUM_1_5,
  },
};

export function baselineQuestion(worry: string): Baseline {
  return BASELINE[canonicalWorry(worry)];
}

// Baseline confirm with the unit per worry: "3 reminders", "10–20 minutes", "2 times", "half done".
// value = the chip value, label = the chip's display label (used for the minute ranges).
export function baselineUnit(worry: string, value: string, label: string): string {
  const w = canonicalWorry(worry);
  const plural = (n: string, word: string) => `${n} ${word}${n === "1" ? "" : "s"}`;
  switch (w) {
    case "reminders":
    case "screens":   return plural(value, "reminder");
    case "homework":  return label.replace(/\bmin\b/i, "minutes");
    case "confidence":
    case "giveup":
    case "other":     return plural(value, "time");
    case "finish":    return value === "none" ? "nothing done" : value === "all" ? "all done" : `${value} done`;
  }
}

export function baselineConfirm(worry: string, value: string, label: string): string {
  return `Got it: ${baselineUnit(worry, value, label)} on a usual day. That's our starting point.`;
}

// (d) Today's step card chrome (the step content comes from resolveTrialDays).
export const STEP_CARD_EYEBROW = "TODAY'S STEP · 5 MIN";
export const READ_FULL_STEP = "Read the full step (2 min)";

// (e) Commit-to-a-time.
export const COMMIT_QUESTION = "When will you try it today?";
export const COMMIT_CHIPS: Chip[] = [
  { label: "Before school", value: "before_school" },
  { label: "After school", value: "after_school" },
  { label: "Evening", value: "evening" },
];
export const COMMIT_DONE =
  "Done. I'll check in with you this evening. If anything goes sideways before then, just type here.";

// All raw templates (for the grammar test to render over boy/girl/unset).
export function allOnboardingTemplates(): string[] {
  const out: string[] = [];
  for (const w of WORRIES) {
    out.push(introBubble(w));
    out.push(BASELINE[w].question);
    out.push(baselineConfirm(w, "3", "10–20 min"));
  }
  out.push(...HOW_IT_WORKS, COMMIT_QUESTION, COMMIT_DONE, STEP_CARD_EYEBROW, READ_FULL_STEP);
  return out;
}
