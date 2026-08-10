import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "inventor",
  week: 2,
  weekTitle: "Their Way on Screens",

  weeklyReading: {
    introShared: `Watch {{child_name}} inside a game and you'll notice something: nobody's correcting {{child_pronoun_poss}} approach. Nobody's saying "that's not how you're supposed to build that base" or "try it this way instead." Games are one of the only places in {{child_pronoun_poss}} day where {{child_pronoun_poss}} method is entirely {{child_pronoun_poss}} own, with zero adult correction — which may be exactly why they're so magnetic. This week doesn't compete with that freedom. It extends it — the same total hands-off respect, applied somewhere that matters more to you than a game score.`,

    moveCalibration: {
      "8-9":  `Pick something small and let it be entirely {{child_pronoun_poss}} way — no "try it like this," even gently. Keep the task low-stakes so the freedom feels easy to give.`,
      "10-11": `Choose a slightly bigger task and go fully hands-off on the method — notice the urge to "just help" and resist it the same way you'd never correct {{child_pronoun_poss}} in-game strategy.`,
      "12-14": `Bring {{child_pronoun_obj}} a genuinely open-ended problem and ask what freedom {{child_pronoun_subj}}'d want to solve it — likely some version of "don't tell me how." Give exactly that, the same respect {{child_pronoun_poss}} game time already has.`,
    },

    moveOutroShared: `What makes this work is recognizing that the freedom was never the problem — it was already working, just confined to one domain. Extending it doesn't dilute anything; it just gives the same trust a second place to matter.`,

    whatWorkingLooksLike: `A good week looks like real engagement in a task where {{child_pronoun_poss}} method stayed entirely {{child_pronoun_poss}} — messier, maybe, but {{child_pronoun_poss}}. A "bad" week usually means a correction crept in that wouldn't have happened during {{child_pronoun_poss}} screen time — the exact double standard this week is meant to close.`,

    thingToHoldOnto: `The trust was never missing. It just had one address. Next week, we stretch that same ownership across something bigger than one task.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Does anyone tell {{child_name}} how to play the game? No. Just notice how free that is — how completely {{child_pronoun_poss}} the method already is.",
        "10-11": "Notice today: when {{child_name}} plays or builds inside a game, does anyone ever correct *how* {{child_pronoun_subj}} does it? Probably not. Just notice how total that freedom already is.",
        "12-14": "Notice: does anyone correct {{child_name}}'s method inside a game? Almost never. Just notice the freedom — how completely hands-off you already are in that one domain.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Give a real task that same freedom.",
      content: {
        "8-9":   "Pick one thing today and let {{child_name}} do it completely {{child_pronoun_poss}} way — no \"try it like this,\" not even gently. Same hands-off as gaming.",
        "10-11": "Pick one task today and hand it over completely — no method correction, no \"try it like this,\" same hands-off respect {{child_pronoun_poss}} game time already gets by default.",
        "12-14": "Tell {{child_name}} directly: \"your method is yours, same as it already is when you're gaming.\" Hand over a real task with zero correction.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Again today — and notice how hard it is to stay as hands-off as you already are during {{child_pronoun_poss}} screen time.",
          mixed:      "Did a correction slip in that wouldn't happen during gaming? That's the gap to close. Try again today, fully hands-off.",
          didnt_land: "The freedom may not have been complete. Try again today — same respect {{child_pronoun_poss}} game time already has, no exceptions.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Same task, same hands-off. And today: if you feel the urge to \"just suggest\" — notice it and don't. Stay as quiet as you already are when {{child_pronoun_subj}} plays.",
        "10-11": "Same move — and today, notice the urge to \"just help\" and resist it the same way you'd never correct {{child_pronoun_poss}} in-game strategy. That's the catch-yourself moment.",
        "12-14": "Same move. A teen notices the double standard instantly — stay as hands-off now as you are during {{child_pronoun_poss}} screen time. No 'just one suggestion.'",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Set a real time boundary on the screen itself.",
      content: {
        "8-9":   "Give the screen a real time edge today. Just the when, not the how — the method freedom stays completely {{child_pronoun_poss}}.",
        "10-11": "Set a real time boundary on the screen itself. Separate axis entirely — a clear start and end, held firmly. The method freedom stays total; only the *when* and *how long* get a real edge.",
        "12-14": "A real time boundary, method freedom untouched. Discussed together — the *when* gets a real edge, the *how* stays entirely {{child_pronoun_poss}}.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Name the connection.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"Nobody tells you how to play your game — I didn't tell you how to do that either.\"*",
        "10-11": "Tell {{child_name}}: *\"Nobody tells you how to play that game — and I didn't tell you how to do [the task] either. That's not an accident. That's how you actually build things.\"*",
        "12-14": "Tell {{child_name}}: *\"Nobody corrects how you play — I'm not correcting how you build, either. Same respect.\"* Direct and simple.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}The freedom you already give on screen works everywhere — it just needed a second address.{{/if}}{{#if week_trend == "mixed"}}Normal. Staying fully hands-off outside gaming takes real practice — even a gentle suggestion breaks the parallel.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the freedom genuinely total? Even a small "just try it this way" breaks the parallel {{child_name}} was supposed to feel.{{/if}}

The trust was never missing. It just had one address.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}The freedom {{child_pronoun_subj}} already has on screen is exactly what makes real tasks work too — same lever, different domain.{{/if}}{{#if week_trend == "mixed"}}Normal. Staying hands-off outside gaming takes real practice — the urge to help is strong, and even once breaks the parallel.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the method freedom genuinely as total as what screens already allow? A correction that wouldn't happen during gaming undoes the whole parallel.{{/if}}

The trust was never missing. It just had one address. Next week, we give it another.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}The trust already existed — it just had one address. You've given it a second one this week.{{/if}}{{#if week_trend == "mixed"}}Normal. A teen notices the double standard instantly — closing it fully takes a few tries.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the freedom genuinely total? A 12–14 will notice the difference between "your method" and "your method, within my suggestions" — and the second version doesn't work.{{/if}}

Next week, we stretch that same ownership across something bigger.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
