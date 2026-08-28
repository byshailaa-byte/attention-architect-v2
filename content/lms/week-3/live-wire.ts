import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 3,
  weekTitle: "When It Has to Last More Than a Burst",

  weeklyReading: {
    introShared: `Week 1 tested whether a real, genuine stake — not a manufactured one — changes how fully your child shows up for something. Week 2 tested that same real stake in a screens context. This week asks something harder: does a real stake still carry them through something that takes longer than one sitting, when the payoff or consequence is further away than it was in a quick, contained task?

The thing worth remembering: a Live Wire doesn't lack focus. Focus arrives fully and immediately when something real is genuinely on the line — and fades just as fast when the stake is fake or the payoff feels too far off to matter right now. Weeks 1 and 2 proved a real stake works for something short. This week tests whether it can be built into something longer, and whether it survives the middle stretch where the initial excitement has worn off but the payoff still isn't close.

This week's move: find or help create a genuine stake — not manufactured pressure — attached to something that takes more than one sitting to finish. A deadline that actually matters. A person genuinely counting on the outcome. A real consequence tied to whether it gets done.

Somewhere in the longer task, the real stake may not pay off the way your child hoped — a deadline gets missed, an outcome falls short. The instinct in that moment is to soften it, to manufacture a rescue-stake or a consolation win. This week asks you not to. A stake that only feels real when it goes well isn't actually real.`,

    moveCalibration: {
      "8-9": `When the energy drops in the middle — after the excitement of starting and before the payoff comes — don't jump in with a new reason to keep going. Let the original real reason do its work. If it isn't enough, that's useful information about how real the stake actually was.`,
      "10-11": `The energy drop in the middle of a longer task is expected — the initial excitement has faded and the payoff still isn't close. When {{child_name}}'s momentum slows there, resist the urge to add a smaller, closer stake to prop it up. Let the real reason carry {{child_pronoun_obj}}, or find out it wasn't quite real enough.`,
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
        "8-9": "Just watch. Notice: does {{child_name}} stay excited through something short, but lose steam on something longer?",
        "10-11": "Just watch. Notice where {{child_name}} already shows up fully for something with a real, immediate stake — and where a longer task with a stake further off still loses {{child_pronoun_poss}} attention partway through.",
        "12-14": "Notice where {{child_name}} shows up fully for something with an immediate stake versus a longer task where the stake feels far off.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Set a stake that runs across days, not one sitting.",
      content: {
        "8-9": "Give a real reason to stick with something longer. Find something real — a promise to someone, a real deadline — attached to a task that takes more than one sitting.",
        "10-11": "Build a real stake into a longer task. Find or create a genuine stake attached to something that takes more than one sitting to finish — not manufactured pressure, but something real: a deadline that matters, a person counting on the outcome, a real consequence tied to completion.",
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
        "8-9": "Do it again. Fork: Worked — let the real reason carry {{child_pronoun_subj}} through. Mixed — notice where the energy dropped. Didn't land — find a closer, more immediate reason.",
        "10-11": `Do it again. Fork: Worked — let the stake keep carrying {{child_name}} through the length of the task. Don't add more pressure on top of what's already real. Mixed — did the stake carry {{child_pronoun_subj}} through part of the task and then fade? Notice where the energy dropped. Didn't land — the stake might not have been real or immediate enough once the task stretched out. Look for something with a clearer, closer consequence.`,
        "12-14": "**Worked** — let the stake keep carrying {{child_name}} without adding more pressure on top. **Mixed** — talk about where the energy dropped partway through. **Didn't land** — find something with a closer, clearer consequence.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let the energy dip mid-way without rescuing it.",
      content: {
        "8-9": "Let it not work out, honestly. If the real thing {{child_name}} was working toward doesn't pan out, don't soften it with a made-up win. Let it be real.",
        "10-11": "Let the stake fail to pay off partway, honestly. Somewhere in the longer task, the real stake might not go {{child_name}}'s way — a deadline gets missed, an outcome falls short. Don't manufacture a rescue-stake to soften it. Let the real consequence be real.",
        "12-14": "If the real consequence doesn't go {{child_name}}'s way partway through, don't manufacture a rescue-stake to soften it.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they carried it past the exciting part.",
      content: {
        "8-9": `Name it. "You stuck with that the whole way, not just the fun part at the start. That's real follow-through."`,
        "10-11": `Name it. Tell {{child_name}}: "You stayed with this the whole way through, not just the exciting first part. That's what real follow-through looks like."`,
        "12-14": `*"You stayed with this the whole way through, not just the exciting first part. That's real follow-through."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did the real stake keep {{child_name}} going across the whole task?",
      "10-11": "Did the stake keep {{child_name}} engaged across the whole task, or only in the first burst?",
      "12-14": "Ask {{child_name}} directly whether the real stake kept {{child_pronoun_subj}} engaged across the whole task, or only at the start.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
