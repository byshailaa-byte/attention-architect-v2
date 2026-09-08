import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 4,
  weekTitle: "Coming back after a slip",

  weeklyReading: {
    introShared: `Stakes have held across longer tasks. This week is the real test: what happens when a genuine stake {{child_name}} set doesn't pay off — no manufactured safety net, no quiet rescue of the outcome.`,

    moveCalibration: {
      "8-9": `When a real stake is about to not pay off, the urge to quietly adjust the terms ("well, you still get it since you tried hard") will be strong. Let the stake mean what {{child_name}} said it meant, even when the outcome is a real loss.`,
      "10-11": `Watch for offering a consolation reward after a stake doesn't pay off — this quietly teaches {{child_name}} that stakes don't really have teeth. Let the loss be a loss.`,
      "12-14": `At this age, {{child_name}} may pre-emptively lower the stakes to avoid a real loss (setting an easy target and calling it ambitious). Notice that shift and name it honestly rather than praising the "safe" version as real stakes.`,
    },

    moveOutroShared: `This is about letting a real, self-set stake fail on its own terms — not manufacturing a loss, and not softening a genuine one.`,

    whatWorkingLooksLike: `Stakes {{child_name}} sets have real teeth — wins and losses both mean something, and you're not quietly de-fanging the losses.`,

    thingToHoldOnto: `A stake that never really costs anything when it fails was never a real stake to begin with.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a stake {{child_name}} sets this week that has a real chance of not paying off.",
        "10-11": `Same, and notice whether you're already forming a "backup plan" in your head in case it fails.`,
        "12-14": "Notice whether {{child_name}} is setting a genuinely ambitious stake, or a safe one dressed up as ambitious.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let a real stake fail without softening the terms after.",
      content: {
        "8-9": "Don't hint at how likely it is to fail, don't offer a backup plan in advance.",
        "10-11": "Resist softening the terms of the stake before it's even been tested.",
        "12-14": `If {{child_name}} lowered the stake to something safer, name that honestly rather than praising the safe version as if it were the original ambition.`,
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — the stake ran its course honestly, win or lose, and you didn't soften it. Keep going.\n**Mixed** — the stake failed and you offered a consolation afterward. Notice whether that changed what the stake actually meant.\n**Didn't land** — you intervened before the stake could resolve. Worth naming what made this one feel too high to let ride.`,
        "10-11": `**Worked** — the stake ran its course honestly, win or lose, and you didn't soften it. Keep going.\n**Mixed** — the stake failed and you offered a consolation afterward. Notice whether that changed what the stake actually meant.\n**Didn't land** — you intervened before the stake could resolve. Worth naming what made this one feel too high to let ride.`,
        "12-14": `**Worked** — the stake ran its course honestly, win or lose, and you didn't soften it. Keep going.\n**Mixed** — the stake failed and you offered a consolation afterward. Notice whether that changed what the stake actually meant.\n**Didn't land** — you intervened before the stake could resolve. Worth naming what made this one feel too high to let ride.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "No consolation prize, no \"well, you tried.\"",
      content: {
        "8-9": "Let a genuine, self-set stake fail to pay off — no consolation prize, no quiet adjustment of the terms afterward.",
        "10-11": "Same, but pick a stake {{child_name}} has told someone else about, so the loss is genuinely felt, not private.",
        "12-14": "Let {{child_name}} be the one to name whether the stake failed — don't declare it for {{child_pronoun_obj}}.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it was a real one — that's what makes it worth setting again.",
      content: {
        "8-9": `*"That stake didn't pay off. It was still a real one."*`,
        "10-11": `*"That one didn't come through. Still worth setting stakes like that."*`,
        "12-14": `*"That didn't pay off. Doesn't make it a wasted bet."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did a real loss make {{child_name}} more careful about the stakes {{child_pronoun_subj}} sets, or more honest about them?",
      "10-11": "Did {{child_name}} start setting smaller stakes after the loss — and is that caution or avoidance?",
      "12-14": "Did {{child_name}}'s relationship to risk shift at all this week, separate from anything you did?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
