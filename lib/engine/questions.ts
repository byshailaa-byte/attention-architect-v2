// Question bank — verbatim from docs/specs/attention-architect-v2-assessment-final.md
// Do NOT reword, paraphrase, or add a neutral option.

export type QuestionOption = { label: string; value: string };
export type Question = {
  id: string;
  dimension: string;
  text: string;
  options: QuestionOption[];
};

// ── Gateway questions (always asked, in this order) ────────────────────────────

export const GATEWAY_QUESTIONS: Question[] = [
  {
    id: "G1",
    dimension: "attention_shape",
    text: "When {name} gets completely absorbed in something, what does it usually look like?",
    options: [
      { label: "Going deep into one thing, and ignoring everything else", value: "narrow-deep" },
      { label: "Moving between a few related things at once", value: "wide-shifting" },
      { label: "Being with or around other people, even quietly", value: "social-anchored" },
      { label: "Whatever feels the most exciting or active", value: "sensation-seeking" },
    ],
  },
  {
    id: "G2",
    dimension: "attention_competition",
    text: "What's the first thing that pulls {name} away from something they're supposed to be doing?",
    options: [
      { label: "A new idea popping into their head", value: "novelty" },
      { label: "Noise, movement, or activity nearby", value: "external" },
      { label: "Feeling bored, frustrated, or restless", value: "internal" },
      { label: "Other people — wanting to connect, or to get away from tension", value: "social" },
    ],
  },
  {
    id: "G3",
    dimension: "parent_instinct",
    text: "When {name} is stuck or struggling, what's your first instinct?",
    options: [
      { label: "Step in and help them get it done", value: "quick-fixer" },
      { label: "Push them to keep trying on their own", value: "pusher" },
      { label: "Talk it through and find a middle ground", value: "negotiator" },
      { label: "Step back and let them figure it out, even if it takes a while", value: "steady-hand" },
    ],
  },
];

// ── attention_shape depth (D1.x) ──────────────────────────────────────────────

export const D1_1: Question = {
  id: "D1.1",
  dimension: "attention_shape",
  text: "Think about the last time {name} was completely absorbed in something — what was actually happening?",
  options: [
    { label: "Getting deeper and deeper into one thing", value: "narrow-deep" },
    { label: "Moving easily between 2–3 related things", value: "wide-shifting" },
    { label: "Doing something with or alongside other people", value: "social-anchored" },
    { label: "Chasing whatever felt most exciting in the moment", value: "sensation-seeking" },
  ],
};

export const D1_2: Question = {
  id: "D1.2",
  dimension: "attention_shape",
  text: "If you gave {name} a big project with no deadline, what would most likely happen?",
  options: [
    { label: "They'd disappear into it and lose track of time", value: "narrow-deep" },
    { label: "They'd start strong, then drift off before finishing", value: "wide-shifting" },
    { label: "They'd want to do it together with someone, not alone", value: "social-anchored" },
    { label: "They'd start strong if it felt exciting, then need a reason to keep going", value: "sensation-seeking" },
  ],
};

// ── reward_driver depth (D2.x) ────────────────────────────────────────────────

export const D2_1: Question = {
  id: "D2.1",
  dimension: "reward_driver",
  text: "What actually makes {name} light up — not what you wish would, but what really does?",
  options: [
    { label: "Figuring out something really hard", value: "mastery" },
    { label: "Discovering something brand new", value: "novelty" },
    { label: "Being noticed, included, or appreciated by others", value: "social" },
    { label: "Having full control over what they're doing and how", value: "autonomy" },
  ],
};

export const D2_2: Question = {
  id: "D2.2",
  dimension: "reward_driver",
  text: "When {name} finishes something hard, what matters more to them afterward?",
  options: [
    { label: "Knowing they got better at something", value: "mastery" },
    { label: "Moving on to the next interesting thing", value: "novelty" },
    { label: "Someone noticing or being proud of them", value: "social" },
    { label: "Doing it their own way", value: "autonomy" },
  ],
};

