import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 2,
  weekTitle: "Handling what pulls them away",

  weeklyReading: {
    introShared: `Games already have exactly what {{child_name}} needs to fully engage — a real, immediate stake: a timer, a rival, a visible score, a friend waiting on the other end. Rather than treating that as something to compete with, this week treats it as a template. Whatever specific thing makes the game feel real to {{child_pronoun_obj}} is a genuine blueprint for what could make anything else feel real too — borrowed deliberately, not vaguely.`,

    moveCalibration: {
      "8-9":  `Keep it playful and concrete — a visible timer, a small race, a score {{child_pronoun_subj}} can see. Match the game's simplicity rather than overcomplicating the borrowed version.`,
      "10-11": `Get specific with {{child_pronoun_obj}} about what exactly makes a game feel real, then build that precise shape into a real task — a countdown, a rival, a visible marker of progress.`,
      "12-14": `Ask {{child_pronoun_obj}} directly to name what makes a game genuinely gripping, and let {{child_pronoun_obj}} design the borrowed version {{child_pronoun_poss}} own way — ownership of the stake-shape matters as much as the shape itself at this age.`,
    },

    moveOutroShared: `What makes this work is specificity. A vague "let's make this fun" doesn't transfer. The exact mechanism — a timer, a rival, a visible score — is what actually makes the difference, and it's worth naming precisely rather than approximating.`,

    whatWorkingLooksLike: `A good week looks like a real task getting real engagement once it borrowed the game's actual structure — not just "trying to make it fun" in the abstract. A "bad" week usually means the borrowed stake was too diluted or vague to register the way the original did.`,

    thingToHoldOnto: `Games were never the distraction from real engagement — they were the clearest evidence of what it actually looks like. Next week, we stretch a borrowed stake across something longer than one sitting.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "What exactly makes the game feel exciting to {{child_name}} — a timer, a race, a friend? Get specific today. Just notice, don't act.",
        "10-11": "Notice today: what exactly makes the game feel real to {{child_name}} — a timer, a rival, a score, a friend waiting online? Get specific about what the actual stake is.",
        "12-14": "Get specific: what exactly makes a game feel real to {{child_name}} — a timer, a rival, a real stake? Just notice today. The more precise, the more useful.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Attach a real stake to a screen-time boundary they set.",
      content: {
        "8-9":   "Borrow the timer or the race idea for a non-screen thing today. Same shape as the game — as close as you can make it.",
        "10-11": "Whatever made the game feel real — a countdown, a rival, a visible score — apply that exact structure to something else today.",
        "12-14": "Ask {{child_pronoun_obj}} to name it: *\"What makes that game grip you?\"* Then use {{child_pronoun_poss}} own answer to build a real stake somewhere else.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Again today — with a different borrowed shape from a different game.",
          mixed:      "Did the borrowed stake feel as real as the original, or diluted? Get more specific about what exactly made the game version work.",
          didnt_land: "The shape may not have translated cleanly. Get more specific about what exactly made the game version feel real — the precise mechanism is what matters.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and check the realness.",
      content: {
        "8-9":   "Same borrowed idea, or try a different game's trick. And today: notice if it felt as real as the game version — if not, get more specific about what the game actually has.",
        "10-11": "Same move — and today, notice whether the borrowed stake felt as real as the original or diluted. The exact mechanism matters; a vague version won't transfer.",
        "12-14": "Same move, vary the shape. Today: check whether the borrowed stake felt as sharp as the original, or if it needs more precision. Ask {{child_pronoun_obj}} what the difference was.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let it hold without you renegotiating mid-week.",
      content: {
        "8-9":   "Give the screen a real time edge too. Same as any other domain — a clear, held limit, separate from the stakes work.",
        "10-11": "Set a real time boundary on the screen too. Same as any other domain — a clear, held limit, separate from the stakes work.",
        "12-14": "A real time boundary too — ideally discussed together. The stakes work and the limit are different axes; both can be real.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say the stake did the work, not your reminders.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"We used your game trick somewhere else, and it worked!\"* Keep it light and specific.",
        "10-11": "Tell {{child_name}}: *\"That thing that makes the game feel real — we just used the same trick somewhere else, and it worked. You basically taught me how to make things matter to you.\"*",
        "12-14": "Tell {{child_name}}: *\"You basically taught me what makes something matter to you — and it worked somewhere else too.\"* Adult-to-adult, no inflation.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Games showed us exactly what makes things real to {{child_name}} — and that knowledge transfers.{{/if}}{{#if week_trend == "mixed"}}Normal. Finding the precise shape to borrow takes a couple of tries — vague doesn't transfer.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the borrowed idea specific enough? A timer, a rival, a visible score — the exact mechanism is what transfers. A vague version of it won't.{{/if}}

Games were never the distraction. They were the best evidence yet of what makes something feel real to {{child_pronoun_obj}}.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}Games were never the problem — they were the best evidence yet of exactly what makes something real to {{child_pronoun_obj}}. That evidence is now useful.{{/if}}{{#if week_trend == "mixed"}}Normal. Finding the precise shape to borrow takes a couple of tries — a watered-down version of the stake won't work.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the borrowed stake genuinely as sharp as the original, or a watered-down version? The exact mechanism — a timer, a rival, a visible score — is what actually makes the difference.{{/if}}

Next week, we stretch a borrowed stake across something longer than one sitting.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Games were the clearest evidence yet of what's genuinely real to {{child_pronoun_obj}} — and that evidence is now working somewhere that matters more.{{/if}}{{#if week_trend == "mixed"}}Normal. A teen knows the difference between a real stake and an approximation — the precision matters.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the borrowed stake as sharp as the original, or watered down? {{child_name|cap}} will notice the difference between a real stake and a vague version of one.{{/if}}

Next week, we stretch that same stake across something longer than one sitting.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
