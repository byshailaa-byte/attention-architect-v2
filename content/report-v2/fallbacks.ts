// ============================================================================
// DRAFT — Report v2 static fallbacks, for Shaily to review/rewrite.
// ----------------------------------------------------------------------------
// The SAFETY NET: shown when the LLM output fails validation/coherence, or the
// API is down. Written in the GOLD VOICE — a warm friend talking to a busy parent
// on their phone: concrete scenes (real subject, real time, real place), short
// sentences (≤16 words, aim ≤14), no abstract nouns, the parent did the answering.
//
// 8 archetypes × 7 worries. For each cell, the archetype's Week 1 PRINCIPLE is said
// AT THAT WORRY'S MOMENT — not re-skinned homework advice:
//   reminders  → the moment of starting
//   homework   → the start of homework
//   screens    → the screen-off moment
//   confidence → the moment something feels hard
//   giveup     → the moment after the first failure
//   finish     → the moment the child is about to stop early
//   other      → the start of any daily task
//
// Week 1 principle per archetype (content/lms/week-1):
//   Storm      → offer two real choices, let the child pick, let it stand
//   All-In Kid → one quiet uninterrupted stretch; no check-ins
//   Inventor   → let them do it their own way; ask "what would you try next?"
//   Explorer   → a scrap pad for side-ideas; start, then come back to one
//   Magnet     → sit near them with your own work; don't manage
//   Glue       → chat / name what's off before the task
//   Captain    → hand over the real decision; don't redo it
//   Live Wire  → one real stake the child picks (a timer, a bet)
//
// Every cell MUST pass lib/report-v2/validator. {they} fills a THIRD-PERSON
// SINGULAR (he/she, or the name) — verbs stay singular; never start a sentence
// with {they} (it fills lowercase). Tokens: {Name} {they} {their} {them}.
// ============================================================================
import { displayChildName, fillTokens, type Gender } from "@/lib/report/pronouns";
import { canonicalConcern, noticeFor } from "@/lib/report-v2/goal-mapping";
import type { ReportV2Generated } from "@/lib/report-v2/types";

// Short strengths-first blurb per archetype (not validated; shown on the report).
export const ARCHETYPE_DESC: Record<string, string> = {
  "The All-In Kid": "Deep, chosen focus. Harder on open-ended or repetitive work.",
  "The Explorer":   "Quick, roving attention that moves across topics and loves what is new.",
  "The Glue":       "Attention follows people. {Name} works best alongside others.",
  "The Inventor":   "Likes working things out {their} own way.",
  "The Magnet":     "Comes alive around people. {Name} works best with company.",
  "The Storm":      "Big bursts of focus, then a strong need to step back.",
  "The Captain":    "Likes to lead. {Name} does best running the call.",
  "The Live Wire":  "Big energy for whatever really matters to {Name}.",
};

