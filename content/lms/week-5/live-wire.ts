import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — the shared stake ran its course honestly for both. Keep letting that happen.\n**Mixed** — the stake held for {{child_name}} but you softened it for the other person. Notice why the asymmetry felt necessary.\n**Didn't land** — you managed the outcome to protect both from real consequence. Worth naming what made this one feel too risky to let ride for both of them.`;

export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 5,
  weekTitle: "When Someone Else Loses Too",

  weeklyReading: {
    introShared: `Stakes have survived a real loss that mattered. This week: what happens when the stake isn't just {{child_name}}'s to bear — a sibling or peer shares in the consequence too?`,

    moveCalibration: {
      "8-9": `The instinct will be to lower the shared stake to protect the other person from disappointment. Let {{child_name}} and the other person set the real terms together, even if it means real risk for both.`,
      "10-11": `Watch for stepping in to manage the shared outcome so neither child feels the full weight. Let the shared stake carry its real weight for both of them.`,
      "12-14": `At this age, {{child_name}} may resist a shared stake to avoid being responsible for someone else's disappointment. Notice that avoidance and name it honestly rather than letting {{child_pronoun_obj}} quietly opt out.`,
    },

    moveOutroShared: `This is about genuinely shared stakes — a joint bet, a shared goal — not one person's stake with an innocent bystander attached.`,

    whatWorkingLooksLike: `{{child_name}} sets and holds genuinely shared stakes, letting the real consequence land for both people, not just softening it to protect someone else.`,

    thingToHoldOnto: `A shared stake that gets quietly protected for the other person isn't really shared — it's still just {{child_name}}'s stake with company.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a stake this week that {{child_name}} and someone else genuinely share the outcome of.",
        "10-11": "Same, and notice whether {{child_name}} tends to protect the other person from the real weight of the stake.",
        "12-14": "Notice a shared stake where {{child_name}} might be tempted to opt out to avoid being responsible for someone else's disappointment.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them set a shared stake with real weight for both.",
      content: {
        "8-9": "Don't soften the shared stake in advance. Let {{child_name}} and the other person agree to something with real weight for both.",
        "10-11": `Resist stepping in to balance the stake so it feels "fair" — let the two of them negotiate the real terms.`,
        "12-14": "If {{child_name}} tries to opt out of a shared stake, name that honestly rather than letting {{child_pronoun_obj}} quietly avoid it.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: { "8-9": D3, "10-11": D3, "12-14": D3 },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Don't quietly protect the other kid from the outcome.",
      content: {
        "8-9": "Let a genuine shared stake play out honestly for both {{child_name}} and the other person — win or lose, together.",
        "10-11": "Same, but pick a stake with a real, felt consequence for both sides, not just a token shared bet.",
        "12-14": "Let {{child_name}} be the one to check in with the other person about how the shared outcome landed, rather than you managing that conversation.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they let it be real for both of them.",
      content: {
        "8-9": `*"That stake wasn't just yours — you shared the outcome with {{child_pronoun_obj}} and it was real for both of you. That's a bigger kind of stakes."*`,
        "10-11": `*"You let that be real for both of you, even though it was risky. That's honest."*`,
        "12-14": `*"You didn't protect them from the real outcome, and you didn't avoid it yourself either. That's what shared stakes actually looks like."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} get more comfortable with someone else sharing the weight of a stake by week's end?",
      "10-11": "Did {{child_name}} try to protect the other person less as the week went on?",
      "12-14": "Did {{child_name}}'s willingness to enter shared stakes shift at all this week?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
