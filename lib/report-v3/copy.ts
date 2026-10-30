// Report + Roadmap v3 — the single approved copy bank. Word-for-word per the approved spec.
// Tokens: {Name}/{he}/{his}/{him}/{himself}/{s:X|Y} filled by lib/report/pronouns.fillTokens;
// {NAME} → upper-case name, {band} → age band (filled by fillV3). NO pattern names appear here —
// archetype only keys the map; the parent never sees "Storm"/"Captain"/etc.
import { fillTokens, type Gender } from "@/lib/report/pronouns";
import { PRICE_TIER1, PRICE_TIER2 } from "@/lib/report-v2/v3-copy";

export type ArchetypeKey = "storm" | "explorer" | "captain" | "inventor" | "all_in" | "live_wire" | "magnet" | "glue";
export type WorryKey = "homework" | "reminders" | "screens" | "confidence" | "giveup" | "finish" | "other";

// Stored archetype is the display name; map to the internal key (never shown to parents).
export const ARCHETYPE_KEY: Record<string, ArchetypeKey> = {
  "The Storm": "storm", "The Explorer": "explorer", "The Captain": "captain", "The Inventor": "inventor",
  "The All-In Kid": "all_in", "The Live Wire": "live_wire", "The Magnet": "magnet", "The Glue": "glue",
};
export const ARCHETYPE_KEYS: ArchetypeKey[] = ["storm", "explorer", "captain", "inventor", "all_in", "live_wire", "magnet", "glue"];
export const WORRY_KEYS: WorryKey[] = ["homework", "reminders", "screens", "confidence", "giveup", "finish", "other"];

// Card 2 — "focuses best when <PATTERN_LINE>", STRENGTH, PULL.
export const PATTERN_LINE: Record<ArchetypeKey, string> = {
  storm: "{he} has a real say in what happens",
  explorer: "{he} has room to follow {his} own ideas",
  captain: "something is truly {his} to run",
  inventor: "{he} can do things {his} own way",
  all_in: "{he} has time to go deep into one thing",
  live_wire: "something is happening right now",
  magnet: "someone is nearby",
  glue: "things feel calm and connected first",
};
export const STRENGTH: Record<ArchetypeKey, string> = {
  storm: "Full of energy, and quick to act when {he}'s in charge",
  explorer: "Curious, and quick to connect ideas",
  captain: "Takes charge and keeps others going",
  inventor: "Thinks for {himself} and finds {his} own way through",
  all_in: "Goes deep and stays with what {he} loves",
  live_wire: "Lights up fast and brings energy to anything new",
  magnet: "Warm, and does {his} best work alongside someone",
  glue: "Reads people well and keeps everyone together",
};
export const PULL: Record<ArchetypeKey, string> = {
  storm: "Anything fast and exciting, especially screens",
  explorer: "The next new idea, before this one is done",
  captain: "Tasks where someone else is calling the shots",
  inventor: "{His} own plans, when the task is someone else's",
  all_in: "Whatever {he}'s already deep into",
  live_wire: "Whatever is happening around {him} right now",
  magnet: "Whoever is nearby, and what they're doing",
  glue: "Any tension or upset in the room",
};

// Card 2 — GETS STUCK, by worry (other/legacy reuse the generic line).
export const STUCK: Record<WorryKey, string> = {
  homework: "Starting homework when it isn't {his} choice",
  reminders: "Getting going without being reminded again and again",
  screens: "Switching off a screen and moving on",
  confidence: "Trying when {he}'s not sure {he}'ll get it right",
  giveup: "Staying with it after the first mistake",
  finish: "Carrying things through to the end",
  other: "Staying with tasks that aren't {his} choice",
};