// Archetype-level (v3): seenIt — card 1's strength moment, ONE sentence starting "When {Name}",
// ≤16 words, showing the child FOCUSING WELL (never the worry). hardY = hardPart's SECOND
// sentence ("{He}'s …"), ≤10 words, aligned with WHY_BOXES[archetype] red line.
type ArchMeta = { seenIt: string; hardY: string };
// seenIt is a DISTINCT strength scene — it must NOT repeat the WHY_BOXES green/red copy for the
// archetype. Each is a concrete, everyday moment of the child FOCUSING WELL ("When {Name} …,
// {he} …"), drawn from the archetype's strengths, ≤18 words, using the explicit agreement tokens.
const ARCH_META: Record<string, ArchMeta> = {
  // NOTE on verb agreement: where the SUBJECT is {Name} (always grammatically singular), the verb
  // is hard-coded 3rd-singular ("Aarav picks", never the {s:…|…} fork — that fork is only for a
  // {he}/they SUBJECT). Likewise a singular noun subject ("a real challenge lands"). This keeps
  // the unset ("they") render correct: "When Aarav picks the plan, they throw real energy at it."
  "The Storm": {
    seenIt: "When {Name} picks the plan, {he} {s:throws|throw} real energy at it.",
    hardY: "{He}{'s} fighting being told, not the task.",
  },
  "The All-In Kid": {
    seenIt: "When {Name} settles into one thing, {he} {s:stays|stay} with it for ages.",
    hardY: "{He}{'s} finding it hard to get back in.",
  },
  "The Inventor": {
    seenIt: "When {Name} builds something {his} own way, {he} {s:keeps|keep} at the hard parts.",
    hardY: "{He}{'s} losing interest when {his} way gets corrected.",
  },
  "The Explorer": {
    seenIt: "When one thing sparks another, {Name} connects the ideas fast.",
    hardY: "{He}{'s} drifting off when every side-idea is stopped.",
  },
  "The Magnet": {
    seenIt: "When you sit at the table too, {Name} tries that bit harder.",
    hardY: "{He}{'s} losing focus when left alone.",
  },
  "The Glue": {
    seenIt: "When the people around {him} feel okay, {Name} gets on with it.",
    hardY: "{He}{'s} thrown off when there’s tension.",
  },
  "The Captain": {
    seenIt: "When {Name} runs the call, {he} {s:pushes|push} hard to get it done.",
    // Shape (c) cause-clause (ITEM 3b): "<thing> switches {them} off." Subject is the gerund
    // "Being told what to do" (singular) → "switches" stays singular for every gender.
    hardY: "Being told what to do switches {him} off.",
  },
  "The Live Wire": {
    seenIt: "When a real challenge lands, {Name} gives it everything {he} {has}.",
    hardY: "{He}{'s} drifting when nothing is happening.",
  },
};
const ARCH_META_FALLBACK = ARCH_META["The All-In Kid"];

// card 1 hardPart (v3) = "{Name} isn’t {HARD_X[worry]}. {ARCH_META[arch].hardY}" — two sentences,
// each ≤10 words. HARD_X = the wrong read of the worry (first sentence tail, after "isn’t").
const HARD_X: Record<string, string> = {
  reminders:  "ignoring you",
  homework:   "being lazy",
  screens:    "hooked on the screen",
  confidence: "unable to do it",
  giveup:     "giving up easily",
  finish:     "losing interest",
  other:      "refusing to try",
};

type Cell = { instead: string; try: string; after: string; tonight: [string, string, string] };

