// ============================================================================
// DRAFT — Report v2 static fallbacks, for Shaily to review/rewrite.
// ----------------------------------------------------------------------------
// These are the SAFETY NET: shown when the LLM output fails validation/coherence
// twice, or the API is down. They must be as grounded as the generated text.
//
// Structure = 8 archetypes × 7 worries. For each cell, the archetype's Week 1
// PRINCIPLE is applied AT THAT WORRY'S MOMENT — not re-skinned homework advice:
//   reminders  → the moment of starting
//   homework   → the start of homework
//   screens    → the screen-off moment
//   confidence → the moment something feels hard
//   giveup     → the moment after the first failure
//   finish     → the moment the child is about to stop early
//   other      → the start of any daily task
//
// Week 1 principle per archetype (from content/lms/week-1):
//   Storm      → offer two real choices, let the child pick, let it stand
//   All-In Kid → protect one uninterrupted stretch; no interruptions
//   Inventor   → let them do it their own way; ask "what would you try next?"
//   Explorer   → give the wandering a destination; park side-ideas, come back
//   Magnet     → be present alongside; do it near them, not managing
//   Glue       → connect / name what's off before the task
//   Captain    → hand over the real decision; don't redo it
//   Live Wire  → attach a real, immediate stake the child chooses
//
// Every cell MUST pass lib/report-v2/validator (plain words, ≤20-word sentences,
// Flesch ≥60 on prose, length caps, quoted switch lines, no jargon/comparatives).
// {they} fills a THIRD-PERSON SINGULAR (he/she, or the name) — verbs stay singular.
// Tokens: {Name} {they} {their} {them}.
// ============================================================================
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
  "The Captain":    "Takes charge. {Name} does best when {they} runs the plan.",
  "The Live Wire":  "High energy that pours into whatever {Name} cares about.",
};

// Archetype-level: one-line strength + the mechanism paragraph (whyParas[0]).
type ArchMeta = { shortGood: string; mechanismPara: string };
const ARCH_META: Record<string, ArchMeta> = {
  "The Storm": {
    shortGood: "{Name} can lock in hard when something grabs {them}.",
    mechanismPara: "When it is {Name}’s idea, {they} will stay with it. The moment it is handed over already decided, the same energy turns into a no.",
  },
  "The All-In Kid": {
    shortGood: "{Name} goes all in on work {they} chooses.",
    mechanismPara: "Once {Name} is in, {they} is really in. The cost is not the work — it is being pulled out of it halfway.",
  },
  "The Inventor": {
    shortGood: "{Name} loves working out how things fit together.",
    mechanismPara: "{Name} will do it, but {their} own way, even when that is slower. Being shown the right way too early usually stops {them} trying.",
  },
  "The Explorer": {
    shortGood: "{Name} connects ideas fast and loves what is new.",
    mechanismPara: "One question takes {Name} somewhere else, and ideas come fast. The side-trip is not lost focus — it is the same drive with nowhere to go.",
  },
  "The Magnet": {
    shortGood: "{Name} lights up with people and shared wins.",
    mechanismPara: "With someone nearby, {Name} can work for a long time. Alone with the same worksheet, it quietly falls apart.",
  },
  "The Glue": {
    shortGood: "{Name} does {their} best work alongside others.",
    mechanismPara: "{Name} reads the mood of a room before anything else. If something feels off between people, that comes first, every time.",
  },
  "The Captain": {
    shortGood: "{Name} takes charge and likes being in control.",
    mechanismPara: "Give {Name} something to run and {they} will push hard. Ask {them} to follow someone else’s plan and the drive quietly goes.",
  },
  "The Live Wire": {
    shortGood: "{Name} brings big energy to things {they} cares about.",
    mechanismPara: "When something is really at stake, {Name} is fully switched on. Without that, a task barely lands.",
  },
};
const ARCH_META_FALLBACK = ARCH_META["The All-In Kid"];

