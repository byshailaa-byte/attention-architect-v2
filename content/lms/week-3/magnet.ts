import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 3,
  weekTitle: "Presence, Sustained",

  weeklyReading: {
    introShared: `Week 1 tested something quiet: whether simply being nearby, without offering guidance or correction, changed how your child engaged with what they were doing. Week 2 tested that same steady presence around screens. This week asks whether that presence can extend across a longer stretch — more than one activity, more time — without turning into supervision somewhere along the way.

What's worth holding onto: a Magnet's attention isn't dependent on your input. It's supported by your presence itself — the fact that you're there is the resource, not what you say while you're there. Weeks 1 and 2 proved this works for a single, contained stretch. This week tests whether it holds for longer, because the longer the stretch, the stronger the pull to eventually say something — a suggestion, a check-in, a small correction — that quietly turns presence into supervision.

This week's move: sit with your child through a longer stretch than usual, spanning more than one activity if possible, without offering guidance, correction, or check-ins along the way. The presence is the whole point. Anything added on top of it — even something well-meant — dilutes what makes it work.

Somewhere in that longer stretch, something will likely go sideways for your child — a frustration, a mistake, a stuck moment. The instinct in that moment is to become useful, to fix it or guide them through it. This week asks you to stay present without doing either — not fixing, not leaving, just remaining.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `The hardest part of this week is usually not the first twenty minutes — it's later, once the stretch has gone on longer than usual and staying quiet starts to feel like you're not doing anything. That feeling is the actual signal you're on the right track, not a sign something's missing. If you notice yourself about to speak, pause and ask whether what you're about to say is actually needed, or just something to do with the discomfort of staying quiet.`,
    },

    moveOutroShared: `That's the work this week — not a longer silence for its own sake, but finding out whether your presence alone, extended and unmixed with input, still carries the same weight it did in Weeks 1 and 2.`,

    whatWorkingLooksLike: `You may notice your child settling further into what they're doing the longer the stretch goes, rather than needing more from you as time passes. A rough moment that resolves with you simply staying present — no fix offered, no input needed — is often a stronger sign than a stretch that never hits a rough moment at all, since it shows the presence itself is doing real work. Some stretches will hold the whole way through; others may need to be shorter for now, and that's useful information, not a shortfall.`,

    thingToHoldOnto: `Presence that only lasts twenty minutes before needing to become useful isn't quite the same skill as presence that holds for the whole stretch. This week isn't about proving you can stay quiet — it's about finding out how long your quiet presence alone can actually carry your child.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Notice how your presence tends to shift into a check-in or a suggestion after a certain length of time.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Extend your presence without adding input.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Sit with {{child_name}} through a longer, multi-part stretch without offering guidance or correction. The presence is the resource.",
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
        "12-14": "**Worked** — extend it further. **Mixed** — notice what pulled you into a check-in, and name that to yourself honestly. **Didn't land** — shorten the stretch and rebuild the duration gradually.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Stay through a rough moment.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "When something goes sideways for {{child_name}} during the stretch, stay present without fixing it or stepping away.",
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
        "12-14": `*"I was here with you through the whole thing, even the hard part. You didn't need me to fix it — just to be there."*`,
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
      "12-14": "Ask {{child_name}} whether your presence felt different this week — steadier, less like supervision.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
