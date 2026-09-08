import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "glue",
  week: 2,
  weekTitle: "Handling what pulls them away",

  weeklyReading: {
    introShared: `For {{child_name}}, a screen often isn't really about the content — it's a way to disappear from a feeling that hasn't been addressed yet. This is the same connection-before-concentration pattern from Week 1, showing up in a new place: when the room feels tense and unresolved, screens become the exit. This week doesn't fight that exit by blocking it harder. It addresses what's actually driving the reach for it — real connection, offered before the tension gets a chance to send {{child_pronoun_obj}} looking for an escape.`,

    moveCalibration: {
      "8-9":  `Keep the connection simple and physical — sit close, name the feeling plainly: "seems like today's been a lot — I'm here." Do this before any screen conversation happens.`,
      "10-11": `A slightly longer, more specific check-in — naming what's actually tense, not just "you okay?" — before addressing screen time at all.`,
      "12-14": `Real, honest connection with no hidden agenda toward the screen conversation — a teen Glue will sense if the warmth is just a lead-in to a rule enforcement, and that backfires immediately.`,
    },

    moveOutroShared: `What makes this work is sequencing. Connection first doesn't excuse unlimited screen time — it just makes sure the boundary conversation isn't the thing {{child_pronoun_subj}}'s actually running from.`,

    whatWorkingLooksLike: `A good week looks like the screen-reaching softening on days when the tension actually got addressed first. A "bad" week usually means connection was skipped or rushed on the way to the "real" conversation about limits — which, for this child, undoes the whole point.`,

    thingToHoldOnto: `The screen was never the actual need. Next week, we build connection-first into a daily habit that holds even on harder days.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Does {{child_name}} reach for a screen more on a tense day? Just notice the pattern today — don't act on it yet.",
        "10-11": "Notice today: does {{child_name}} reach for a screen more on days when something's felt tense in the house? Just watch the pattern, don't act on it yet.",
        "12-14": "Notice whether tension in the house predicts more screen-reaching. Just observe today — don't try to intervene yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Sit with them for a moment before raising screen time.",
      content: {
        "8-9":   "On a tense moment today, have two warm minutes first — before any screen talk. Sit close, name the feeling simply. Then, and only then, any conversation about screens.",
        "10-11": "On a moment when tension's present and a screen is the instinct, connect genuinely first — a real two minutes — before addressing the screen at all.",
        "12-14": "Connect for real, before any screen conversation. No hidden agenda — a genuine moment, not a lead-in to a rule. If there's no tense moment today, just practice the two minutes of real check-in.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Again today — and notice if the pull toward the screen softens once the tension's actually been addressed.",
          mixed:      "Was the connection genuine, or rushed to get to the 'real' conversation? For {{child_name}}, rushed doesn't count. Try again with more time.",
          didnt_land: "The air may not have actually cleared. Try again when there's real time for it — not a quick step on the way to the rule conversation.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch the rush.",
      content: {
        "8-9":   "Same — connect first, keep it real. And today: notice if you rushed it to get to the \"screen conversation.\" If you did, that's the thing to catch.",
        "10-11": "Same move — and today, notice whether the connection was genuine or a step on the way to the rule conversation. For {{child_name}}, {{child_pronoun_subj}} can tell the difference.",
        "12-14": "Same move, keep it honest. A teen Glue will sense if the warmth has strings on it — this only works when there's genuinely no agenda behind it.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Don't open with the limit — open with them.",
      content: {
        "8-9":   "Give the screen a real edge today too. A clear limit — but introduced after connection, not as the opening move.",
        "10-11": "Set a real boundary on the screen too, connection-first. The limit stays real — but it gets introduced after connection, not as the opening move.",
        "12-14": "Name tension directly, then discuss the boundary. Level with {{child_name}} about what's actually going on before addressing screens at all — the honesty is part of the connection.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say the conversation went differently, and why.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"You didn't need your tablet as much after we talked today.\"* Say it simply.",
        "10-11": "Tell {{child_name}}: *\"I noticed you reached for your tablet less today after we talked. That tells me something — the screen wasn't really what you needed.\"*",
        "12-14": "Tell {{child_name}}: *\"You reached for your phone less after we actually talked — that's real, and worth knowing about yourself.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Connection first really changes it — the screen wasn't the need, it was the exit from something unaddressed.{{/if}}{{#if week_trend == "mixed"}}Normal. Sincerity takes real time, and you don't always have it. What matters is that when you did, it worked.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the connection real, or quick? A rushed check-in doesn't count for this child — it just adds one more thing to navigate before the screen.{{/if}}

The screen was never the actual need. Next week, we make connection-first a daily habit.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}For this child, screens are often standing in for something else entirely — connection-first genuinely changes the pull.{{/if}}{{#if week_trend == "mixed"}}Normal. Sincerity takes real time you don't always have — what matters is that on the days you had it, it made a difference.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the connection actually real, or a quick step on the way to the real conversation? For {{child_name}}, {{child_pronoun_subj}} can tell. A connection with a hidden agenda isn't connection — it's a softer version of a rule.{{/if}}

The screen was never the actual need. Next week, we build connection-first into something that holds even on harder days.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Screens were often standing in for something that hadn't been addressed — connection first worked because it addressed the actual thing.{{/if}}{{#if week_trend == "mixed"}}Normal. Real connection without strings takes practice, and a teen Glue can detect strings instantly.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the connection real, or a lead-in? A teen who senses the warmth is instrumental will close down — which makes the screen more appealing, not less.{{/if}}

Next week, we build connection-first into a daily habit that holds even on harder days.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