export const D2_3: Question = {
  id: "D2.3",
  dimension: "reward_driver",
  text: "What's most likely to make {name} lose interest in something they used to love?",
  options: [
    { label: "It stopped being challenging", value: "mastery" },
    { label: "Something newer and more interesting showed up", value: "novelty" },
    { label: "The social part of it changed or disappeared", value: "social" },
    { label: "They started feeling controlled or micromanaged about it", value: "autonomy" },
  ],
};

export const D2_CONFIRM: Question = {
  id: "D2.confirm",
  dimension: "reward_driver",
  text: "What's the single biggest reason {name} sticks with something?",
  options: [
    { label: "Getting better at it over time", value: "mastery" },
    { label: "It staying interesting and fresh", value: "novelty" },
    { label: "Doing it with people who matter to them", value: "social" },
    { label: "Feeling like it's genuinely their own choice", value: "autonomy" },
  ],
};

// ── friction_response depth (D3.x) ────────────────────────────────────────────

export const D3_1: Question = {
  id: "D3.1",
  dimension: "friction_response",
  text: "When {name} hits something really hard, what usually happens in the first few minutes?",
  options: [
    { label: "They go quiet and try to avoid it if they can", value: "avoid" },
    { label: "They push through alone, even if it's frustrating", value: "solo-push" },
    { label: "They look for someone to help or work through it with", value: "support-seek" },
    { label: "They get upset before they even start trying", value: "emotional-derail" },
  ],
};

export const D3_2: Question = {
  id: "D3.2",
  dimension: "friction_response",
  text: "Does hard stuff energize {name}, or drain them?",
  options: [
    { label: "Mostly drains them — hard things feel heavy", value: "avoid" },
    { label: "Depends — some hard things energize them, others don't", value: "solo-push" },
    { label: "Depends on whether someone's there to help", value: "support-seek" },
    { label: "It really energizes them — they like a real challenge", value: "energized" },
  ],
};

export const D3_3: Question = {
  id: "D3.3",
  dimension: "friction_response",
  text: "After a frustrating failure, what does {name} need most to try again?",
  options: [
    { label: "Space and time alone, without being pushed", value: "avoid" },
    { label: "Nothing — they'll go again on their own terms", value: "solo-push" },
    { label: "Someone to sit with them through it", value: "support-seek" },
    { label: "A reason to believe it's worth trying again", value: "emotional-derail" },
  ],
};

export const D3_CONFIRM: Question = {
  id: "D3.confirm",
  dimension: "friction_response",
  text: "When something's hard, does {name} tend to push through, seek help, or pull back?",
  options: [
    { label: "Pushes through alone", value: "solo-push" },
    { label: "Seeks help or company", value: "support-seek" },
    { label: "Pulls back or avoids", value: "avoid" },
    { label: "Genuinely varies by situation", value: "energized" },
  ],
};

// ── parent_instinct depth (P1, P2) ────────────────────────────────────────────

export const P1: Question = {
  id: "P1",
  dimension: "parent_instinct",
  text: "When your approach with {name} isn't working, what do you usually do next?",
  options: [
    { label: "Try something completely different right away", value: "quick-fixer" },
    { label: "Double down on the same approach, longer", value: "pusher" },
    { label: "Talk to other parents or sources for a new idea", value: "negotiator" },
    { label: "Step back and wait to see if it resolves itself", value: "steady-hand" },
  ],
};

export const P2: Question = {
  id: "P2",
  dimension: "parent_instinct",
  text: "What's hardest for you in moments like this?",
  options: [
    { label: "Staying calm when nothing seems to be working", value: "quick-fixer" },
    { label: "Not solving it for them so they learn it themselves", value: "pusher" },
    { label: "Being consistent when you're tired or busy", value: "negotiator" },
    { label: "Trusting your approach is the right one", value: "steady-hand" },
  ],
};

// ── attention_competition depth (D5.x) ────────────────────────────────────────

export const D5_1: Question = {
  id: "D5.1",
  dimension: "attention_competition",
  text: "When {name} chooses a screen over something else, what's it usually replacing?",
  options: [
    { label: "Boredom — there wasn't anything else pulling them", value: "boredom-avoidance" },
    { label: "A harder task they'd rather avoid", value: "task-escape" },
    { label: "Time with friends they can't otherwise get", value: "social" },
    { label: "Genuine excitement about a specific game or show", value: "genuine-interest" },
  ],
};

