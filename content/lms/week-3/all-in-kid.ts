import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 3,
  weekTitle: "Protected Depth, Sustained",

  weeklyReading: {
    introShared: `Week 1 tested something specific: what happens when your child gets one genuinely protected block of time, with zero interruptions, for something they're deeply absorbed in. Week 2 asked whether that same protection could exist around screens without becoming a fight. This week asks whether it holds across something longer — a whole stretch with more than one activity in it, including the transitions between them.

The recap that matters: an All-In Kid's attention isn't scattered. It goes narrow and deep, and interruption costs more for this kind of attention than most others — pulling them out mid-absorption isn't a small correction, it's a real cost every time. Weeks 1 and 2 protected a single block. This week protects a whole afternoon or evening, transitions included, because the transitions are often where the real interruptions sneak in — not during the deep-focus block itself, but in the in-between moments where a quick check-in feels harmless.

This week's move: pick a stretch with more than one activity, and protect the entire thing from interruption — not just the visible deep-focus part. No "how's it going," no check-ins, across transitions too.

Somewhere in that longer stretch, something will likely not go smoothly. A stuck moment, a frustration, a shift in plan. The instinct to step in during that moment will be strong, especially since it's tempting to think the protection was really only meant for the easy parts. It wasn't. Protected depth that only holds when things are going well isn't really protection — it's convenience.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `The hardest part of this week is usually the transitions, not the focus block itself. It's easy to protect a single quiet stretch of deep work. It's much easier to accidentally interrupt right as your child shifts from one activity to the next, because that moment doesn't look like "interrupting deep focus" — it looks like an ordinary check-in. Watch for that specifically. If the week goes sideways, it's very often there, not in the middle of the actual absorbed work.`,
    },

    moveOutroShared: `That's the work this week — extending protection across a stretch instead of a single block, transitions included. Some of it will hold easily. Some of it, especially the in-between moments, may take real, ongoing attention on your part to actually protect.`,

    whatWorkingLooksLike: `You may notice your child moving between activities within the protected stretch without needing you to re-anchor them each time — carrying their own momentum across the transition, not losing it every time something shifts. A rough patch that gets worked through rather than escalated into needing you is often the clearest sign the protection is holding under real conditions, not just easy ones. Some children will hold the whole stretch cleanly; others will hold most of it and lose the thread at one particular transition — both are genuinely useful information about where the protection needs to be tightest.`,

    thingToHoldOnto: `Depth that only survives easy conditions isn't the same as depth that's actually theirs. This week is harder to protect than Week 1 was, on purpose — what you're building toward isn't a flawless stretch, it's a clearer sense of exactly where the protection is solid and where it still needs your help to hold.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Notice how {{child_name}} handles a longer, uninterrupted stretch this week compared to the shorter blocks from before.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Protect a real stretch, explicitly.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `Tell {{child_name}}: *"I'm not going to check in on you this whole stretch — that's yours, uninterrupted."* Then actually hold to it, even across transitions.`,
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
        "12-14": "**Worked** — extend it further and say so. **Mixed** — talk with {{child_name}} about which parts of the stretch held and which slipped. **Didn't land** — shorten the stretch and rebuild the length gradually.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let a rough patch happen without rescue.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "If {{child_name}} hits frustration or a stuck point mid-stretch, don't step in. Protected depth includes protecting the struggle, not just the flow.",
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
        "12-14": `*"You held focus across the whole stretch, including the hard part. That's real depth, not just when it's easy."*`,
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
      "12-14": "Ask {{child_name}} directly how the longer stretch felt, especially through the rough patch.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
