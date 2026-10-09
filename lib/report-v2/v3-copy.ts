// Report v3 — FIXED copy for the 5-card report + one-page plan (?report=v3 / layout:"v3").
// Source of truth: aa-report-redesign-content.md. Every string here is transcribed VERBATIM
// from that spec. Tokens are preserved for the render-site filler:
//   {Name}  child display name
//   {he} {him} {his} {himself} / {He} {His}  pronoun-filled (unset gender → singular they,
//                                             with PLURAL verbs via pluralizeThey + THEY_VERB)
//   {Type}  archetype name WITHOUT "The"
//   {band}  age band
//
// CONVENTION: the new tables below are keyed by the BARE archetype name ("Storm", "Explorer",
// …), matching the spec's WHY_BOXES / NEED / REASON. The stored content.archetype uses the
// FULL name ("The Storm"). Use `bareArchetype()` to map the stored value to these keys.

// ── archetype key helper ───────────────────────────────────────────────────────
// Stored content.archetype is "The Storm"; these tables key on "Storm". Strip a leading "The ".
export function bareArchetype(archetype: string): string {
  return archetype.replace(/^The\s+/i, "").trim();
}

export const BARE_ARCHETYPES = [
  "Storm", "Explorer", "Captain", "Inventor", "All-In Kid", "Live Wire", "Magnet", "Glue",
] as const;
export type BareArchetype = (typeof BARE_ARCHETYPES)[number];

// ════════════════════════════════════════════════════════════════════════════════
// CARD 1 — What's happening (§15–33)
// ════════════════════════════════════════════════════════════════════════════════

// Progress / read time (§16)
export const CARD1_PROGRESS = "1 of 5";
export const CARD_READ_TIME = "2 min read";

// Intro box (§17). Markdown bold is intentional (**{Name}'s attention report**).
export const INTRO_BOX =
  "This is **{Name}'s attention report**, made from the answers you gave us. It explains what's going on, and what you can do about it.";

// Eyebrow (§18). Headline is the existing CARD1_HEADLINE (per worry), not re-declared here.
export const CARD1_EYEBROW = "YOUR WORRY";

// Box (§19–22)
export const CARD1_BOX_LABEL = "WHAT'S HAPPENING AT HOME";
// ✓ line = AI seenIt. ! line = WORRY_LINE[worry] (below).
export const CARD1_BOX_CLOSING =
  "{Name} is not being difficult on purpose. And you are not doing anything wrong."; // bold
// Under box (§24)
export const CARD1_UNDER_BOX =
  "There is a clear reason it happens. Once you see it, it is much easier to change.";
// Buttons (§25)
export const CARD1_BTN_WHY = "Why does this happen? →";
export const CARD1_BTN_SKIP = "Skip to the 6-week program";

// WORRY_LINE (§26–33) — the "!" line, per worry.
export const WORRY_LINE: Record<string, string> = {
  homework:   "When it's homework time, getting {him} to sit down turns into a fight.",
  reminders:  "You have to remind {him} again and again before {he} {s:starts|start}.",
  screens:    "When you say \"Screens off now\", {he} {s:argues|argue}, {s:sulks|sulk}, or {s:asks|ask} for five more minutes.",
  confidence: "{He} {s:says|say} \"I can't\" or {s:asks|ask} for help before trying the hard part.",
  giveup:     "When the first try doesn't work, {he} {s:stops|stop} and {s:walks|walk} away.",
  finish:     "{He} {s:starts|start} things well but {s:leaves|leave} them halfway.",
  other:      "Getting {him} to start and keep going takes a lot of pushing from you.",
};

// ════════════════════════════════════════════════════════════════════════════════
// CARD 2 — Why it happens (§35–49)
// ════════════════════════════════════════════════════════════════════════════════

export const CARD2_EYEBROW = "WHY IT HAPPENS"; // headline is existing CARD2_HEADLINE (per archetype)
export const CARD2_BTN = "How do you know? →";