// Card 4 — TODAY → WHAT WE WORK TOWARD, 4 rows by worry. other/legacy use the reminders rows.
export const TODAY_TOWARD: Record<WorryKey, [string, string][]> = {
  homework: [
    ["Homework starts after a battle", "Starts after one calm cue"],
    ["Ten minutes of work takes an hour", "Works in short, steady stretches"],
    ["Drifts the moment it gets hard", "Stays with the hard part a little longer"],
    ["You sit beside {him} the whole time", "You step back, {he} keeps going"],
  ],
  reminders: [
    ["Five reminders before {he} starts", "Starts after one calm cue"],
    ["Stops the moment you look away", "Keeps going a little longer on {his} own"],
    ["Every task needs a push from you", "Knows what's next without being told"],
    ["Evenings end with raised voices", "Fewer reminders, calmer evenings"],
  ],
  screens: [
    ["Screen-off ends in a fight", "Stops at the time you agreed"],
    ["“Five more minutes” every time", "One warning, then a clean stop"],
    ["Restless the moment the screen goes off", "Settles into something slower"],
    ["Screens fill every free moment", "Chooses something else, some of the time"],
  ],
  confidence: [
    ["Won't try unless sure of the answer", "Has a go, even when unsure"],
    ["One wrong answer ruins the evening", "Takes a mistake in stride"],
    ["Waits for you to check every step", "Checks {his} own work first"],
    ["“I can't do it”", "“Let me try”"],
  ],
  giveup: [
    ["One mistake and {he} quits", "Comes back after a slip"],
    ["Hard parts mean walking away", "Stays with the hard part a little longer"],
    ["Waits for you to rescue {him}", "Tries one more way before asking"],
    ["Gives up before really starting", "Gives it a real go first"],
  ],
  finish: [
    ["Starts five things, finishes none", "Finishes one thing before the next"],
    ["Loses interest halfway", "Gets through the boring middle part"],
    ["Leaves it at almost done", "Takes it all the way to done"],
    ["New ideas pull {him} off track", "Parks the new idea, finishes this one"],
  ],
  other: [], // filled below to mirror reminders
};
TODAY_TOWARD.other = TODAY_TOWARD.reminders;

// ── Cards (static copy; {Name}/{he}/{band} filled per child) ──────────────────────────────────────
export const CARD1 = {
  kicker: "{NAME}'S ATTENTION PLAN · AGE {band}",
  headline: "AI will have every answer. {Name}'s edge will be {his} attention.",
  body: "Not marks. Not how much {he} knows. Whether {he} can stay with the hard part when it's easier not to. That's a skill, and the next six weeks build it.",
  button: "See what {Name}'s answers showed →",
};
export const CARD2 = {
  kicker: "WHAT {NAME}'S ANSWERS SHOWED",
  patternPrefix: "{Name} focuses best when ",       // + PATTERN_LINE + "."
  rows: { strength: "STRENGTH", stuck: "GETS STUCK", pull: "PULLS AWAY" },
  footnote: "From your answers in the check. This is a pattern, not a label.",
};
export const CARD3 = {
  kicker: "WHY THIS MATTERS MORE EVERY YEAR",
  rows: [
    ["AI gives the answer.", "Thinking it through stays {his} job, and that takes attention."],
    ["Every app is built to pull {him} away.", "Adults now switch screens about every 47 seconds."],
    ["School, exams, sport, music.", "All of them reward staying with one thing."],
  ],
  source: "47 seconds: research by Gloria Mark, UC Irvine",
};
export const CARD4 = {
  kicker: "IN SIX WEEKS, WHAT WE WORK TOWARD",
  headline: "From you holding {his} attention, to {him} holding it.",
  colToday: "TODAY", colToward: "WHAT WE WORK TOWARD",
  footnote: "Every child moves at their own pace. You'll see {Name}'s in your Sunday summary.",
};
export const CARD5 = {
  kicker: "TRY THIS TONIGHT · FREE",
  headlinePrefix: "One step, at ",                  // + <moment> + "."
  notePrefix: "Notice: ",
  buttons: { worked: "Worked", partly: "Partly", didnt: "Didn't work" },
  after: {
    worked: "That's the skill starting. The plan builds on it, one step a day.",
    partly: "That's a real start. Week 1 works out what makes the difference for {Name}.",
    didnt: "That's useful too. It shows where {Name} needs a different way in, and that's exactly what Week 1 works out.",
  },
};
export const CARD6 = {
  kicker: "EVERY DAY · ABOUT 5 MINUTES",
  headline: "One small step, at a moment that already happens.",
  loop: [
    ["Your step arrives", "Fitted to a moment in your day."],
    ["You say the exact words", "Written for {Name}'s age and pattern."],
    ["Tap how it went", "Worked · Partly · Didn't work."],
    ["Tomorrow adjusts", "Smaller, different, or a step further, based on what happened."],
  ],
  chatLabel: "Example conversation with the Attention Coach, in Hindi or English",
  chat: [
    ["P", "He threw the tablet and walked off 😞"],
    ["C", "That's useful to know. What was on the screen just before you spoke?"],
    ["P", "He was about to finish a level"],
    ["C", "That explains a lot. Tomorrow, try the warning before a new level starts. I've updated your step."],
  ],
  button: "See {Name}'s six-week plan ↓",
};

