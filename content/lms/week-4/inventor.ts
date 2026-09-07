import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "inventor",
  week: 4,
  weekTitle: "Coming back after a slip",

  weeklyReading: {
    introShared: `Week 3 asked whether {{child_name}}'s ownership of method held across a whole project. This week is the harder version: what happens when the chosen method genuinely doesn't work — not a snag to troubleshoot, but a real failure that means starting over. This is where "it's your approach" gets tested for real.`,

    moveCalibration: {
      "8-9": `When a chosen method actually fails, the urge to say "see, I told you the other way would've worked better" will be strong — especially if you suggested that other way earlier. Resist it completely this week. Let the failure be {{child_pronoun_poss}} information, not your validation.`,
      "10-11": `The temptation shifts toward stepping in to help "fix" the failed approach rather than letting {{child_name}} decide whether to fix it, restart, or abandon it. All three are legitimate responses to a real failure — the choice of which one is still {{child_pronoun_poss}} to make.`,
      "12-14": `At this age, a real method failure can trigger a bigger parental instinct — questioning judgment more broadly, not just this one approach. Keep the response scoped to this one failed method. One failed approach isn't evidence about {{child_pronoun_poss}} judgment in general.`,
    },

    moveOutroShared: `A real failure, not a manufactured one — pick something where the method genuinely might not work, not something rigged to fail as a lesson.`,

    whatWorkingLooksLike: `A failed method gets treated as data, not as a verdict on {{child_name}}. {{child_pronoun_subj}} decides what happens next.`,

    thingToHoldOnto: `Ownership of a method that never fails isn't really ownership — it's never been tested.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a method {{child_name}} is using that's genuinely at risk of not working — not a sure failure, a real uncertain one.",
        "10-11": "Same, and notice specifically whether your doubt is about the method or about a different approach you'd have chosen.",
        "12-14": `Notice where {{child_name}} is committed to an approach you think is inefficient — and notice whether "inefficient" is actually "different from how I'd do it."`,
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let the approach fail all the way through — no small rescue hint.",
      content: {
        "8-9": "Don't step in early to prevent it or soften the scale. Let the method play out.",
        "10-11": `Resist offering a "just in case" backup plan in advance — that quietly signals you expect it to fail.`,
        "12-14": "Say nothing about the approach at all this week, including after {{child_name}} vents about a snag mid-process.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — the failure landed and you didn't rescue or redirect. Keep holding that line.\n**Mixed** — you held back during the failure but offered advice on what to do next, unasked. Notice that "what now" is still {{child_pronoun_poss}} call.\n**Didn't land** — you stepped in to prevent the failure outright. Worth being honest about what made this one feel too risky to let through.`,
        "10-11": `**Worked** — the failure landed and you didn't rescue or redirect. Keep holding that line.\n**Mixed** — you held back during the failure but offered advice on what to do next, unasked. Notice that "what now" is still {{child_pronoun_poss}} call.\n**Didn't land** — you stepped in to prevent the failure outright. Worth being honest about what made this one feel too risky to let through.`,
        "12-14": `**Worked** — the failure landed and you didn't rescue or redirect. Keep holding that line.\n**Mixed** — you held back during the failure but offered advice on what to do next, unasked. Notice that "what now" is still {{child_pronoun_poss}} call.\n**Didn't land** — you stepped in to prevent the failure outright. Worth being honest about what made this one feel too risky to let through.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let them decide whether to fix it, restart it, or drop it.",
      content: {
        "8-9": "Pick a method {{child_name}} is attached to and let it fail all the way through — no hint, no small correction that changes the outcome.",
        "10-11": "Same, but pick something with a real stake attached (a grade, a competition, a thing {{child_name}} told others about) so the failure actually costs something.",
        "12-14": "Let the failure be public in whatever small way is natural to the situation (shown to a teacher, a friend, a sibling) — not privately absorbed where no one else sees it.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say the method didn't work. Don't say you saw it coming.",
      content: {
        "8-9": `*"That way didn't work. That's real information about the way — not about you."*`,
        "10-11": `*"That approach didn't hold up. Good to know for next time — and it's still yours to decide what's next."*`,
        "12-14": `*"That method failed. Doesn't say anything about your judgment — just about that one approach."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} seem more or less willing to try a new method after the failure?",
      "10-11": "Did the failure change how {{child_name}} thinks about the method, or about {{child_pronoun_poss}} own judgment? Those are different things.",
      "12-14": "Where did the instinct to generalize from one failure show up in you — even if you didn't say it out loud?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