// WHY_BOXES (§42–49). Per archetype: green {label,line}, red {label,line}. Keyed BARE.
export type WhyBox = { greenLabel: string; greenLine: string; redLabel: string; redLine: string };
export const WHY_BOXES: Record<string, WhyBox> = {
  "Storm": {
    greenLabel: "WHEN {HE} {S:CHOOSES|CHOOSE}", greenLine: "{He}{'s} calm and focused.",
    redLabel: "WHEN YOU DECIDE FOR {HIM}", redLine: "It feels like losing, so {he} {s:pushes|push} back.",
  },
  "Explorer": {
    greenLabel: "WHEN {HE} CAN FOLLOW AN IDEA", greenLine: "{He} {s:stays|stay} with the work longer.",
    redLabel: "WHEN EVERY SIDE-IDEA IS STOPPED", redLine: "{He} {s:drifts|drift} off completely.",
  },
  "Captain": {
    greenLabel: "WHEN IT'S {HISOWN} TO RUN", greenLine: "{He} {s:takes|take} charge and {s:finishes|finish}.",
    redLabel: "WHEN {HE}{'S} HANDED INSTRUCTIONS", redLine: "{His} drive switches off.",
  },
  "Inventor": {
    greenLabel: "WHEN {HE} {S:DOES|DO} IT {HIS} WAY", greenLine: "{He} {s:stays|stay} with it, even if it's messy.",
    redLabel: "WHEN {HIS} WAY GETS CORRECTED", redLine: "{He} {s:loses|lose} interest fast.",
  },
  "All-In Kid": {
    greenLabel: "WHEN {HE} {S:GETS|GET} TO GO DEEP", greenLine: "{He} {s:focuses|focus} for a long time.",
    redLabel: "WHEN {HE}{'S} PULLED OUT MIDWAY", redLine: "It's hard for {him} to get back in.",
  },
  "Live Wire": {
    greenLabel: "WHEN SOMETHING IS HAPPENING NOW", greenLine: "{He} {s:locks|lock} in.",
    redLabel: "WHEN NOTHING IS HAPPENING", redLine: "{His} attention wanders off.",
  },
  "Magnet": {
    greenLabel: "WHEN SOMEONE IS NEARBY", greenLine: "{He} {s:stays|stay} with it longer.",
    redLabel: "WHEN {HE}{'S} LEFT ALONE", redLine: "{His} focus fades.",
  },
  "Glue": {
    greenLabel: "WHEN HOME FEELS CALM", greenLine: "{He} can settle and focus.",
    redLabel: "WHEN THERE'S TENSION", redLine: "{His} focus drops, even on easy things.",
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// CARD 3 — How we know (§51–81)
// ════════════════════════════════════════════════════════════════════════════════

export const CARD3_EYEBROW = "HOW WE KNOW";
export const CARD3_HEADLINE = "It's in your own answers.";
export const CARD3_BOX_LABEL = "YOU TOLD US";
// Box closing (§54), bold. {NEED} = NEED[archetype] filled. The leading count word MUST match
// the number of evidence answers actually rendered on the card — "Three" when 3 are shown,
// "Two" when 2 are shown (see evidence.ts selection rule). Call card3BoxClosing(count) to build
// it; the {Count} token is filled from the count, the rest is filled by the pronoun filler.
export const CARD3_BOX_CLOSING =
  "{Count} different answers. One clear message: {Name} needs {NEED}.";
export function card3BoxClosing(count: number): string {
  const word = count === 2 ? "Two" : "Three";
  return CARD3_BOX_CLOSING.replace("{Count}", word);
}
// Small note (§55). {Type} = archetype name without "The". The first ARCHETYPE_STRENGTHS line
// is appended at the render site (strengthsFor(archetype)[0]).
export const CARD3_NOTE =
  "We call children like {Name} \"{Type}s\". It's one of 8 ways children pay attention.";
export const CARD3_BTN = "What can I do tonight? →";

// NEED (§58) — keyed BARE. Filled into CARD3_BOX_CLOSING's {NEED}.
export const NEED: Record<string, string> = {
  "Storm":      "a real say",
  "Explorer":   "room to follow ideas",
  "Captain":    "something that's truly {hisown} to run",
  "Inventor":   "room to do things {his} own way",
  "All-In Kid": "time to go deep",
  "Live Wire":  "something happening right now",
  "Magnet":     "someone nearby",
  "Glue":       "calm and connection first",
};

// PLAIN_ANSWER (§60–81): questionId → optionValue → sentence. The 3 evidence picks map their
// chosen option VALUE through here for card 3's "YOU TOLD US" lines. Option values verified
// against lib/engine/questions.ts — all match; no mismatches. G3/P1/P2 (parent_instinct) are
// never shown, so they have no entries.
export const PLAIN_ANSWER: Record<string, Record<string, string>> = {
  "G1": {
    "narrow-deep":        "{He} {s:focuses|focus} best when {he} can go deep into one thing.",
    "wide-shifting":      "{He} {s:focuses|focus} best moving between a few related things.",
    "social-anchored":    "{He} {s:focuses|focus} best with people around, even quietly.",
    "sensation-seeking":  "{He} {s:focuses|focus} best on whatever feels exciting.",
  },
  "G2": {
    "novelty":   "A new idea in {his} head is what pulls {him} away first.",
    "external":  "Noise or movement nearby pulls {him} away first.",
    "internal":  "Feeling bored or frustrated pulls {him} away first.",
    "social":    "People pull {him} away first, to connect or to escape tension.",
  },
  "D1.1": {
    "narrow-deep":       "When {he}{'s} absorbed, {he} {s:goes|go} deeper and deeper into one thing.",
    "wide-shifting":     "When {he}{'s} absorbed, {he} {s:moves|move} easily between 2 or 3 things.",
    "social-anchored":   "When {he}{'s} absorbed, {he}{'s} usually doing something with others.",
    "sensation-seeking": "When {he}{'s} absorbed, {he}{'s} chasing whatever feels most exciting.",
  },
  "D1.2": {
    "narrow-deep":       "With a big project, {he}'d disappear into it and lose track of time.",
    "wide-shifting":     "With a big project, {he}'d start strong, then drift off.",
    "social-anchored":   "With a big project, {he}'d want to do it with someone.",
    "sensation-seeking": "With a big project, {he}'d start if it felt exciting, then need a reason to continue.",
  },
  "D2.1": {
    "mastery":  "{He} {s:lights|light} up when {he} {s:cracks|crack} something really hard.",
    "novelty":  "{He} {s:lights|light} up when {he} {s:discovers|discover} something new.",
    "social":   "{He} {s:lights|light} up when people notice {him} or include {him}.",
    "autonomy": "{He} {s:lights|light} up when {he} {is} in charge of what {he} {s:does|do}.",
  },
  "D2.2": {
    "mastery":  "After something hard, {he} {s:cares|care} most that {he} got better.",
    "novelty":  "After something hard, {he} {s:wants|want} the next interesting thing.",
    "social":   "After something hard, {he} {s:wants|want} someone to be proud of {him}.",
    "autonomy": "After something hard, {he} {s:cares|care} most that {he} did it {his} way.",
  },
  "D2.3": {
    "mastery":  "{He} {s:loses|lose} interest when things stop being challenging.",
    "novelty":  "{He} {s:loses|lose} interest when something newer comes along.",
    "social":   "{He} {s:loses|lose} interest when the people part changes.",
    "autonomy": "{He} {s:loses|lose} interest when {he} {s:feels|feel} controlled.",
  },
  "D2.confirm": {
    "mastery":  "{He} {s:sticks|stick} with things because {he} {s:keeps|keep} getting better.",
    "novelty":  "{He} {s:sticks|stick} with things that stay fresh.",
    "social":   "{He} {s:sticks|stick} with things {he} {s:does|do} with people {he} {s:cares|care} about.",
    "autonomy": "{He} {s:sticks|stick} with things that feel like {his} own choice.",
  },
  "D3.1": {
    "avoid":            "When something is hard, {he} {s:goes|go} quiet and {s:avoids|avoid} it.",
    "solo-push":        "When something is hard, {he} {s:pushes|push} through alone.",
    "support-seek":     "When something is hard, {he} {s:looks|look} for someone to help.",
    "emotional-derail": "When something is hard, {he} {s:gets|get} upset before even starting.",
  },
  "D3.2": {
    "avoid":        "Hard things drain {him}.",
    "solo-push":    "Some hard things energise {him}, others don't.",
    "support-seek": "Hard things are easier for {him} with someone there.",
    "energized":    "{He} {s:enjoys|enjoy} a real challenge.",
  },
  "D3.3": {
    "avoid":            "After a failure, {he} {s:needs|need} space before trying again.",
    "solo-push":        "After a failure, {he} {s:tries|try} again on {his} own terms.",
    "support-seek":     "After a failure, {he} {s:needs|need} someone to sit with {him}.",
    "emotional-derail": "After a failure, {he} {s:needs|need} a reason to believe it's possible.",
  },
  "D3.confirm": {
    "solo-push":    "{He} {s:pushes|push} through hard things alone.",
    "support-seek": "{He} {s:looks|look} for help or company when things are hard.",
    "avoid":        "{He} {s:pulls|pull} back when things are hard.",
    "energized":    "How {he} {s:handles|handle} hard things depends on the day.",
  },
  "D5.1": {
    "boredom-avoidance": "Screens usually fill time when nothing else is pulling {him}.",
    "task-escape":       "Screens are often an escape from something harder.",
    "social":            "Screens give {him} time with friends {he} can't get otherwise.",
    "genuine-interest":  "{He} {is} genuinely excited about a game or show.",
  },
  "D5.2": {
    "boredom-avoidance": "Screens give {him} quick, constant feedback.",
    "task-escape":       "Screens give {him} a break when things feel hard.",
    "social":            "Screens let {him} connect with friends on {his} terms.",
    "genuine-interest":  "Screens give {him} something new every time.",
  },
  "R1": {
    "autonomous": "When interrupted, {he} {s:goes|go} back to the task on {his} own.",
    "responsive": "When interrupted, {he} {s:goes|go} back after one reminder.",
    "dependent":  "When interrupted, {he} {s:needs|need} help finding where {he} {s:was|were}.",
    "stopped":    "When interrupted, {he} usually {doesn't} go back.",
  },
  "R2": {
    "autonomous": "After a break, {he}{'s} back into it almost straight away.",
    "responsive": "After a break, {he} {s:takes|take} a few minutes to get back in.",
    "dependent":  "After a break, {he} {s:takes|take} a while to settle again.",
    "stopped":    "After a break, {he} {doesn't} really get back into it.",
  },
  "R3": {
    "autonomous": "Going back to a task is almost always {his} idea.",
    "responsive": "Going back to a task is sometimes {his} idea, sometimes yours.",
    "dependent":  "Going back to a task is usually your idea.",
    "stopped":    "{He} only {s:goes|go} back to a task if you sit with {him}.",
  },
  "D6.1": {
    "sensory-quiet":           "After a hard day, {he} {s:needs|need} quiet time alone.",
    "social-connection":       "After a hard day, {he} {s:needs|need} time with people {he} {s:trusts|trust}.",
    "cognitive-displacement":  "After a hard day, {he} {s:needs|need} something absorbing.",
    "autonomous-unstructured": "After a hard day, {he} {s:needs|need} control of {his} own time.",
  },
  "D6.2": {
    "sensory-quiet":           "Noise and crowds drain {him} fastest.",
    "social-connection":       "Being alone too long drains {him} fastest.",
    "cognitive-displacement":  "Doing the same boring thing drains {him} fastest.",
    "autonomous-unstructured": "Being told what to do, again and again, drains {him} fastest.",
  },
  "D6.3": {
    "sensory-quiet":           "{His} best rest is quiet, calm time.",
    "social-connection":       "{His} best rest is relaxed time with family or friends.",
    "cognitive-displacement":  "{His} best rest is a show, a game or a book.",
    "autonomous-unstructured": "{His} best rest is free time with no plans.",
  },
  "D6.confirm": {
    "sensory-quiet":           "Quiet recharges {him} fastest.",
    "social-connection":       "Time with people recharges {him} fastest.",
    "cognitive-displacement":  "Something absorbing recharges {him} fastest.",
    "autonomous-unstructured": "Freedom from plans recharges {him} fastest.",
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// CARD 4 — Try this tonight (§83–88)
// ════════════════════════════════════════════════════════════════════════════════

export const CARD4_EYEBROW = "TRY THIS TONIGHT · FREE";
export const CARD4_HEADLINE = "Change one sentence.";
export const CARD4_INSTEAD_LABEL = "INSTEAD OF"; // struck through; value = AI switch.instead
export const CARD4_SAY_LABEL = "SAY";            // value = AI switch.try
export const CARD4_HOW_LABEL = "HOW TO DO IT · 5 MINUTES"; // steps 1-2 = AI tonight[0..1], step 3 = WORRY_NOTICE
export const CARD4_UNDER =
  "It may not work perfectly the first time. That's normal. One evening shows you the idea. Making it stick takes a few weeks.";
export const CARD4_BTN = "How do I make it stick? →";

// ════════════════════════════════════════════════════════════════════════════════
// CARD 5 — The program is for you (§90–96)
// ════════════════════════════════════════════════════════════════════════════════

export const CARD5_EYEBROW = "THE 6-WEEK PROGRAM";
export const CARD5_HEADLINE = "A program for you, the parent.";
export const CARD5_SUB =
  "No lessons for {Name}. Each day, you try one small change in how you talk or plan with {him}.";

export const CARD5_HOW_LABEL = "HOW IT WORKS";
// Shared 4 "how it works" steps + the Coach line (§93, §107). Markdown bold preserved.
export const HOW_IT_WORKS_STEPS: [string, string, string, string] = [
  "**Every day**, open today's step on your phone.",
  "Read one small thing to try. **About 5 minutes.**",
  "Try it with {Name} at home that day.",
  "Tap how it went. The next step builds on it.",
];
export const HOW_IT_WORKS_COACH =
  "**Stuck?** Ask the Attention Coach any time. It knows {Name}'s plan and answers in your language.";

export const CARD5_GOAL_LABEL = "WHAT WE WORK TOWARD"; // + CONCERN_GOAL (existing, or override)
export const CARD5_GOAL_SMALL =
  "Every child is different, so we can't promise results. We can give you a clear plan and help at every step.";
export const CARD5_BTN_PLAN = "See {Name}'s 6-week plan and price →";
export const CARD5_BTN_CALL = "Talk to us first (15 min, free)"; // existing Calendly link
export const CARD5_PICK_ANOTHER = "Pick another goal"; // small link under the goal

// ════════════════════════════════════════════════════════════════════════════════
// PLAN PAGE — one scrolling page (§100–132)
// ════════════════════════════════════════════════════════════════════════════════

// Sticky bottom bar on mobile (§102)
export const PLAN_STICKY_LABEL = "{Name}'s plan · from ₹2,999";
export const PLAN_STICKY_BTN = "Start now"; // scrolls to price

// 1. Hero (§104). H1 = CONCERN_GOAL (existing, not re-declared).
export const PLAN_HERO_EYEBROW = "{NAME}'S 6-WEEK PLAN";
export const PLAN_HERO_SUB =
  "A step-by-step plan for **you, the parent**. Made from your answers about {Name}. 5 minutes a day, on your phone.";
// {article} is computed at the render site with articleFor({Type}) → "a Storm" / "an Explorer" /
// "an All-In Kid" / "an Inventor" / "a Live Wire" / "a Magnet" / "a Glue" / "a Captain".
export const PLAN_HERO_CHIPS: [string, string] = [
  "Written for {article} {Type}, age {band}",
  "7-day full refund",
];
export const PLAN_HERO_BTN = "Start {Name}'s plan · from ₹2,999"; // → #price

// 2. What we work toward (§105)
export const PLAN_WORK_TOWARD_LABEL = "WHAT WE WORK TOWARD";
export const PLAN_WORK_TOWARD_NOW_HEAD = "NOW";
export const PLAN_WORK_TOWARD_AFTER_HEAD = "AFTER 6 WEEKS";
export const PLAN_WORK_TOWARD_SMALL =
  "Every child is different, so we can't promise results. This is what the plan is built to move toward.";

// NOW_AFTER (§124–130) — keyed by worry, 3 NOW lines + 3 AFTER lines.
export type NowAfter = { now: [string, string, string]; after: [string, string, string] };
export const NOW_AFTER: Record<string, NowAfter> = {
  homework: {
    now:   ["Homework starts with an argument.", "You sit beside {him} to keep {him} going.", "Evenings feel tense."],
    after: ["{He} {s:sits|sit} down with less pushing.", "You step back a little more each week.", "Calmer evenings."],
  },
  reminders: {
    now:   ["You remind, then remind again.", "{He} {s:starts|start} only when you push.", "You feel like you're chasing {him}."],
    after: ["One reminder, then fewer.", "{He} {s:gets|get} going on {his} own more days.", "You stop chasing."],
  },
  screens: {
    now:   ["You say \"screens off\". {He} {s:argues|argue}.", "You remind, again and again.", "Evenings end tense."],
    after: ["{He} {s:picks|pick} the stop time.", "You point to it. That's all.", "Fewer fights, fewer reminders."],
  },
  confidence: {
    now:   ["{He} {s:says|say} \"I can't\" before trying.", "{He} {s:asks|ask} for help straight away.", "You end up doing it for {him}."],
    after: ["{He} {s:tries|try} the first hard bit.", "{He} {s:asks|ask} less and {s:tries|try} more.", "You watch instead of stepping in."],
  },
  giveup: {
    now:   ["{He} {s:stops|stop} after one try.", "A mistake ends the session.", "You coax {him} back."],
    after: ["{He} {s:has|have} a second go.", "A mistake is not the end.", "{He} {s:comes|come} back on {his} own more often."],
  },
  finish: {
    now:   ["{He} {s:starts|start} well, {s:stops|stop} halfway.", "Half-done things pile up.", "You push to get it finished."],
    after: ["{He} {s:gets|get} through the dull middle.", "More things get finished.", "{He} {s:sees|see} things through with less help."],
  },
  other: {
    now:   ["Getting started takes a push.", "Focus breaks easily.", "You do a lot of reminding."],
    after: ["{He} {s:starts|start} with less pushing.", "{He} {s:stays|stay} with it longer.", "You remind less."],
  },
};

// 3. Why this plan fits {Name} (§106). {REASON} = REASON[archetype] filled.
export const PLAN_WHY_FITS_LABEL = "WHY THIS PLAN FITS {NAME}";
export const PLAN_WHY_FITS_BODY =
  "{Name} {REASON}. The plan is built around that, one small step at a time.";
export const PLAN_WHY_FITS_SMALL =
  "A generic parenting course can't do this. Every step is chosen for how {Name} pays attention, and for {his} age.";

// REASON (§132) — keyed BARE. Filled into PLAN_WHY_FITS_BODY's {REASON}.
export const REASON: Record<string, string> = {
  "Storm":      "pushes back when things are decided for {him}",
  "Explorer":   "focuses best when {he} can follow a related idea",
  "Captain":    "steps up when something is truly {hisown} to run",
  "Inventor":   "stays with things when {he} can do them {his} own way",
  "All-In Kid": "focuses deeply when {he} {isn't} pulled out midway",
  "Live Wire":  "locks in when something is happening right now",
  "Magnet":     "stays focused longer with someone nearby",
  "Glue":       "focuses when home feels calm and connected",
};

// 4. How it works (§107) — same 4 steps + Coach line as Card 5 (HOW_IT_WORKS_STEPS / _COACH).
export const PLAN_HOW_LABEL = "HOW IT WORKS";

// 5. The six weeks (§108). Rows = WEEK_TITLES (shared with LMS) + WEEK_OUTCOMES[worry].
export const PLAN_SIX_WEEKS_LABEL = "THE SIX WEEKS";
export const PLAN_SIX_WEEKS_SUB =
  "Every family follows the same six weeks. What you say and do each day is written for {Name}.";

// 6. Try Day 1 free (§109). Body = LMS Week 1 Day 1 for this archetype × band, verbatim.
export const PLAN_DAY1_LABEL = "TRY DAY 1 FREE, RIGHT NOW";
export const PLAN_DAY1_TITLE = "Just watch.";
export const PLAN_DAY1_CLOSING =
  "That's Day 1. Every step after it builds on the one before.";

// 7. What parents say (§110). All 8 testimonials verbatim from TESTIMONIAL_POOL.
export const PLAN_TESTIMONIALS_LABEL = "WHAT PARENTS SAY";

// 8. Price (§111–115)
export const PRICE_INCLUDE_LABEL = "Both plans include";
export const PRICE_INCLUDES: [string, string, string, string] = [
  "A step for every day for 6 weeks, written for {Name}",
  "The exact words to say, so you never have to guess",
  "Attention Coach any time, in English, Hindi or Hinglish",
  "Track each day; the next steps build on what happened",
];

// Tier 2 card (navy, badge "MOST HELP") — §112
export const PRICE_TIER2 = {
  badge: "MOST HELP",
  title: "Plan + 3 calls with our Chief Attention Architect",
  price: "₹4,999",
  body: "Three 1-to-1 video calls across the six weeks. We see how {Name} is responding and change the plan with you.",
  perDay: "One time · about ₹119 a day",
  button: "Start with calls →",
} as const;

// Tier 1 card — §113
export const PRICE_TIER1 = {
  title: "The plan on its own",
  price: "₹2,999",
  body: "Add calls later for ₹2,000.",
  perDay: "One time · about ₹71 a day",
  button: "Start the plan",
} as const;

// Strikethrough compare-at prices (§114) — gated behind SHOW_COMPARE_AT (see flags.ts).
export const PRICE_COMPARE_AT = { tier1: "₹4,999", tier2: "₹7,999" } as const;

// Badges (§115)
export const PRICE_BADGES: [string, string, string] = [
  "7-day refund · Full money back",
  "Keep the report · It's yours either way",
  "UPI & cards · Secure, via Razorpay",
];

// 9. Questions parents ask (§116–120) — 4 accordions.
export const PLAN_FAQ_LABEL = "QUESTIONS PARENTS ASK";
export const PLAN_FAQ: { q: string; a: string }[] = [
  {
    q: "I'm busy. Do I have the time?",
    a: "About 5 minutes a day. Most steps happen during things you already do, like screen time or homework.",
  },
  {
    q: "What if it doesn't work for {Name}?",
    a: "Ask the Coach any time, or book the calls. If it isn't right for you, get a full refund within 7 days.",
  },
  {
    q: "How do I get it after paying?",
    a: "You get an email with a link to set your password. Then open the plan on your phone, any time.",
  },
  {
    q: "Is this a medical test or therapy?",
    a: "No. It's a guide for parents, not a diagnosis or treatment.",
  },
];

// 10. Close (§121)
export const PLAN_CLOSE_HEADLINE = "Start tonight. One small step at a time.";
export const PLAN_CLOSE_BTN_PLAN = "Start {Name}'s plan";
export const PLAN_CLOSE_BTN_CALL = "Not sure? Book a free 15-min call";