// 8 archetypes × 7 worries. switch (instead/try = quoted parent lines) + tonight, at the
// worry's moment using the archetype's Week 1 principle.
const CELL: Record<string, Record<string, Cell>> = {
  "The Storm": {
    reminders: { instead: "“Start your homework now. I've said it twice.”", try: "“Maths or reading first? 5:00 or 5:15? You pick.”", after: "Then step back, even if {Name}'s order looks slower.", tonight: ["Before the usual reminder, offer two ways to start.", "Let {Name} pick. Say nothing about the choice.", "Notice: did {they} start without a second reminder?"] },
    homework: { instead: "“Sit down and start your homework.”", try: "“Maths first or reading first? Your call.”", after: "Then let {Name}'s order stand.", tonight: ["Before homework, offer two ways in.", "Let {Name} pick which to do first.", "Let the choice stand, even if it looks odd."] },
    screens: { instead: "“Screen off. Now.”", try: "“Off at 6, or after this episode? You pick.”", after: "Then let {Name}'s choice stand, even if it's later.", tonight: ["Before the screen goes on, offer two stop times.", "Let {Name} pick. Write it where {they} can see it.", "When the time comes, point to what {they} chose."] },
    confidence: { instead: "“Just do it, it's easy.”", try: "“Try it alone, or with me? You choose.”", after: "Then back whatever {Name} picks.", tonight: ["When it looks hard, offer two ways to try.", "Let {Name} pick how to start.", "Let the choice stand and step back."] },
    giveup: { instead: "“See, I told you. Give it here.”", try: "“Same way again, or change one thing? You pick.”", after: "Then let {Name} run the second go.", tonight: ["After the first miss, offer two next moves.", "Let {Name} pick a retry or a small change.", "Let {them} run it. Don't take over."] },
    finish: { instead: "“No stopping until it's done.”", try: "“One more part now, or after a break? You pick.”", after: "Then hold to what {Name} chose.", tonight: ["When {Name} wants to stop, offer two ways on.", "Let {them} pick: push now, or a short break.", "Hold to the choice, then come back."] },
    other: { instead: "“Come on, just get going.”", try: "“This way or that way? You pick.”", after: "Then let the choice stand.", tonight: ["At the start, offer {Name} two ways in.", "Let {them} pick one and begin.", "Watch the first few minutes, not the rest."] },
  },
  "The All-In Kid": {
    reminders: { instead: "“Have you started? Have you started yet?”", try: "“I'll leave you to start. Shout if you need me.”", after: "Then give {Name} a quiet run at it.", tonight: ["At start time, clear away the noise.", "No check-ins once {Name} begins.", "Let the first stretch run unbroken."] },
    homework: { instead: "“How's the homework going? Need help?”", try: "“I'll leave you to it for half an hour.”", after: "Then clear the next half hour of check-ins.", tonight: ["Pick one task and guard half an hour.", "No check-ins, no snack runs, no questions.", "Let {Name} work right through, once."] },
    screens: { instead: "“Off now. Right now.”", try: "“Finish this one bit, then we stop together.”", after: "Then let {Name} reach a clean stopping point.", tonight: ["Agree one clear end before screens go on.", "Let {Name} reach it without being rushed.", "Give a warning, then stop together, calm."] },
    confidence: { instead: "“Come on, it's not that hard.”", try: "“Take your time. I won't hover.”", after: "Then give {Name} space to work it out.", tonight: ["When it feels hard, give {Name} room.", "Don't hover or jump in to help.", "Let {them} stay with it a while."] },
    giveup: { instead: "“Don't give up, keep going!”", try: "“Take a breath. No rush, no watching.”", after: "Then let {Name} choose to try again.", tonight: ["After a miss, take the pressure off.", "Give {Name} a quiet minute, no watching.", "Let the next try come from {them}."] },
    finish: { instead: "“Nearly there, don't stop now!”", try: "“Keep going. I'll stay out of your way.”", after: "Then keep the last stretch free of breaks.", tonight: ["Near the end, clear the interruptions.", "Let {Name} run to a natural finish.", "Don't call time before {they} {is} ready."] },
    other: { instead: "“Have you done it yet?”", try: "“I'll leave you to it. Shout if you're stuck.”", after: "Then give {Name} a quiet run.", tonight: ["At the start, clear the noise.", "No check-ins once {Name} begins.", "Let the first stretch run unbroken."] },
  },
  "The Inventor": {
    reminders: { instead: "“Start it the way I showed you.”", try: "“How you start this is up to you.”", after: "Then stay quiet and let {Name} begin {their} way.", tonight: ["At start time, let {Name} choose how.", "Say nothing about the right way.", "If {they} {s:stalls|stall}, ask where {they} {s:wants|want} to begin."] },
    homework: { instead: "“Here, let me show you the right way.”", try: "“Do it your way. Show me when you're done.”", after: "Then say nothing about how, and let it run.", tonight: ["Pick one task. Let {Name} choose how.", "Don't step in, even if you see faster.", "If {they} {s:gets|get} stuck, ask what {they} would try."] },
    screens: { instead: "“Off now, because I said so.”", try: "“You decide how to wrap up, then screen off.”", after: "Then let {Name} stop {their} own way.", tonight: ["At screen-off, let {Name} pick how to stop.", "Let {them} finish {their} own way first.", "Agree the stop, leave the how to {them}."] },
    confidence: { instead: "“Do it like this, it's easier.”", try: "“Try it your way first. I won't step in.”", after: "Then let {Name}'s own way run, even if slow.", tonight: ["When it feels hard, let {Name} try {their} way.", "Don't show the right way too soon.", "If stuck, ask what {they} would try next."] },
    giveup: { instead: "“That's wrong. Here, give it to me.”", try: "“What would you try next?”", after: "Then let {Name} run {their} own next move.", tonight: ["After a miss, don't take it over for {them}.", "Ask what {they} would try next.", "Let {Name}'s next idea play out."] },
    finish: { instead: "“Just finish it the normal way.”", try: "“Your way to the end. Show me when it's done.”", after: "Then leave the last bit to {Name}.", tonight: ["Near the end, keep it {Name}'s own way.", "Don't take over to speed it up.", "Let {them} finish how {they} started."] },
    other: { instead: "“Do it the way I told you.”", try: "“Your call how to do this one.”", after: "Then stay quiet and let {Name} run it.", tonight: ["At the start, let {Name} choose how.", "Don't step in with a faster way.", "If stuck, ask what {they} would try."] },
  },
  "The Explorer": {
    reminders: { instead: "“Focus. Just start, no side quests.”", try: "“Park any new idea here, then we start.”", after: "Then keep a scrap pad next to {Name}.", tonight: ["At start time, put a scrap pad beside {Name}.", "New ideas go on the pad for later.", "Start the task, then come back to one."] },
    homework: { instead: "“Stop getting distracted. Finish the page.”", try: "“If this sparks an idea, jot it. We'll come back.”", after: "Then keep a scrap pad next to the work.", tonight: ["Put a scrap pad next to the homework.", "{Name} jots side-ideas, then carries on.", "Come back to one idea together after."] },
    screens: { instead: "“Off now. Stop messing about.”", try: "“Write what you want next, then switch off.”", after: "Then park the next show on a list.", tonight: ["Before off, write what {Name} wants next time.", "Put it on a list, then turn off.", "Look at the list again tomorrow."] },
    confidence: { instead: "“Stop wandering and just try it.”", try: "“Find one way this links to what you like.”", after: "Then let {Name} start from that angle.", tonight: ["When it feels hard, find a link {Name} likes.", "Let {them} start from there.", "Park other ideas on the pad for later."] },
    giveup: { instead: "“Don't drift off. Try again.”", try: "“What's another way in?”", after: "Then let {Name} chase the new way.", tonight: ["After a miss, ask for a different way in.", "Let {Name} jot two to try.", "Let {them} pick one and go."] },
    finish: { instead: "“No wandering. Just finish it.”", try: "“Park that idea. Finish this, then chase it.”", after: "Then keep the idea on the pad till the end.", tonight: ["Near the end, park any new idea on the pad.", "Finish the task first.", "Then chase one parked idea together."] },
    other: { instead: "“Focus and get on with it.”", try: "“Park side-ideas here, then start.”", after: "Then keep a scrap pad next to {Name}.", tonight: ["At the start, put a scrap pad beside {Name}.", "Side-ideas go on the pad for later.", "Start, then come back to one."] },
  },
  "The Magnet": {
    reminders: { instead: "“Go and start it on your own.”", try: "“I'll sit here while you start.”", after: "Then do your own thing nearby, not checking.", tonight: ["At start time, sit near {Name}.", "Do your own thing. Don't manage.", "Stay for the first few minutes."] },
    homework: { instead: "“Go do your homework in your room.”", try: "“I've got work too. Shall we both sit at the table?”", after: "Then do your own thing. Don't check {their} work.", tonight: ["Sit at the table with something of your own.", "Don't help and don't check. Just be there.", "Notice how long {Name} keeps going."] },
    screens: { instead: "“Off now. Go do something else.”", try: "“Let's switch off and do the next thing together.”", after: "Then move to the next thing with {Name}.", tonight: ["At screen-off, start the next thing together.", "Do it side by side for a minute.", "Then let {them} carry on near you."] },
    confidence: { instead: "“You can do it. Off you go.”", try: "“Let's look at the first bit together.”", after: "Then stay near as {Name} takes it on.", tonight: ["When it feels hard, sit beside {Name}.", "Start the first bit together.", "Then let {them} carry on, you nearby."] },
    giveup: { instead: "“Don't quit. Try it again.”", try: "“Let's have one more go, together.”", after: "Then stay beside {Name} for the retry.", tonight: ["After a miss, sit beside {Name}.", "Offer one more go together.", "Let the next try happen with you there."] },
    finish: { instead: "“Finish it yourself. I'm busy.”", try: "“I'll sit with you to the end of this.”", after: "Then keep {Name} company to the finish.", tonight: ["Near the end, come sit with {Name}.", "Keep {them} company to the last bit.", "Notice the finish together."] },
    other: { instead: "“Off you go. Do it alone.”", try: "“I'll be right here while you start.”", after: "Then do your own thing nearby.", tonight: ["At the start, sit near {Name}.", "Be there, not managing.", "Stay for the first few minutes."] },
  },
  "The Glue": {
    reminders: { instead: "“Stop stalling and start.”", try: "“Quick chat first, then we start.”", after: "Then make the ask once the air feels clear.", tonight: ["Before start time, chat for two minutes.", "If something feels off, say it plainly.", "Then ask {Name} to begin, calm and small."] },
    homework: { instead: "“Sit down, it's homework time.”", try: "“Let's catch up for a minute first.”", after: "Then make the ask once things feel settled.", tonight: ["Chat for two minutes first, not about work.", "If something feels off, say it plainly.", "Then make the ask, calm and small."] },
    screens: { instead: "“Off now. No arguments.”", try: "“All okay? Two minutes, then we switch off.”", after: "Then switch off together once {Name} feels heard.", tonight: ["Before screen-off, check in with {Name}.", "Name anything that feels tense.", "Then switch off together, calm."] },
    confidence: { instead: "“It's fine. Just try it.”", try: "“Tell me what feels hard about it first.”", after: "Then start it together once {Name} feels heard.", tonight: ["When it feels hard, ask what's tricky.", "Listen first. Don't jump in yet.", "Then start the first bit together."] },
    giveup: { instead: "“Don't make a fuss. Try again.”", try: "“That was annoying, wasn't it? Let's go again.”", after: "Then start the retry once {Name} feels heard.", tonight: ["After a miss, name the feeling first.", "Don't rush straight to the retry.", "Then try again together, calm."] },
    finish: { instead: "“Stop moaning and finish it.”", try: "“Nearly there. Anything bugging you first?”", after: "Then help {Name} to the end once things settle.", tonight: ["Near the end, check how {Name} feels.", "Name anything that is off.", "Then finish the last bit together."] },
    other: { instead: "“Come on, just do it.”", try: "“Quick chat, then we start.”", after: "Then make the ask once {Name} feels heard.", tonight: ["At the start, chat for two minutes.", "Name anything that feels off.", "Then ask, calm and small."] },
  },
  "The Captain": {
    reminders: { instead: "“Start now, the way I said.”", try: "“You're in charge of how this starts.”", after: "Then step back and let {Name} run it.", tonight: ["At start time, hand {Name} the real call.", "Let {them} decide how to begin.", "Step back. Don't redo it."] },
    homework: { instead: "“Do it the way I told you.”", try: "“Your call. How do you want to run this?”", after: "Then step back and don't redo it.", tonight: ["Pick one task that's usually your call.", "Hand {Name} the real choice, not the order.", "Step back and let {them} run it."] },
    screens: { instead: "“Off now, because I said.”", try: "“You set the stop time. Then you own it.”", after: "Then hold {Name} to the rule {they} set.", tonight: ["Let {Name} set the screen-off time.", "Agree it out loud together.", "Then hold {them} to {their} own rule."] },
    confidence: { instead: "“Do it this way. It's right.”", try: "“You call how to take on the hard bit.”", after: "Then back the plan {Name} picks.", tonight: ["When it feels hard, hand {Name} the plan.", "Let {them} choose how to take it on.", "Back the call and step back."] },
    giveup: { instead: "“Listen to me and try again.”", try: "“How do you want to run the next go?”", after: "Then let {Name} lead the second try.", tonight: ["After a miss, hand {Name} the next move.", "Let {them} decide how to try again.", "Step back and let it run."] },
    finish: { instead: "“Finish it my way, quickly.”", try: "“You decide how to bring this home.”", after: "Then let {Name} run it to the end.", tonight: ["Near the end, let {Name} own the finish.", "Let {them} pick the last steps.", "Step back. Don't redo it."] },
    other: { instead: "“Do it how I told you.”", try: "“Your call on how to run this.”", after: "Then step back and let {Name} lead.", tonight: ["At the start, hand over the real call.", "Let {Name} decide how.", "Step back. Don't redo it."] },
  },
  "The Live Wire": {
    reminders: { instead: "“Start now, because I said.”", try: "“Beat the timer to get started?”", after: "Then let {Name} set the challenge and go.", tonight: ["Turn starting into a quick challenge.", "Let {Name} pick a target to beat.", "Start the moment the challenge is set."] },
    homework: { instead: "“Just do your homework because I said.”", try: "“Race the clock — can you start in two minutes?”", after: "Then let {Name} set the challenge and go.", tonight: ["Make the first step a quick challenge.", "Let {Name} pick the target.", "Go the moment the challenge is set."] },
    screens: { instead: "“Off now. I mean it.”", try: "“Off at 6:30. Then football or cycling, you pick.”", after: "Then hold 6:30 — the choice is what comes next.", tonight: ["Say it once: screens off at 6:30.", "Offer two things to do next — football or cycling.", "Notice: did screens go off without a second ask?"] },
    confidence: { instead: "“Just try. It's not a big thing.”", try: "“Think you can crack the first bit?”", after: "Then let {Name} set the challenge and go.", tonight: ["When it feels hard, make it a quick challenge.", "Let {Name} pick a target to beat.", "Start the moment the challenge is set."] },
    giveup: { instead: "“Don't quit. Keep trying.”", try: "“Best of three. Want to go again?”", after: "Then let {Name} set the next round.", tonight: ["After a miss, make the retry a quick game.", "Let {Name} set a target for round two.", "Go when {they} {is} ready."] },
    finish: { instead: "“Just finish it. Come on.”", try: "“Can you finish before the timer?”", after: "Then let {Name} set the clock and go.", tonight: ["Near the end, set a short timer to beat.", "Let {Name} pick the target time.", "Go when the timer starts."] },
    other: { instead: "“Just get on with it.”", try: "“Race the timer to get it done?”", after: "Then let {Name} set the challenge and go.", tonight: ["Turn it into a quick challenge.", "Let {Name} pick a target to beat.", "Start the moment the challenge is set."] },
  },
};