// ── Scroll ──
export const LADDER = ["Understand", "Environment", "Focus", "Impulse", "Distractions", "Regulation"];
export const LADDER_START_NOTE = "Starts tonight"; // on rung 1

export const WEEKS: { n: number; title: string; line: string; gain: string }[] = [
  { n: 1, title: "Understanding Attention", line: "What pulls {Name} away, and what helps {him} start", gain: "You stop guessing, and the push starts to drop" },
  { n: 2, title: "Build the Attention Environment", line: "Small changes at home that make starting easier", gain: "Fewer reminders, fewer battles" },
  { n: 3, title: "Building Focus", line: "Staying with the hard part on an ordinary day", gain: "The thing AI can't do for {him}" },
  { n: 4, title: "Impulse & Transition Control", line: "Stopping, switching and coming back after a slip", gain: "A bad moment stops ending the evening" },
  { n: 5, title: "Managing Distractions", line: "Handling the pull without you in the room", gain: "You step back, {he} keeps going" },
  { n: 6, title: "Attention Regulation", line: "{Name} running {his} own attention", gain: "A skill {he} keeps for life" },
];

export const SUPPORT = {
  headline: "Six weeks. Five minutes a day. A skill {Name} keeps for life.",
  strip: ["Every day", "Any time", "Every Sunday"],
};

export const PLANS = {
  plan: {
    price: PRICE_TIER1.price, // ₹2,999 — from config
    name: "Attention Plan",
    bullets: [
      "{Name}'s six-week plan, adjusted daily",
      "The exact words for each step",
      "Attention Coach, Hindi or English",
      "Sunday summary every week",
    ],
  },
  planCalls: {
    price: PRICE_TIER2.price, // ₹4,999 — from config
    name: "Attention Plan + Calls",
    bullets: [
      "Everything in the Attention Plan",
      "6 personal calls with our team, one every week",
    ],
  },
  refund: "7-day full refund if it's not right for you",
};

export const FAQ: { q: string; a: string }[] = [
  { q: "Is something wrong with my child?", a: "No. Attention is a skill every child is still building. Some just need a different way in. That's what the plan finds." },
  { q: "Does my child need to use an app?", a: "No. You do the 5-minute step with {him}, at a moment that already happens. No extra screen time." },
  { q: "What if a step doesn't work?", a: "Tap Didn't work. Tomorrow's step gets smaller or moves to a better moment, and the Coach helps you find another way." },
  { q: "What if we miss a day?", a: "Nothing is lost. The next step waits for you. Just pick up where you left off." },
  { q: "I'm busy. Is 5 minutes really enough?", a: "Yes. Each step fits into something you already do: screen-off, homework start, bedtime. Small and daily works better than long and rare." },
  { q: "What's the difference between ₹2,999 and ₹4,999?", a: "Both get the full six-week plan and the Coach. ₹4,999 adds 6 personal calls with our team, one every week." },
  // NOTE: "How does the refund work?" — the spec requires the REAL refund terms from current terms/checkout copy.
  // Source is lib/report-v2/v3-copy.ts PLAN_GUARANTEE / PRICE_GUARANTEE ("7-day full refund · Full money back").
  { q: "How does the refund work?", a: "7-day full refund — full money back. If it isn't right for you, ask within 7 days of buying and you get the full amount back, and you keep the report." },
  { q: "Is it in Hindi?", a: "The Attention Coach talks in Hindi or English. The plan is in English for now." },
];

export const FINAL_CTA = "Start {Name}'s plan · ₹2,999";

// ── Render helper ──
export function fillV3(tmpl: string, name: string, gender: Gender, band?: string): string {
  let s = tmpl.replace(/\{NAME\}/g, (name || "").toUpperCase());
  if (band) s = s.replace(/\{band\}/g, band);
  return fillTokens(name, gender)(s);
}