// Worry-level: one-line why + a picture-able fix instruction + the worry paragraph (whyParas[1]).
type WorryMeta = { shortWhy: string; shortFix: string; worryPara: string };
const WORRY_META: Record<string, WorryMeta> = {
  reminders: {
    shortWhy: "Starting cold is hard, so {Name} waits for a nudge.",
    shortFix: "Set a cue {Name} can start from without you.",
    worryPara: "That is why {Name} waits for a nudge. Starting cold, with nothing of {their} own in it, takes real effort.",
  },
  homework: {
    shortWhy: "Homework feels big and not {Name}’s own, so starting is the hard part.",
    shortFix: "Shrink the first step, then let {Name} begin it.",
    worryPara: "That is why homework turns into a fight. The block feels big and not {Name}’s own, so the start is the hard part.",
  },
  screens: {
    shortWhy: "Screens are fast and sure, so stopping feels like a loss.",
    shortFix: "Agree the stop before the screen goes on.",
    worryPara: "That is why screens win. They are fast and sure, so the swap to slow work feels like a loss.",
  },
  confidence: {
    shortWhy: "A risky first try feels safer to hand over than to attempt.",
    shortFix: "Make the first try small enough to feel safe.",
    worryPara: "That is why {Name} asks for help first. A first try that feels risky is safer to hand over than to attempt.",
  },
  giveup: {
    shortWhy: "One early miss can feel like proof, so {Name} stops.",
    shortFix: "Treat the first miss as a step, then try once more.",
    worryPara: "That is why {Name} stops early. One miss can feel like proof, so quitting protects {them} from another.",
  },
  finish: {
    shortWhy: "The start is the fun part, so the slow middle is where {Name} drifts.",
    shortFix: "Put the finish line in sight before {Name} starts.",
    worryPara: "That is why finishing is hard. The start is the fun part; the slow middle is where {Name} drifts.",
  },
  other: {
    shortWhy: "Getting going and keeping going each ask effort at a different moment.",
    shortFix: "Make the first step small, then step back.",
    worryPara: "That is why getting going and keeping going both stall. Each one asks effort at a different moment.",
  },
};

type Cell = { instead: string; try: string; after: string; tonight: [string, string, string] };