// v3 fallback copy uses the same EXPLICIT-agreement tokens as v3-copy.ts (see lib/report/
// pronouns.ts fillTokens). Verbs are explicit via {s:AAA|BBB}; no pluralizeThey munging.
function filler(name: string, gender: Gender) {
  return fillTokens(name, gender);
}

export function archetypeDesc(archetype: string, name: string, gender: Gender): string {
  const f = filler(name, gender);
  return f(ARCHETYPE_DESC[archetype] ?? "A distinct attention pattern worth working with.");
}

// Deterministic archetype × worry fallback, grounded in the Week 1 move at the worry's
// moment. Same inputs → identical content.
export function composeFallback(
  archetype: string,
  concernKey: string | null | undefined,
  name: string,
  gender: Gender,
): ReportV2Generated {
  const f = filler(name, gender);
  const worry = canonicalConcern(concernKey);
  const meta = ARCH_META[archetype] ?? ARCH_META_FALLBACK;
  const cell = (CELL[archetype] ?? CELL["The All-In Kid"])[worry];
  const nm = name.trim() ? displayChildName(name) : "Your child";
  return {
    // v3 shapes. seenIt: strength moment (per archetype), ONE sentence starting "When …".
    // hardPart: "{Name} isn’t X. {He}’s Y." (Y aligned to WHY_BOXES red line). whyParas/
    // shortGood/shortWhy/shortFix are OMITTED — card 2 is now fixed per archetype (WHY_BOXES).
    seenIt: f(meta.seenIt),
    hardPart: f(`${nm} isn’t ${HARD_X[worry]}. ${meta.hardY}`),
    switch: { instead: f(cell.instead), try: f(cell.try), after: f(cell.after) },
    // tonight's 3rd step is a "Notice:" check of the worry's outcome — the generic one per
    // worry, unless the cell authored its own Notice line (e.g. Live Wire × screens).
    tonight: [
      f(cell.tonight[0]),
      f(cell.tonight[1]),
      cell.tonight[2].startsWith("Notice:") ? f(cell.tonight[2]) : noticeFor(worry, name, gender),
    ],
  };
}
