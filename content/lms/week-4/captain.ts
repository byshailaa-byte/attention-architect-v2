import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "captain",
  week: 4,
  weekTitle: "When It Falls Apart on Their Watch",

  weeklyReading: {
    introShared: `Week 3 sustained leadership over an ongoing responsibility. This week tests what happens when something under {{child_name}}'s leadership genuinely goes wrong — not a hiccup, a real failure that reflects on {{child_pronoun_poss}} choices as the one in charge.`,

    moveCalibration: {
      "8-9": `The instinct will be to step in and quietly manage the outcome once things start going wrong under {{child_name}}'s watch. Let the failure stay {{child_pronoun_poss}} to own and respond to, even if the fix would be faster coming from you.`,
      "10-11": `Watch for redirecting blame gently onto circumstances ("that wasn't really your fault") to soften the failure. Sometimes real leadership means owning a failure that was, at least partly, a leadership choice.`,
      "12-14": `At this age, a real leadership failure can trigger a bigger parental instinct to reassess whether {{child_name}} is "ready" for responsibility. Resist generalizing from one failure — it's information about this instance, not a verdict on readiness.`,
    },

    moveOutroShared: `Pick a real, recoverable failure under {{child_name}}'s leadership — not one engineered to fail, and not one with stakes beyond what's appropriate.`,

    whatWorkingLooksLike: `A real failure under {{child_name}}'s leadership gets treated as part of leading, not as evidence {{child_pronoun_subj}} shouldn't be trusted with it.`,

    thingToHoldOnto: `Leadership that's never allowed to fail isn't leadership — it's supervision with extra steps.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice where something under {{child_name}}'s leadership is genuinely at risk of not going well.",
        "10-11": "Same, and notice whether your read on \"at risk\" is about the actual plan or about a different plan you'd have chosen.",
        "12-14": "Notice a responsibility where {{child_name}} is confident and you're less sure — and notice that gap as the real thing under test.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let it go wrong without stepping in to manage it.",
      content: {
        "8-9": "Don't step in to correct course. Let {{child_name}} notice it's going wrong and decide how to respond.",
        "10-11": `Resist offering a "heads up" that quietly redirects the plan before it fails.`,
        "12-14": "Say nothing at all, including afterward when {{child_name}} might expect your read on it.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — the failure happened and {{child_name}} owned the response without your intervention. Keep holding that.\n**Mixed** — you held back from directing but offered your read on what went wrong afterward, unprompted. Notice whether that was requested.\n**Didn't land** — you stepped in to manage it. Worth naming what made this failure feel too costly to let play out.`,
        "10-11": `**Worked** — the failure happened and {{child_name}} owned the response without your intervention. Keep holding that.\n**Mixed** — you held back from directing but offered your read on what went wrong afterward, unprompted. Notice whether that was requested.\n**Didn't land** — you stepped in to manage it. Worth naming what made this failure feel too costly to let play out.`,
        "12-14": `**Worked** — the failure happened and {{child_name}} owned the response without your intervention. Keep holding that.\n**Mixed** — you held back from directing but offered your read on what went wrong afterward, unprompted. Notice whether that was requested.\n**Didn't land** — you stepped in to manage it. Worth naming what made this failure feel too costly to let play out.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Skip the post-mortem unless they ask for one.",
      content: {
        "8-9": "Let a genuine responsibility fail under {{child_name}}'s leadership with no rescue and no post-mortem unless {{child_pronoun_subj}} asks.",
        "10-11": "Same, but pick something that affects someone else (a sibling, a group) so the failure has real weight, not just personal inconvenience.",
        "12-14": "Let {{child_name}} be the one to decide how — or whether — to address the failure with whoever it affected, without your coaching unless asked.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say how they responded is the leadership, not never failing.",
      content: {
        "8-9": `*"That didn't go the way you led it. How you respond is the real leadership."*`,
        "10-11": `*"That one didn't work out under your lead. That happens — what matters is what you do next."*`,
        "12-14": `*"That failed under your leadership. Doesn't mean you shouldn't lead next time."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did the failure shake {{child_name}}'s willingness to lead next time, or did {{child_pronoun_subj}} bounce back into it?",
      "10-11": "How did {{child_name}} actually handle the aftermath, without your input?",
      "12-14": "Did {{child_name}} take real ownership of the failure, or quietly deflect it — and how did you respond to whichever one happened?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
