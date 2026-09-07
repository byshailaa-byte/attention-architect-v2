import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 5,
  weekTitle: "Using it beyond homework",

  weeklyReading: {
    introShared: `Week 4 tested whether {{child_name}}'s ownership survived a real bad outcome. This week is different in kind, not just degree: what happens when the choice isn't purely {{child_pronoun_poss}} to make, because a sibling or someone else is genuinely affected by it? Ownership has to learn to share a room.`,

    moveCalibration: {
      "8-9": `The instinct will be to arbitrate for {{child_name}} the moment a choice touches a sibling — "you two need to agree on this." Let {{child_name}} try to negotiate it directly first, even clumsily, before you referee.`,
      "10-11": `Watch for stepping in to protect the sibling's interests preemptively, before {{child_name}} has even had the chance to consider them. Let {{child_pronoun_obj}} discover the other person's stake on {{child_pronoun_poss}} own.`,
      "12-14": `At this age, {{child_name}} may resist the idea that a choice isn't fully {{child_pronoun_poss}} just because someone else is involved. Don't force acknowledgment of the other person's stake — let a real friction moment make that case instead of you.`,
    },

    moveOutroShared: `Pick situations where the stakes for the other person are real but recoverable — a shared space, a joint plan, something genuinely contested.`,

    whatWorkingLooksLike: `{{child_name}} negotiates directly with the other person before looking to you to referee. Ownership includes making room for someone else's stake, not just defending {{child_pronoun_poss}} own.`,

    thingToHoldOnto: `Ownership that can't share a room with someone else's stake isn't finished growing yet.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a choice this week where a sibling or friend has a real stake in what {{child_name}} decides.",
        "10-11": "Same, and notice whether {{child_name}} even registers the other person's stake without being prompted.",
        "12-14": "Notice a choice where {{child_name}}'s instinct is to decide first and inform the other person after.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them work it out with their sibling before you referee.",
      content: {
        "8-9": "When it comes up, step back and let {{child_name}} try to work it out directly, even if it's clumsy or unresolved at first.",
        "10-11": "Resist the urge to suggest a compromise. Let one attempt at negotiation happen fully on {{child_pronoun_poss}} own terms.",
        "12-14": "Say nothing at all unless asked to mediate — even a raised eyebrow can nudge the outcome at this age.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — {{child_name}} negotiated something real without your input. Keep stepping back; don't debrief the negotiation afterward unless asked.\n**Mixed** — the negotiation partly worked but you stepped in to smooth the rough parts. Notice what made that moment feel too fragile to leave alone.\n**Didn't land** — you arbitrated. Worth naming honestly what made this one feel like it needed a referee.`,
        "10-11": `**Worked** — {{child_name}} negotiated something real without your input. Keep stepping back; don't debrief the negotiation afterward unless asked.\n**Mixed** — the negotiation partly worked but you stepped in to smooth the rough parts. Notice what made that moment feel too fragile to leave alone.\n**Didn't land** — you arbitrated. Worth naming honestly what made this one feel like it needed a referee.`,
        "12-14": `**Worked** — {{child_name}} negotiated something real without your input. Keep stepping back; don't debrief the negotiation afterward unless asked.\n**Mixed** — the negotiation partly worked but you stepped in to smooth the rough parts. Notice what made that moment feel too fragile to leave alone.\n**Didn't land** — you arbitrated. Worth naming honestly what made this one feel like it needed a referee.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let it get genuinely contested, and stay out of it.",
      content: {
        "8-9": "Choose a genuinely shared decision (whose turn, what to do together) and let {{child_name}} and the other person work it out with zero input from you, even if it stalls.",
        "10-11": "Same, but pick something with a real cost to getting it wrong — a shared plan that only works if both agree.",
        "12-14": "Let the negotiation include real disagreement, not just a quick handoff — don't rescue it the moment it gets uncomfortable.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they made room for someone else, not that they shared nicely.",
      content: {
        "8-9": `*"You two worked that out yourselves. That's a real skill — deciding together."*`,
        "10-11": `*"That wasn't just your call, and you handled it with {{child_pronoun_obj}} directly. That matters."*`,
        "12-14": `*"You made room for someone else's stake in that. That's what real ownership looks like when it's not just about you."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} get more comfortable negotiating directly by the end of the week?",
      "10-11": "Where did the urge to step in and mediate come from — the situation, or your own discomfort watching it unresolved?",
      "12-14": "Did {{child_name}} start factoring in the other person's stake earlier in the process by week's end?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
