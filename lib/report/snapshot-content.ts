// AUTO-GENERATED from content/snapshot-copy-map.md by scripts/gen-snapshot-content.mts.
// Do not edit by hand — edit the markdown and re-run the generator.
// Parent-facing copy is verbatim from the copy map.

export type SnapshotDimKey =
  | "attention_shape"
  | "attention_competition"
  | "friction_response"
  | "recharge_type";

export const SNAPSHOT_SECTION = {
  kicker: "ATTENTION HEALTH SNAPSHOT",
  heading: "Four things we looked at",
  lede: "And what each one means once you compare it with other parents who've taken this.",
} as const;

export const SNAPSHOT_DIMENSIONS: { key: SnapshotDimKey; label: string }[] = [
  { key: "attention_shape", label: "How they focus" },
  { key: "attention_competition", label: "What breaks their focus" },
  { key: "friction_response", label: "When it gets hard" },
  { key: "recharge_type", label: "How they recharge" },
];

// Rendered when a value has no per-value entry (a future new option). Never a
// profile fallback string.
export const SNAPSHOT_GENERIC_FALLBACK: Record<SnapshotDimKey, string> = {
  attention_shape: "How they get into something, and what keeps them there.",
  attention_competition: "What pulls them away once they've started.",
  friction_response: "What happens in the first few minutes of something hard.",
  recharge_type: "What they need after a demanding day.",
};

export type SnapshotEntry = { answer: string; insight: string };

export const SNAPSHOT_COPY: Record<SnapshotDimKey, Record<string, SnapshotEntry>> = {
  attention_shape: {
    "narrow-deep": { answer: "Goes deep into one thing, and stays there", insight: "Which is why shorter tasks and more breaks tend to backfire — that advice is written for a different way in." },
    "wide-shifting": { answer: "Moves between a few related things at once", insight: "The moving isn't losing focus, it's how the focus is held — forcing one thing at a time removes the method." },
    "social-anchored": { answer: "Focuses best with someone else nearby", insight: "Sending them off to work alone removes the condition they need — it's presence they're after, not help." },
    "sensation-seeking": { answer: "Goes toward whatever's most alive in the room", insight: "Interest isn't the problem; a calm, quiet setup reads to them as nothing happening." },
  },
  attention_competition: {
    "novelty": { answer: "A new idea arriving mid-task", insight: "The interruption comes from inside, so removing distractions doesn't reach it — the idea needs somewhere to go." },
    "external": { answer: "Noise, movement, or someone nearby", insight: "The one kind where changing the room genuinely helps — for most of the others it doesn't." },
    "internal": { answer: "The moment it stops being interesting", insight: "It stops from the inside, so a quieter room doesn't reach it. This is the one most often misread as not trying." },
    "social": { answer: "Whatever's happening with the people nearby", insight: "People are the pull, so isolating them to work usually makes it stronger rather than weaker." },
    "genuine-interest": { answer: "Real interest in something else — not avoidance", insight: "They're not escaping the work, they're choosing something they actually want. That's a harder thing to compete with, and a better one." },
    "task-escape": { answer: "Something harder they'd rather not start", insight: "The screen isn't the draw — the task is the push. What needs changing is the way in, not the screen." },
    "boredom-avoidance": { answer: "Boredom, with a gap to fill", insight: "Nothing is competing for them, which is easier than it sounds — the work has no rival, it just has no pull yet." },
  },
  friction_response: {
    "avoid": { answer: "Goes quiet, and steps back before anyone notices", insight: "You usually find out afterwards rather than during — the hard part is that it looks like nothing happening." },
    "solo-push": { answer: "Pushes on alone rather than asking", insight: "Help offered mid-struggle can land as an interruption, so timing matters more than being available." },
    "support-seek": { answer: "Comes and finds you", insight: "They tell you when it's hard, which not every child does — the risk here is answering too fast." },
    "emotional-derail": { answer: "Gets upset before the trying starts", insight: "The difficulty is being anticipated, not met, so what needs changing sits before the task rather than inside it." },
    "energized": { answer: "Hard things energize rather than drain", insight: "Easy work is the risk here, not hard work — under-pitching loses them faster than difficulty does." },
  },
  recharge_type: {
    "sensory-quiet": { answer: "Quiet, alone, with less coming at them", insight: "The hour after school isn't spare time — it's what makes the evening possible." },
    "social-connection": { answer: "Time with people they trust", insight: "Quiet time alone reads as rest to you, but for them it isn't recovery." },
    "cognitive-displacement": { answer: "Something absorbing enough to switch off", insight: "Which is why the screen after school is hard to argue with — it's doing a real job, and replacing it needs something equally absorbing." },
    "autonomous-unstructured": { answer: "Time that's theirs, with nothing asked", insight: "A preference rather than a problem — the plan works around this one rather than on it." },
  },
};
