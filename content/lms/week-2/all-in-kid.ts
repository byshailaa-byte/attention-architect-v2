import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 2,
  weekTitle: "Handling what pulls them away",

  weeklyReading: {
    introShared: `It's easy to watch {{child_name}} vanish into a game for two hours and worry that screens have some special hold on {{child_pronoun_obj}}. They don't — not more than anything else {{child_pronoun_subj}} goes deep into, anyway. What screens actually offer, better than almost anything else in {{child_pronoun_poss}} day, is *uninterrupted time*. Nobody calls {{child_pronoun_obj}} for dinner mid-level. Nobody checks in every five minutes. The depth you see on screen isn't a different capacity than the one that goes quiet on homework — it's the exact same one, just finally given the conditions it needs everywhere else. This week doesn't fight the gaming. It uses it as proof, then builds the same conditions somewhere that matters more to you.`,

    moveCalibration: {
      "8-9":  `Protect a short non-screen stretch — 15 minutes, no interruptions — the same way {{child_pronoun_poss}} game time already goes untouched. Keep it concrete: "nobody's going to bug you for the next 15 minutes, same as when you're playing."`,
      "10-11": `Extend the protected stretch to 25–30 minutes, and start naming the parallel out loud once {{child_pronoun_subj}}'s experienced it: "notice how that felt like when you're gaming? Nobody pulled you out."`,
      "12-14": `Let {{child_pronoun_obj}} identify the parallel {{child_pronoun_poss}} own way — ask directly: "what does your game time have that your other stuff doesn't?" Most likely answer is some version of "nobody bothers me." Use {{child_pronoun_poss}} own words to build the non-screen protection together.`,
    },

    moveOutroShared: `What makes this work is removing the moral weight from the gaming itself. It's not that screens are bad and this task is good — it's that one already has the conditions {{child_pronoun_poss}} attention needs, and the other now does too.`,

    whatWorkingLooksLike: `A good week looks like real depth showing up in the protected non-screen block — not identical to gaming, but recognizably the same mode. A "bad" week usually means the non-screen protection wasn't actually as complete as what screens already get — even one interruption breaks the parallel {{child_pronoun_subj}}'s supposed to feel.`,

    thingToHoldOnto: `The capacity was never in question. What was missing was matching conditions. Next week, we stretch this same protected depth across more than one block.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "How long does {{child_name}} play a game without anyone bugging {{child_pronoun_obj}}, compared to everything else? Just compare today. Don't do anything yet.",
        "10-11": "Notice today: how long does {{child_name}} stay in a game without anyone interrupting, compared to how long anything else usually runs uninterrupted? Don't judge it. Just compare.",
        "12-14": "Notice how uninterrupted {{child_name}}'s gaming time is compared to everything else in {{child_pronoun_poss}} day. Just observe — don't act on it yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Protect a screen-based deep stretch the same way you would a book.",
      content: {
        "8-9":   "Pick 15 minutes today and protect it the same way gaming already gets protected — nobody interrupts, no check-ins. Same conditions, different domain.",
        "10-11": "Pick one non-screen stretch today and protect it exactly the way {{child_pronoun_poss}} gaming time already gets protected — no interruptions, no check-ins. Same conditions, different domain.",
        "12-14": "Tell {{child_name}} directly: \"your game time never gets interrupted — let's protect something else the same way.\" Then actually do it: the same uninterrupted conditions, somewhere that matters more.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Again today — and notice if the depth shows up the same way it does on screen.",
          mixed:      "Check what interrupted it that screens don't get — that gap is exactly what to close. Try again today.",
          didnt_land: "The protection may not have matched screens' conditions closely enough. Try again today, closer to the real thing.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Same protection, same rules as gaming. And today: no interruptions, not even helpful ones. Even a quick check-in breaks the parallel {{child_name}} is supposed to feel.",
        "10-11": "Same non-screen protection. Today: notice what you do during {{child_name}}'s gaming that you're now tempted to do during this block — and don't. Even one interruption breaks the parallel.",
        "12-14": "Match the conditions more precisely: whatever gaming gets — no interruptions, no check-ins, no 'how's it going?' — the non-screen block gets the same. Notice the urge to check in. Don't.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Don't interrupt it just because it's a screen.",
      content: {
        "8-9":   "Give the screen time a real edge too. A clear start and stop, held the same as anything else — not a punishment, just an edge.",
        "10-11": "Set a real, respected boundary on the screen time too. Not a punishment — the same kind of clear, protected edge {{child_pronoun_poss}} other deep time now gets. A start and an end, held firmly, same as any other block.",
        "12-14": "Set a real, mutual boundary on screens too. Discussed together, not announced — the same protected-edge treatment as anything else in {{child_pronoun_poss}} day.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Name what held their attention, not the fact it was quiet.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"The way you go deep in that game — that's the same thing you did today. It's one skill.\"*",
        "10-11": "Tell {{child_name}}: *\"The way you go deep into that game — that's the exact same thing you do with [the protected task]. It's not two different things. It's one skill.\"*",
        "12-14": "Tell {{child_name}}: *\"That depth you show gaming — that's the same thing you just did there. Same skill.\"* Adult-to-adult, no fanfare.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}It's one skill, not two — the depth just needed the same conditions somewhere it matters more.{{/if}}{{#if week_trend == "mixed"}}Normal. Matching those exact conditions takes a try or two — even one interruption breaks the parallel.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the protection really as complete as gaming gets? Even one interruption breaks the parallel {{child_name}} was supposed to feel.{{/if}}

The capacity was never screen-specific. It just needed matching conditions.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}The depth was never screen-specific — it's just {{child_pronoun_poss}} mode, and it transfers when the conditions match.{{/if}}{{#if week_trend == "mixed"}}Normal. Matching conditions exactly takes a few tries — one interruption breaks the parallel {{child_pronoun_subj}}'s supposed to feel.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the non-screen protection genuinely as complete as what screens already get? Even one interruption breaks the parallel {{child_pronoun_subj}}'s supposed to feel.{{/if}}

The capacity was never in question. What was missing was matching conditions.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}The capacity was never screen-specific — it just needed the same conditions somewhere that matters more.{{/if}}{{#if week_trend == "mixed"}}Normal. Matching conditions precisely takes a couple of tries. A teen notices the difference between real protection and approximate protection.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the non-screen protection genuinely as complete as gaming gets? The condition that matters most is usually: nobody bothers {{child_pronoun_obj}}. If that wasn't fully true, that's the gap.{{/if}}

Next week, the same protected depth stretches further.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