export const D5_2: Question = {
  id: "D5.2",
  dimension: "attention_competition",
  text: "What does {name} get from screens that real life isn't currently giving them?",
  options: [
    { label: "Constant, immediate feedback and reward", value: "boredom-avoidance" },
    { label: "A break from things feeling hard or slow", value: "task-escape" },
    { label: "Connection with friends, on their terms", value: "social" },
    { label: "Genuine novelty — something new every time", value: "genuine-interest" },
  ],
};

// ── recovery_response (R1, R2, R3) — always asked ────────────────────────────
// All three share the same four values so tallyDimension finds majority across data_points=3.
// autonomous → returns on own; responsive → one prompt; dependent → needs help; stopped → ends session

export const R1: Question = {
  id: "R1",
  dimension: "recovery_response",
  text: "When something interrupts {name} mid-task — someone calls them, a sibling comes in — what usually happens next?",
  options: [
    { label: "They go back to it on their own", value: "autonomous" },
    { label: "They go back if reminded once", value: "responsive" },
    { label: "They need help finding where they were", value: "dependent" },
    { label: "That's usually the end of the session", value: "stopped" },
  ],
};

export const R2: Question = {
  id: "R2",
  dimension: "recovery_response",
  text: "After they stop, how long before they're properly back into it?",
  options: [
    { label: "Almost straight away", value: "autonomous" },
    { label: "A few minutes", value: "responsive" },
    { label: "It takes a while to settle again", value: "dependent" },
    { label: "They don't really get back into it", value: "stopped" },
  ],
};

export const R3: Question = {
  id: "R3",
  dimension: "recovery_response",
  text: "When {name} comes back to something after a break, is that usually their idea or yours?",
  options: [
    { label: "Theirs, almost always", value: "autonomous" },
    { label: "Sometimes theirs, sometimes mine", value: "responsive" },
    { label: "Usually mine", value: "dependent" },
    { label: "It only happens if I sit with them", value: "stopped" },
  ],
};

// ── recharge_type depth (D6.x) ────────────────────────────────────────────────

export const D6_1: Question = {
  id: "D6.1",
  dimension: "recharge_type",
  text: "After a really demanding day, what does {name} need to feel okay again?",
  options: [
    { label: "Quiet, alone, with minimal input", value: "sensory-quiet" },
    { label: "Time with people they trust", value: "social-connection" },
    { label: "Something engaging to take their mind elsewhere", value: "cognitive-displacement" },
    { label: "Control over their own time and choices, with no demands", value: "autonomous-unstructured" },
  ],
};

export const D6_2: Question = {
  id: "D6.2",
  dimension: "recharge_type",
  text: "What drains {name} fastest?",
  options: [
    { label: "Noise, crowds, or sensory overload", value: "sensory-quiet" },
    { label: "Being alone or excluded for too long", value: "social-connection" },
    { label: "Doing the same boring thing for too long", value: "cognitive-displacement" },
    { label: "Being told what to do, constantly", value: "autonomous-unstructured" },
  ],
};

export const D6_3: Question = {
  id: "D6.3",
  dimension: "recharge_type",
  text: "What does {name}'s best kind of “rest” actually look like?",
  options: [
    { label: "Quiet, low-stimulation time", value: "sensory-quiet" },
    { label: "Time with friends or family, relaxed", value: "social-connection" },
    { label: "An absorbing distraction — a show, a game, a book", value: "cognitive-displacement" },
    { label: "Free time with zero structure or expectations", value: "autonomous-unstructured" },
  ],
};

export const D6_CONFIRM: Question = {
  id: "D6.confirm",
  dimension: "recharge_type",
  text: "What recharges {name} fastest — quiet, connection, distraction, or freedom?",
  options: [
    { label: "Quiet and low stimulation", value: "sensory-quiet" },
    { label: "Connection with people", value: "social-connection" },
    { label: "An absorbing distraction", value: "cognitive-displacement" },
    { label: "Freedom from structure", value: "autonomous-unstructured" },
  ],
};

