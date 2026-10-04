// Static Report v2 fallbacks, used when the LLM output fails validation twice (or the
// API is unavailable). Coverage is archetype × worry: an archetype piece (strengths + the
// one mechanism-based switch + tonight steps) composes with a worry piece (why it happens +
// the fix). All copy is authored to PASS lib/report-v2/validator (plain words, short
// sentences, no hedges, no clinical claims, no parent-blame). Tokens: {Name} {they} {their} {them}.
import { displayChildName, buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";
import type { ReportV2Generated } from "@/lib/report-v2/types";

// Short strengths-first blurb per archetype (duplicated small, keeps report-v2 self-contained).
export const ARCHETYPE_DESC: Record<string, string> = {
  "The All-In Kid": "Deep, chosen focus. Harder on open-ended or repetitive work.",
  "The Explorer":   "Wide, roving attention that moves across topics and loves what is new.",
  "The Glue":       "Attention follows people. {Name} connects and focuses best alongside others.",
  "The Inventor":   "Absorbed in the how — systems, builds, and {their} own way to solve things.",
  "The Magnet":     "Attention follows connection. People and recognition light {Name} up.",
  "The Storm":      "Bursts of intense focus, then a strong need to step back and reset.",
  "The Captain":    "Takes charge. {Name} does best when {they} owns the plan.",
  "The Live Wire":  "High energy that pours into whatever {Name} cares about.",
};

type ArchPiece = {
  shortGood: string;
  switch: { instead: string; try: string; after: string };
  tonight: [string, string, string];
};

const ARCH: Record<string, ArchPiece> = {
  "The Storm": {
    shortGood: "{Name} can lock in hard when something grabs {them}.",
    switch: {
      instead: "One more push when {they} starts to fade",
      try: "A short reset the moment energy drops",
      after: "{Name} comes back ready after a short break, not after being pushed on.",
    },
    tonight: [
      "Watch for the moment {Name} starts to fade.",
      "Call a short break before it tips over.",
      "Start again once {they} looks ready, not on the clock.",
    ],
  },
  "The All-In Kid": {
    shortGood: "{Name} goes all in on work {they} chooses.",
    switch: {
      instead: "A big open task with no clear end",
      try: "One small, clear first step",
      after: "A clear finish line turns a wall into a task {Name} can start.",
    },
    tonight: [
      "Pick the one task that matters most tonight.",
      "Cut it down to a first step that takes two minutes.",
      "Say out loud what done looks like.",
    ],
  },
  "The Inventor": {
    shortGood: "{Name} loves working out how things fit together.",
    switch: {
      instead: "Telling {them} the steps to follow",
      try: "Asking {them} to design the steps",
      after: "When {Name} owns the plan, {they} stays with it far longer.",
    },
    tonight: [
      "Ask {Name} how {they} wants to tackle it.",
      "Write {their} plan down in {their} own words.",
      "Let {them} run it, even if it is slower.",
    ],
  },
  "The Explorer": {
    shortGood: "{Name} connects ideas fast and loves what is new.",
    switch: {
      instead: "A long task with no change in it",
      try: "Three short rounds with a quick switch",
      after: "Short rounds keep {Name} moving before boredom pulls {them} away.",
    },
    tonight: [
      "Break the work into three short rounds.",
      "Change one thing between each round.",
      "Mark each round done so progress shows.",
    ],
  },
  "The Magnet": {
    shortGood: "{Name} lights up with people and shared wins.",
    switch: {
      instead: "Working alone in a quiet room",
      try: "Working next to someone, out loud",
      after: "A bit of company turns a chore into something {Name} wants to do.",
    },
    tonight: [
      "Sit with {Name} while {they} starts.",
      "Ask {them} to talk you through the first step.",
      "Name one thing {they} did well, out loud.",
    ],
  },
  "The Glue": {
    shortGood: "{Name} does {their} best work alongside others.",
    switch: {
      instead: "Being sent off to do it alone",
      try: "Starting it together, then stepping back",
      after: "Start it with {Name} and {they} will keep going alone.",
    },
    tonight: [
      "Start the first minute together.",
      "Step back once {they} has momentum.",
      "Check in once, near the end.",
    ],
  },
  "The Captain": {
    shortGood: "{Name} takes charge and likes being in control.",
    switch: {
      instead: "Being told exactly what to do",
      try: "Being given the goal and the choice of how",
      after: "Give {Name} the wheel and {they} will drive the task home.",
    },
    tonight: [
      "Hand {Name} the goal, not the method.",
      "Let {them} pick the order of steps.",
      "Step in only if {they} asks.",
    ],
  },
  "The Live Wire": {
    shortGood: "{Name} brings big energy to things {they} cares about.",
    switch: {
      instead: "Sitting still for one long stretch",
      try: "Short bursts with movement between",
      after: "A quick move between bursts lets {Name} come back ready to focus.",
    },
    tonight: [
      "Set a short timer for the first burst.",
      "Add a one-minute move when it ends.",
      "Start the next burst while energy is high.",
    ],
  },
};

const ARCH_FALLBACK: ArchPiece = ARCH["The All-In Kid"];

type WorryPiece = { shortWhy: string; shortFix: string; whyParas: [string, string] };

const WORRY: Record<string, WorryPiece> = {
  homework: {
    shortWhy: "Homework feels big and dull, so starting it is the hard part.",
    shortFix: "Shrink the start until the first step feels easy.",
    whyParas: [
      "Homework is rarely about ability. The hard part is starting something that feels big, slow, and not {their} choice.",
      "Once {Name} is a few minutes in, the work usually flows. The trick is making that first step small enough to say yes to.",
    ],
  },
  reminders: {
    shortWhy: "Starting cold is hard, so {Name} waits for a nudge.",
    shortFix: "Build a cue {Name} can follow without you.",
    whyParas: [
      "Needing reminders is not about not caring. Starting a task cold takes real effort, so {Name} waits for a nudge to begin.",
      "A steady cue {they} can see does the nudging for you. In time the cue, not you, becomes the thing that gets {them} going.",
    ],
  },
  screens: {
    shortWhy: "Screens give fast, sure rewards that real tasks cannot match.",
    shortFix: "Make the off-ramp clear before the screen goes on.",
    whyParas: [
      "Screens hand out quick, certain wins. Next to that, homework and chores feel slow, so {Name} resists the swap.",
      "The fight is about the switch, not the screen. A clear off-ramp, agreed up front, makes stopping far less of a battle.",
    ],
  },
  confidence: {
    shortWhy: "Trying feels risky, so {Name} asks for help before starting.",
    shortFix: "Lower the risk of the very first try.",
    whyParas: [
      "Hanging back is often about risk, not ability. If a first try feels likely to fail, asking for help feels safer.",
      "When the first step is small and safe, {Name} will try it. Each win {they} owns makes the next try feel less risky.",
    ],
  },
  giveup: {
    shortWhy: "The first failure feels like proof, so {Name} stops.",
    shortFix: "Treat the first try as information, not a verdict.",
    whyParas: [
      "Quitting fast is rarely about effort. One early failure can feel like proof {they} cannot do it, so stopping is safer.",
      "When a first miss is framed as a normal step, {Name} keeps going. The aim is one more try, not instant success.",
    ],
  },
  finish: {
    shortWhy: "Starting is exciting; the dull middle is where {Name} drifts.",
    shortFix: "Make the finish line small and easy to see.",
    whyParas: [
      "Finishing is hard because the start is the fun part. The middle turns slow and dull, and that is where {Name} drifts.",
      "A short, visible finish line pulls {them} through the dull part. Seeing the end close by keeps {Name} moving to it.",
    ],
  },
  other: {
    shortWhy: "Starting and staying with a task both take real effort.",
    shortFix: "Make the first step small and the finish clear.",
    whyParas: [
      "Getting going and keeping going are two different jobs. Each one takes effort, and {Name} can stall at either point.",
      "A small first step and a clear finish line cover both. One gets {Name} started; the other keeps {them} moving to the end.",
    ],
  },
};

function filler(name: string, gender: Gender) {
  const nm = name.trim() ? displayChildName(name) : "Your child";
  const t = buildPronounTokens(gender, nm);
  return (tmpl: string) =>
    tmpl
      .replace(/\{Name\}/g, nm)
      .replace(/\{their\}/g, t.child_pronoun_poss)
      .replace(/\{them\}/g, t.child_pronoun_obj)
      .replace(/\{they\}/g, t.child_pronoun_subj);
}

export function archetypeDesc(archetype: string, name: string, gender: Gender): string {
  const f = filler(name, gender);
  return f(ARCHETYPE_DESC[archetype] ?? "A distinct attention pattern worth working with.");
}

// Deterministic archetype × worry fallback. Same inputs → identical content.
export function composeFallback(
  archetype: string,
  concernKey: string | null | undefined,
  name: string,
  gender: Gender,
): ReportV2Generated {
  const f = filler(name, gender);
  const a = ARCH[archetype] ?? ARCH_FALLBACK;
  const w = WORRY[canonicalConcern(concernKey)];
  return {
    shortGood: f(a.shortGood),
    shortWhy: f(w.shortWhy),
    shortFix: f(w.shortFix),
    whyParas: [f(w.whyParas[0]), f(w.whyParas[1])],
    switch: { instead: f(a.switch.instead), try: f(a.switch.try), after: f(a.switch.after) },
    tonight: [f(a.tonight[0]), f(a.tonight[1]), f(a.tonight[2])],
  };
}
