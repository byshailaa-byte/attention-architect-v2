import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 3,
  weekTitle: "Stakes, Sustained",

  weeklyReading: {
    introShared: `Week 1 tested whether a real, genuine stake — not a manufactured one — changes how fully your child shows up for something. Week 2 tested that same real stake in a screens context. This week asks something harder: does a real stake still carry them through something that takes longer than one sitting, when the payoff or consequence is further away than it was in a quick, contained task?

The thing worth remembering: a Live Wire doesn't lack focus. Focus arrives fully and immediately when something real is genuinely on the line — and fades just as fast when the stake is fake or the payoff feels too far off to matter right now. Weeks 1 and 2 proved a real stake works for something short. This week tests whether it can be built into something longer, and whether it survives the middle stretch where the initial excitement has worn off but the payoff still isn't close.

This week's move: find or help create a genuine stake — not manufactured pressure — attached to something that takes more than one sitting to finish. A deadline that actually matters. A person genuinely counting on the outcome. A real consequence tied to whether it gets done.

Somewhere in the longer task, the real stake may not pay off the way your child hoped — a deadline gets missed, an outcome falls short. The instinct in that moment is to soften it, to manufacture a rescue-stake or a consolation win. This week asks you not to. A stake that only feels real when it goes well isn't actually real.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `The middle of a longer task is usually where the energy drops — the initial excitement has faded and the payoff still feels distant. That dip is expected, not a sign the stake wasn't real enough. Resist the urge to add a second, smaller stake to prop up the middle stretch; that tends to teach that the original stake wasn't sufficient on its own, which undermines the whole point.`,
    },

    moveOutroShared: `That's the work this week — not a stake that guarantees a good outcome, but one real enough to carry your child through a longer stretch, including the parts where it doesn't pay off the way they wanted.`,

    whatWorkingLooksLike: `You may notice your child returning to the task on their own during the slower middle stretch, without needing the stake re-explained or refreshed — the original reason still doing its work even once the initial excitement has faded. If the stake doesn't pay off and your child stays with the disappointment rather than needing it immediately softened, that's often a stronger sign of real engagement than a stake that happens to work out. Energy will likely dip somewhere in the middle — that's expected, not evidence the approach isn't working.`,

    thingToHoldOnto: `A stake that only works when it pays off isn't quite doing its job yet. This week isn't testing whether things go well — it's testing whether something real was enough to carry your child through, whether or not the outcome cooperated.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Notice where {{child_name}} shows up fully for something with an immediate stake versus a longer task where the stake feels far off.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Build a real stake into something longer.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Find or help create a genuine consequence tied to something that takes more than one sitting — not manufactured pressure, a real one.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Check in on it.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "**Worked** — let the stake keep carrying {{child_name}} without adding more pressure on top. **Mixed** — talk about where the energy dropped partway through. **Didn't land** — find something with a closer, clearer consequence.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let the stake fail to pay off, honestly.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "If the real consequence doesn't go {{child_name}}'s way partway through, don't manufacture a rescue-stake to soften it.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Name it directly.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `*"You stayed with this the whole way through, not just the exciting first part. That's real follow-through."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "",
      "10-11": "",
      "12-14": "Ask {{child_name}} directly whether the real stake kept {{child_pronoun_subj}} engaged across the whole task, or only at the start.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