// 8 archetypes × 7 worries. switch (instead/try = quoted parent lines) + tonight, each at
// the worry's moment using the archetype's Week 1 principle.
const CELL: Record<string, Record<string, Cell>> = {
  "The Storm": {
    reminders: { instead: "“Go on, get started now.”", try: "“Start with this or that — you choose.”", after: "Then let the pick stand and step back.", tonight: ["At start time, offer {Name} two ways to begin.", "Let {them} choose, and keep the choice.", "Watch the first five minutes, not the rest."] },
    homework: { instead: "“Sit down and start your homework.”", try: "“Maths first or reading first — your call.”", after: "Then let {Name}’s order stand.", tonight: ["Before homework, give {Name} two ways in.", "Let {them} pick which to do first.", "Let the choice stand, even if it is odd."] },
    screens: { instead: "“Turn it off right now.”", try: "“Off at six, or after this episode — you pick.”", after: "Then hold to whichever {Name} chose.", tonight: ["Before screens, offer two clear stop points.", "Let {Name} pick one and agree it out loud.", "When it comes, hold to {their} choice."] },
    confidence: { instead: "“Just do it, it’s easy.”", try: "“Try it alone or with me — you choose.”", after: "Then back whichever {Name} picks.", tonight: ["When it looks hard, offer two ways to try.", "Let {Name} pick how to start it.", "Let the choice stand and step back."] },
    giveup: { instead: "“See, I told you. Give it here.”", try: "“Try that again, or tweak it — your call.”", after: "Then let {Name} run the second go.", tonight: ["After the first miss, offer two next moves.", "Let {Name} pick a retry or a change.", "Let {them} run it without taking over."] },
    finish: { instead: "“No stopping until it’s done.”", try: "“One more part now, or after a break — pick.”", after: "Then let {Name} choose and hold it.", tonight: ["When {Name} wants to quit, offer two ways on.", "Let {them} pick: push now or short break.", "Hold to the choice and come back."] },
    other: { instead: "“Come on, just get going.”", try: "“This way or that way — you choose.”", after: "Then let the pick stand.", tonight: ["At the start, offer {Name} two ways in.", "Let {them} pick one and begin.", "Watch the first few minutes, not the rest."] },
  },
  "The All-In Kid": {
    reminders: { instead: "“Have you started? Have you started yet?”", try: "“I’ll leave you to start — no interruptions.”", after: "Then give {Name} a clear, quiet run at it.", tonight: ["At start time, clear away interruptions.", "No check-ins once {Name} begins.", "Let the first stretch run unbroken."] },
    homework: { instead: "“How’s the homework going? Need help?”", try: "“I’ll leave you to it for half an hour.”", after: "Then clear the next half hour of check-ins.", tonight: ["Pick one task and guard half an hour.", "No check-ins, no snack runs, no questions.", "Let the focus run unbroken once."] },
    screens: { instead: "“Off now — right now.”", try: "“Finish this one bit, then we stop together.”", after: "Then let {Name} reach a clean stopping point.", tonight: ["Agree one clear end before screens start.", "Let {Name} reach it without being rushed.", "Give a warning, then stop together, calm."] },
    confidence: { instead: "“Come on, it’s not that hard.”", try: "“Take your time — I won’t hover.”", after: "Then give {Name} space to work it through.", tonight: ["When it feels hard, give {Name} room.", "Don’t hover or jump in to fix.", "Let {them} stay with it a while."] },
    giveup: { instead: "“Don’t give up, keep going!”", try: "“Take a breath — no rush, no watching.”", after: "Then step back and let {Name} choose to retry.", tonight: ["After a miss, drop the pressure.", "Give {Name} a quiet minute, no watching.", "Let the second try come from {them}."] },
    finish: { instead: "“Nearly there, don’t stop now!”", try: "“Keep going — I’ll stay out of your way.”", after: "Then protect the last stretch from interruptions.", tonight: ["Near the end, clear all interruptions.", "Let {Name} run to a natural finish.", "Don’t call time before {they} is ready."] },
    other: { instead: "“Have you done it yet?”", try: "“I’ll leave you to it — shout if you need me.”", after: "Then give {Name} an uninterrupted run.", tonight: ["At the start, clear interruptions.", "No check-ins once {Name} begins.", "Let the first stretch run unbroken."] },
  },
  "The Inventor": {
    reminders: { instead: "“Start it the way I showed you.”", try: "“How you start this is your call.”", after: "Then stay quiet and let {Name} begin {their} way.", tonight: ["At start time, let {Name} choose the how.", "Say nothing about the right way.", "If {they} stalls, ask where {they} wants to begin."] },
    homework: { instead: "“Here, let me show you the right way.”", try: "“Do it your way — show me when you’re done.”", after: "Then say nothing about the method and let it run.", tonight: ["Pick one task and hand {Name} the how.", "Say nothing about the method.", "If {they} hits a wall, ask what {they} would try next."] },
    screens: { instead: "“Off now, because I said so.”", try: "“You decide how to wrap up, then screen off.”", after: "Then let {Name} choose the way to stop.", tonight: ["At screen-off, let {Name} pick how to stop.", "Let {them} finish {their} own way first.", "Agree the stop, then leave the how to {them}."] },
    confidence: { instead: "“Do it like this, it’s easier.”", try: "“Try it your way first — I won’t step in.”", after: "Then let {Name}’s own method run, even if slow.", tonight: ["When it feels hard, let {Name} try {their} way.", "Don’t show the right way too early.", "If stuck, ask what {they} would try next."] },
    giveup: { instead: "“That’s wrong — here, I’ll fix it.”", try: "“What would you try next?”", after: "Then let {Name} run {their} own next move.", tonight: ["After a miss, don’t fix it for {them}.", "Ask what {they} would try next.", "Let {Name}’s next idea play out."] },
    finish: { instead: "“Just finish it the normal way.”", try: "“Your way to the end — show me when done.”", after: "Then leave the final stretch to {Name}.", tonight: ["Near the end, keep the method {Name}’s.", "Don’t take over to speed it up.", "Let {them} finish {their} own way."] },
    other: { instead: "“Do it the way I told you.”", try: "“Your call how to do this one.”", after: "Then stay quiet and let {Name} run it.", tonight: ["At the start, hand {Name} the how.", "Say nothing about the right way.", "If stuck, ask what {they} would try next."] },
  },
  "The Explorer": {
    reminders: { instead: "“Focus — just start, no side quests.”", try: "“Park any new idea here, then we start.”", after: "Then keep a notepad by {Name} for side-ideas.", tonight: ["At start time, put a notepad beside {Name}.", "Say side-ideas go on the pad for later.", "Start the task, then revisit one idea."] },
    homework: { instead: "“Stop getting distracted and finish the page.”", try: "“If this sparks something, note it — come back.”", after: "Then keep a notepad beside the work for ideas.", tonight: ["Put a notepad next to the homework.", "Tell {Name} to park side-ideas on it.", "Come back to one idea together after."] },
    screens: { instead: "“Off now, stop messing about.”", try: "“Note what you want next, then switch off.”", after: "Then park the next thing on a list, not the screen.", tonight: ["Before off, write what {Name} wants next time.", "Park it on a list, then turn off.", "Come back to the list tomorrow."] },
    confidence: { instead: "“Stop wandering and just try it.”", try: "“Find one way this links to what you like.”", after: "Then let {Name} enter it through {their} own angle.", tonight: ["When it feels hard, find a link {Name} likes.", "Let {them} start from that angle.", "Park other ideas on a pad for later."] },
    giveup: { instead: "“Don’t drift off, try again.”", try: "“What’s another angle to try?”", after: "Then let {Name} chase the new angle.", tonight: ["After a miss, ask for a different angle.", "Let {Name} note two ways to retry.", "Let {them} pick one and go."] },
    finish: { instead: "“No wandering, just finish it.”", try: "“Park that idea — finish this, then chase it.”", after: "Then hold the side-idea on a pad till the end.", tonight: ["Near the end, park any new idea on the pad.", "Finish the task first.", "Then chase one parked idea together."] },
    other: { instead: "“Focus and get on with it.”", try: "“Park side-ideas here, then start.”", after: "Then keep a notepad beside {Name}.", tonight: ["At the start, put a notepad beside {Name}.", "Side-ideas go on the pad for later.", "Start, then revisit one idea."] },
  },
  "The Magnet": {
    reminders: { instead: "“Go and start it on your own.”", try: "“I’ll sit with you while you start.”", after: "Then do your own thing nearby, not checking.", tonight: ["At start time, sit near {Name}.", "Do your own thing — there, not managing.", "Stay for the first few minutes."] },
    homework: { instead: "“Go to your room and get it done.”", try: "“I’ll sit here with you while you start.”", after: "Then do your own thing nearby, present but not checking.", tonight: ["Sit near {Name} as {they} starts.", "Do your own thing — there, not managing.", "Step out for the middle, then come back."] },
    screens: { instead: "“Off now, go do something else.”", try: "“Let’s switch off and do the next thing together.”", after: "Then move to the next thing alongside {Name}.", tonight: ["At screen-off, move to the next thing with {Name}.", "Do it together for the first minute.", "Then let {them} carry on near you."] },
    confidence: { instead: "“You can do it, off you go.”", try: "“Let’s look at the first bit together.”", after: "Then stay alongside as {Name} takes it on.", tonight: ["When it feels hard, sit beside {Name}.", "Start the first bit together.", "Then let {them} carry on with you near."] },
    giveup: { instead: "“Don’t quit — try it again.”", try: "“Let’s have one more go at it together.”", after: "Then stay beside {Name} for the retry.", tonight: ["After a miss, stay beside {Name}.", "Offer one more go together.", "Let the second try happen with you near."] },
    finish: { instead: "“Finish it yourself, I’m busy.”", try: "“I’ll sit with you to the end of this.”", after: "Then keep {Name} company through the last stretch.", tonight: ["Near the end, come and sit with {Name}.", "Keep {them} company to the finish.", "Notice the finish together."] },
    other: { instead: "“Off you go, do it alone.”", try: "“I’ll be right here while you start.”", after: "Then do your own thing nearby.", tonight: ["At the start, sit near {Name}.", "Be there, not managing.", "Stay for the first few minutes."] },
  },
  "The Glue": {
    reminders: { instead: "“Stop stalling and start.”", try: "“Quick catch-up first, then we start.”", after: "Then make the ask once the air feels clear.", tonight: ["Before start time, connect for two minutes.", "If something feels off, name it plainly.", "Then ask {Name} to begin, calm and small."] },
    homework: { instead: "“Sit down, it’s homework time.”", try: "“Let’s catch up for a minute first.”", after: "Then make the ask once the air clears.", tonight: ["Take two minutes to connect, not about work.", "If something feels off, name it plainly.", "Then make the ask, calm and small."] },
    screens: { instead: "“Off now, no arguments.”", try: "“Everything okay? Two minutes, then we switch off.”", after: "Then turn it off together once {Name} feels met.", tonight: ["Before screen-off, check in with {Name}.", "Name anything that feels tense.", "Then switch off together, calm."] },
    confidence: { instead: "“It’s fine, just try it.”", try: "“Tell me what feels hard about it first.”", after: "Then start it together once {Name} feels heard.", tonight: ["When it feels hard, ask what’s tricky.", "Listen before fixing anything.", "Then start the first bit together."] },
    giveup: { instead: "“Don’t make a fuss, try again.”", try: "“That was annoying, wasn’t it? Let’s go again.”", after: "Then start the retry once {Name} feels met.", tonight: ["After a miss, name the feeling first.", "Don’t rush to the retry.", "Then try again together, calm."] },
    finish: { instead: "“Stop moaning and finish it.”", try: "“Nearly there — anything bugging you first?”", after: "Then help {Name} to the end once the air clears.", tonight: ["Near the end, check how {Name} feels.", "Name anything that is off.", "Then finish the last bit together."] },
    other: { instead: "“Come on, just do it.”", try: "“Quick catch-up, then we start.”", after: "Then make the ask once {Name} feels met.", tonight: ["At the start, connect for two minutes.", "Name anything that feels off.", "Then ask, calm and small."] },
  },
  "The Captain": {
    reminders: { instead: "“Start now, the way I said.”", try: "“You’re in charge of how this starts.”", after: "Then step back and let {Name} run it.", tonight: ["At start time, hand {Name} the real call.", "Let {them} decide how to begin.", "Step back and don’t redo it."] },
    homework: { instead: "“Do it the way I told you.”", try: "“Your call — how do you want to run this?”", after: "Then step back and do not redo it after.", tonight: ["Pick one task that is usually your call.", "Hand {Name} the real decision, not the order.", "Step back and let {them} run it."] },
    screens: { instead: "“Off now, because I said.”", try: "“You set the stop time — then you own it.”", after: "Then hold {Name} to the rule {they} set.", tonight: ["Let {Name} set the screen-off rule.", "Agree it out loud together.", "Then hold {them} to {their} own rule."] },
    confidence: { instead: "“Do it this way, it’s right.”", try: "“You call how to tackle the hard bit.”", after: "Then back the plan {Name} picks.", tonight: ["When it feels hard, hand {Name} the plan.", "Let {them} choose how to take it on.", "Back the call and step back."] },
    giveup: { instead: "“Listen to me and try again.”", try: "“How do you want to run the next go?”", after: "Then let {Name} lead the second try.", tonight: ["After a miss, hand {Name} the next move.", "Let {them} decide how to retry.", "Step back and let it run."] },
    finish: { instead: "“Finish it my way, quickly.”", try: "“You decide how to bring this home.”", after: "Then let {Name} run it to the end.", tonight: ["Near the end, let {Name} own the finish.", "Let {them} pick the final steps.", "Step back and don’t redo it."] },
    other: { instead: "“Do it how I told you.”", try: "“Your call on how to run this.”", after: "Then step back and let {Name} lead.", tonight: ["At the start, hand over the real call.", "Let {Name} decide the how.", "Step back and don’t redo it."] },
  },
  "The Live Wire": {
    reminders: { instead: "“Start now, just because I said.”", try: "“What would make starting this worth it now?”", after: "Then let {Name} set a real stake, like a timer.", tonight: ["At start time, ask what makes it worth it.", "Turn it into a timer to beat or a bet.", "Let {Name} choose the stake, not you."] },
    homework: { instead: "“Just do your homework because I said.”", try: "“What would make this worth doing right now?”", after: "Then let {Name} name a real stake, like a timer.", tonight: ["Ask {Name} what would make it worth doing now.", "Turn it into a real timer to beat or a bet.", "Let {Name} choose the stake, not you."] },
    screens: { instead: "“Off now, I mean it.”", try: "“Beat the timer to the off switch — ready?”", after: "Then make the stop a quick challenge {Name} owns.", tonight: ["At screen-off, set a short timer challenge.", "Let {Name} race to switch off in time.", "Let {them} set the target, not you."] },
    confidence: { instead: "“Just try, it’s no big deal.”", try: "“Want to bet you can crack the first bit?”", after: "Then let {Name} set the challenge and go.", tonight: ["When it feels hard, make it a quick challenge.", "Let {Name} set a target to beat.", "Start the moment the stake is real."] },
    giveup: { instead: "“Don’t quit, keep trying.”", try: "“Best of three — want to go again?”", after: "Then let {Name} set the terms of the rematch.", tonight: ["After a miss, make the retry a quick game.", "Let {Name} set a target for round two.", "Go the moment the stake feels real."] },
    finish: { instead: "“Just finish it, come on.”", try: "“Can you finish before the timer? Your call.”", after: "Then let {Name} set the clock and race it.", tonight: ["Near the end, set a short timer to beat.", "Let {Name} choose the target time.", "Finish the moment the race is on."] },
    other: { instead: "“Just get on with it.”", try: "“What would make this worth doing now?”", after: "Then let {Name} name a real stake.", tonight: ["At the start, ask what makes it worth it.", "Turn it into a timer or a small bet.", "Let {Name} choose the stake, not you."] },
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

// Deterministic archetype × worry fallback, grounded in the Week 1 move applied at the
// worry's moment. Same inputs → identical content.
export function composeFallback(
  archetype: string,
  concernKey: string | null | undefined,
  name: string,
  gender: Gender,
): ReportV2Generated {
  const f = filler(name, gender);
  const worry = canonicalConcern(concernKey);
  const meta = ARCH_META[archetype] ?? ARCH_META_FALLBACK;
  const w = WORRY_META[worry];
  const cell = (CELL[archetype] ?? CELL["The All-In Kid"])[worry];
  return {
    shortGood: f(meta.shortGood),
    shortWhy: f(w.shortWhy),
    shortFix: f(w.shortFix),
    whyParas: [f(meta.mechanismPara), f(w.worryPara)],
    switch: { instead: f(cell.instead), try: f(cell.try), after: f(cell.after) },
    tonight: [f(cell.tonight[0]), f(cell.tonight[1]), f(cell.tonight[2])],
  };
}
