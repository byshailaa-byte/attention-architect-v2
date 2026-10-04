// Static Report v2 fallbacks, used when the LLM output fails validation/coherence twice
// (or the API is unavailable). Grounded in the SAME programme as the generated text:
// - switch = that archetype's Week 1 core move, written as words a parent says (in quotes).
// - tonight = that archetype's Week 1 Day 2 move, as three concrete steps.
// - whyParas[0] = the archetype mechanism; whyParas[1] ties that mechanism to the worry.
// All copy is authored to PASS lib/report-v2/validator (plain words, short sentences, no
// hedges, no clinical claims, no comparative claims, no parent-blame; quoted switch lines).
// {they} fills a THIRD-PERSON SINGULAR (he/she, or the name) — verbs must be singular.
// Tokens: {Name} {they} {their} {them}.
import { displayChildName, buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";
import type { ReportV2Generated } from "@/lib/report-v2/types";

// Short strengths-first blurb per archetype (duplicated small, keeps report-v2 self-contained).
export const ARCHETYPE_DESC: Record<string, string> = {
  "The All-In Kid": "Deep, chosen focus. Harder on open-ended or repetitive work.",
  "The Explorer":   "Wide, roving attention that moves across topics and loves what is new.",
  "The Glue":       "Attention follows people. {Name} connects and focuses best alongside others.",
  "The Inventor":   "Absorbed in the how — {their} own way to solve things.",
  "The Magnet":     "Attention follows connection. People light {Name} up.",
  "The Storm":      "Bursts of intense focus, then a strong need to step back and reset.",
  "The Captain":    "Takes charge. {Name} does best when {they} owns the plan.",
  "The Live Wire":  "High energy that pours into whatever {Name} cares about.",
};

type ArchPiece = {
  shortGood: string;
  mechanismPara: string; // whyParas[0] — how this child's attention works
  switch: { instead: string; try: string; after: string }; // Week 1 core move, parent-spoken
  tonight: [string, string, string]; // Week 1 Day 2 move, adapted
};

const ARCH: Record<string, ArchPiece> = {
  "The Storm": {
    shortGood: "{Name} can lock in hard when something grabs {them}.",
    mechanismPara: "When it is {Name}’s idea, {they} will stay with it. The moment it is handed over already decided, the same energy turns into a no.",
    switch: {
      instead: "“Here’s your homework — start with this one.”",
      try: "“Two ways to start — you pick which.”",
      after: "Then step back and let {Name}’s choice stand.",
    },
    tonight: [
      "Before homework, give {Name} two ways to start.",
      "Let {them} pick, and let the choice stand.",
      "Watch the first five minutes, not the whole session.",
    ],
  },
  "The All-In Kid": {
    shortGood: "{Name} goes all in on work {they} chooses.",
    mechanismPara: "Once {Name} is in, {they} is really in. The cost is not the work — it is being pulled out of it halfway.",
    switch: {
      instead: "“How’s it going? Need anything?”",
      try: "“I’ll leave you to it for half an hour.”",
      after: "Then clear the next half hour of any check-ins.",
    },
    tonight: [
      "Pick one task and clear thirty minutes around it.",
      "No check-ins, no snack runs, no “how’s it going”.",
      "Let the focus run uninterrupted once.",
    ],
  },
  "The Inventor": {
    shortGood: "{Name} loves working out how things fit together.",
    mechanismPara: "{Name} will do it, but {their} own way, even when that is slower. Being shown the right way too early usually stops {them} trying.",
    switch: {
      instead: "“Here, let me show you the right way.”",
      try: "“Do it your way — show me when you’re done.”",
      after: "Then say nothing about the method and let it run.",
    },
    tonight: [
      "Pick one task and hand {Name} the method.",
      "Say nothing about how to do it.",
      "If {they} hits a wall, ask “What would you try next?”",
    ],
  },
  "The Explorer": {
    shortGood: "{Name} connects ideas fast and loves what is new.",
    mechanismPara: "One question takes {Name} somewhere else, and ideas come fast. The side-trip is not lost focus — it is the same drive with nowhere to go.",
    switch: {
      instead: "“Stop getting distracted and finish the page.”",
      try: "“If this sparks something, note it — we’ll come back.”",
      after: "Then keep a notepad beside the work for side-ideas.",
    },
    tonight: [
      "Put a notepad next to the homework.",
      "Tell {Name} to park side-ideas on it.",
      "Come back to one idea together after.",
    ],
  },
  "The Magnet": {
    shortGood: "{Name} lights up with people and shared wins.",
    mechanismPara: "With someone nearby, {Name} can work for a long time. Alone with the same worksheet, it quietly falls apart.",
    switch: {
      instead: "“Go to your room and get it done.”",
      try: "“I’ll sit here with you while you start.”",
      after: "Then do your own thing nearby, present but not checking.",
    },
    tonight: [
      "Sit near {Name} as {they} starts.",
      "Do your own thing — there, not managing.",
      "Step out for the middle, then come back.",
    ],
  },
  "The Glue": {
    shortGood: "{Name} does {their} best work alongside others.",
    mechanismPara: "{Name} reads the mood of a room before anything else. If something feels off between people, that comes first, every time.",
    switch: {
      instead: "“Sit down, it’s homework time.”",
      try: "“Let’s catch up for a minute first.”",
      after: "Then make the ask once the air clears.",
    },
    tonight: [
      "Take two minutes to connect first, not about work.",
      "If something feels off, name it plainly.",
      "Then make the ask, calm and small.",
    ],
  },
  "The Captain": {
    shortGood: "{Name} takes charge and likes being in control.",
    mechanismPara: "Give {Name} something to run and {they} will push hard. Ask {them} to follow someone else’s plan and the drive quietly goes.",
    switch: {
      instead: "“Do it the way I told you.”",
      try: "“Your call — how do you want to run this?”",
      after: "Then step back and do not redo it after.",
    },
    tonight: [
      "Pick one task that is usually your call.",
      "Hand {Name} the real decision, not the order.",
      "Step back and let {them} run it.",
    ],
  },
  "The Live Wire": {
    shortGood: "{Name} brings big energy to things {they} cares about.",
    mechanismPara: "When something is really at stake, {Name} is fully switched on. Without that, a task barely lands.",
    switch: {
      instead: "“Just do it because I said so.”",
      try: "“What would make this worth doing right now?”",
      after: "Then let {Name} name a real stake, like a timer to beat.",
    },
    tonight: [
      "Ask {Name} what would make it worth doing now.",
      "Turn it into a real timer to beat or a small bet.",
      "Let {Name} choose the stake, not you.",
    ],
  },
};

const ARCH_FALLBACK: ArchPiece = ARCH["The All-In Kid"];

type WorryPiece = { shortWhy: string; shortFix: string; worryPara: string };

const WORRY: Record<string, WorryPiece> = {
  homework: {
    shortWhy: "Homework feels big and not {Name}’s own, so starting is the hard part.",
    shortFix: "Make the start small and {Name}’s own.",
    worryPara: "That is why homework turns into a fight. The block feels big and not {Name}’s own, so the start is the hard part.",
  },
  reminders: {
    shortWhy: "Starting cold is hard, so {Name} waits for a nudge.",
    shortFix: "Build a cue {Name} can follow without you.",
    worryPara: "That is why {Name} waits for a nudge. Starting cold, with nothing of {their} own in it, takes real effort.",
  },
  screens: {
    shortWhy: "Screens are fast and sure, so slow work feels like a loss.",
    shortFix: "Set a clear off-ramp before the screen goes on.",
    worryPara: "That is why screens win. They are fast and sure, so the swap to slow work feels like a loss.",
  },
  confidence: {
    shortWhy: "A risky first try feels safer to hand over than to attempt.",
    shortFix: "Lower the risk of the very first try.",
    worryPara: "That is why {Name} asks for help first. A first try that feels risky is safer to hand over than to attempt.",
  },
  giveup: {
    shortWhy: "One early miss can feel like proof, so {Name} stops.",
    shortFix: "Treat the first miss as a step, not a verdict.",
    worryPara: "That is why {Name} stops early. One miss can feel like proof, so quitting protects {them} from another.",
  },
  finish: {
    shortWhy: "The start is the fun part, so the slow middle is where {Name} drifts.",
    shortFix: "Make the finish line small and easy to see.",
    worryPara: "That is why finishing is hard. The start is the fun part; the slow middle is where {Name} drifts.",
  },
  other: {
    shortWhy: "Getting going and keeping going each ask effort at a different moment.",
    shortFix: "Make the first step small and the finish clear.",
    worryPara: "That is why getting going and keeping going both stall. Each one asks effort at a different moment.",
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

// Deterministic archetype × worry fallback, grounded in the Week 1 move. Same inputs →
// identical content.
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
    whyParas: [f(a.mechanismPara), f(w.worryPara)],
    switch: { instead: f(a.switch.instead), try: f(a.switch.try), after: f(a.switch.after) },
    tonight: [f(a.tonight[0]), f(a.tonight[1]), f(a.tonight[2])],
  };
}
