import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "glue",
  week: 3,
  weekTitle: "Connection-First, Daily",

  weeklyReading: {
    introShared: `Week 1 tested a specific idea: that connecting with your child before asking anything of them — genuinely, without an agenda — changes what they're able to do afterward. Week 2 tested that same sequence specifically around screens. This week asks whether connection-first can become a daily standard, not just something that happens on the days there's time for it.

The thing worth remembering: for a Glue, connection isn't separate from focus — it's the actual precondition for it. When the relationship feels unsettled, focus doesn't fully arrive, no matter how the task itself is structured. Weeks 1 and 2 proved that connecting first, even briefly, changes what becomes possible next. This week tests whether that holds up on the days it's genuinely inconvenient — the busy days, the rushed mornings, the days connection is the first thing that feels expendable.

This week's move: every day this week, before any task or request, spend a few real minutes connecting with your child first — no agenda, no lead-in to what you actually need from them. Just presence and conversation, and only then the task.

The real test this week isn't the easy days. It's the hardest, most time-pressured day of the week — the one where skipping connection would feel the most justified. Holding the sequence there, specifically, is what tells you whether it's become a real habit or was only ever a good-day practice.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `Watch which days connection-first gets skipped, and notice honestly why — usually it's not that you forgot, it's that the day felt too rushed to justify it. That instinct is worth naming to yourself directly, because it's exactly the instinct this week is testing. If the habit needs to shrink to survive busy days, shrink the length of the connection, not its place at the front of the sequence.`,
    },

    moveOutroShared: `That's the work this week — not connection on the easy days, but connection first on the day it would have been most tempting to skip it.`,

    whatWorkingLooksLike: `You may notice the task that follows connection going more smoothly than it would have otherwise — not because the task changed, but because your child arrived at it differently. The clearest sign this is working usually shows up on the hardest day, not the easy ones — if connection-first held there, that's a stronger result than five easy days in a row. Some days it may still get skipped under real pressure, and noticing that honestly is more useful than pretending it didn't happen.`,

    thingToHoldOnto: `A habit that only survives on calm days isn't quite a habit yet — it's a preference. What this week is actually testing isn't whether you can connect first when it's easy. It's whether it holds on the one day it would have been easiest to let go.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Notice which days this week connection happens before a task is asked of {{child_name}}, and which days it gets skipped under time pressure.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Make connection-first a daily standard, not a good-day habit.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `Tell {{child_name}}: *"Before I ask you for anything this week, we connect first — every day, including the busy ones."*`,
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
        "12-14": "**Worked** — keep it as the daily standard, no exceptions. **Mixed** — talk honestly about which days it slipped and why. **Didn't land** — shorten the connection window but hold it non-negotiably every day.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Hold it on the hardest day.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Pick the most time-pressured day this week and still lead with real connection before any ask.",
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
        "12-14": `*"We connected first every day this week, even the hardest one. That's not occasional anymore — that's how we do things."*`,
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
      "12-14": "Ask {{child_name}} whether {{child_pronoun_subj}} noticed the difference on the hard day.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
