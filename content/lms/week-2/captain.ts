import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "captain",
  week: 2,
  weekTitle: "Let Them Set the Screen Rule",

  weeklyReading: {
    introShared: `Screens are usually the single most fought-over rule in any house — which makes them the highest-value place to hand {{child_name}} real authority. If a Captain gets to genuinely help set the boundary here, in the domain with the most at stake, it proves the ownership from Week 1 wasn't just offered on easy, low-stakes tasks. This week doesn't loosen the limit. It changes who's holding the pen when it gets drawn.`,

    moveCalibration: {
      "8-9":  `Ask a simple, real question before announcing the rule: "how much time feels fair to you today?" Use {{child_pronoun_poss}} answer, or negotiate from it genuinely, rather than deciding first and asking after.`,
      "10-11": `A real back-and-forth conversation about the limit, arrived at together — and once set, let {{child_pronoun_obj}} track it {{child_pronoun_poss}} own way rather than you enforcing it.`,
      "12-14": `Full collaborative negotiation, treated as a real discussion between two people, not a parent granting a concession. A teen Captain will know the difference instantly.`,
    },

    moveOutroShared: `What makes this work is that screens are the domain with the most at stake — so real authority here reads as genuinely real, in a way a low-stakes chore never quite proves on its own.`,

    whatWorkingLooksLike: `A good week looks like {{child_name}} actually holding a boundary {{child_pronoun_subj}} helped set, without you having to enforce it. A "bad" week usually means the "negotiation" was decided beforehand and {{child_pronoun_poss}} input was heard but not used — which a Captain detects immediately.`,

    thingToHoldOnto: `Real authority in the hardest domain is the clearest proof it's real anywhere. Next week, we extend that same ownership to something ongoing, not just a single day's limit.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Does {{child_name}} react differently when told the screen rule versus when {{child_pronoun_subj}}'s asked about it? Just notice the difference today.",
        "10-11": "Notice today: how does {{child_name}} react when the screen rule is announced versus when {{child_pronoun_subj}}'s asked for input on it? Just observe the difference — don't change anything yet.",
        "12-14": "Notice the energy gap between an announced screen rule and one {{child_name}} had real input on. Just observe today — don't act yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them propose the screen rule instead of you setting it.",
      content: {
        "8-9":   "Ask {{child_pronoun_obj}} what feels fair today before announcing anything. Set the limit together, using {{child_pronoun_poss}} answer — or genuinely negotiating from it.",
        "10-11": "Not removing structure — negotiating it together, genuinely, with {{child_pronoun_poss}} input actually shaping the outcome: *\"How much time feels fair to you today?\"* Use the answer, or negotiate from it honestly.",
        "12-14": "A genuine discussion about what's fair — not a concession granted, a real conversation between two people. Both of you arrive at the limit together.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Again today — notice if you're tempted to overrule {{child_pronoun_poss}} input once it's given.",
          mixed:      "Was {{child_pronoun_poss}} input genuinely used, or just heard? There's a difference — {{child_name}} knows which one happened.",
          didnt_land: "The negotiation may not have felt real. Try again today, and actually let {{child_pronoun_poss}} input change something.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch the override.",
      content: {
        "8-9":   "Ask, use the answer, hold the limit. And today: if {{child_pronoun_subj}} gives an answer you'd have changed, use it anyway. That's what makes it real.",
        "10-11": "Same move — and today, notice the urge to quietly override {{child_pronoun_poss}} input after accepting it. A Captain detects that instantly — the override undoes the whole negotiation.",
        "12-14": "Same move. Today: resist the override. If {{child_pronoun_poss}} input shaped the limit, let it stay shaped that way — even if it's not what you'd have chosen.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Hold them to their own rule rather than yours.",
      content: {
        "8-9":   "Let {{child_name}} hold the limit {{child_pronoun_poss}} own way today. No enforcement from you — {{child_pronoun_subj}} set it, {{child_pronoun_subj}} holds it.",
        "10-11": "Instead of you enforcing the limit, hand {{child_pronoun_obj}} the responsibility of tracking and holding it {{child_pronoun_poss}} own way.",
        "12-14": "Let {{child_name}} self-monitor entirely — hand over tracking and holding the limit, no enforcement from you.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they set it and kept it.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"You helped set that, and you held it yourself.\"* Short and specific.",
        "10-11": "Tell {{child_name}}: *\"You set that boundary with me, and you held it yourself today. That's real ownership — not just being told what to do.\"*",
        "12-14": "Tell {{child_name}}: *\"You helped set that limit and held it yourself, start to finish. That's real ownership.\"* No fanfare — one honest observation.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Real say in the hardest rule proves it's real everywhere — {{child_name}} just proved {{child_pronoun_subj}} can hold a boundary {{child_pronoun_subj}} set.{{/if}}{{#if week_trend == "mixed"}}Normal. Genuine negotiation is harder than it sounds — the key is whether {{child_pronoun_poss}} input actually changed something.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was {{child_pronoun_poss}} say actually used, or just heard? A Captain can tell the difference, and a fake negotiation is worse than no negotiation.{{/if}}

Real authority in the hardest domain is the clearest proof it's real anywhere.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}Screens are the domain everyone fights hardest over, which makes real authority here the clearest possible proof it's genuine.{{/if}}{{#if week_trend == "mixed"}}Normal. Genuine negotiation is harder than it sounds — the key question is whether {{child_pronoun_poss}} input actually shaped the outcome.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was {{child_pronoun_poss}} input actually used, or was the "negotiation" decided before {{child_pronoun_subj}} spoke? A Captain detects that immediately — and a fake negotiation is worse than no negotiation.{{/if}}

Next week, we extend that same ownership to something ongoing, not just a single day's limit.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Real authority in the hardest domain proves it's real everywhere — a teen Captain needed to see this exact thing.{{/if}}{{#if week_trend == "mixed"}}Normal. Genuine negotiation between equals takes practice — a teen Captain detects instantly when the outcome was already decided.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was {{child_pronoun_poss}} input actually used, or just heard? A fake negotiation doesn't just fail — it costs trust. The next one needs to be genuinely open before it starts.{{/if}}

Next week, we extend that same ownership to something ongoing, not just a single day's limit.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
