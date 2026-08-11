import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 3,
  weekTitle: "Beyond One Task",

  weeklyReading: {
    introShared: `This is Week 3 of a program built specifically for a Storm. Week 1 tested one thing: does real ownership over a single task actually change how your child shows up for it. Week 2 asked whether that same ownership holds up around screens — one of the hardest places to hand over control. This week asks something different: does it hold across a whole stretch, not just one moment you set up carefully?

Quick recap of what matters: a Storm's attention isn't missing. It switches off the instant something feels like it's being done *to* them rather than *by* them. Ownership is the on-switch. Weeks 1 and 2 proved that's true in a single, contained instance. That's a real result — but a single instance is still something you can engineer. A whole afternoon, with several pieces and real friction along the way, is harder to fake.

This week's move: instead of one task with real choice, your child gets a whole routine — several pieces strung together, like an after-school sequence — with real say over the order and pacing of the entire thing. Not "pick which homework to do first." The whole stretch, start to finish, is theirs to run.

Why this matters more than it might seem: a Storm who only gets ownership when you've carefully set it up learns that focus is something you grant, not something they generate. A Storm who holds ownership across a messier, longer stretch — including the part where something goes sideways — is building something closer to a real, durable skill.

This week may not go as smoothly as Weeks 1 and 2. That's expected, not a sign it isn't working. A single task is easier to protect than a whole afternoon. What you're actually testing this week is whether the ownership generalizes, or whether it was only ever working because the conditions were unusually clean.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `Your work this week is mostly about restraint. The instinct to step back in — to reorganize the routine, to smooth over a rough patch, to "just help a little" — will show up more this week than it did in Weeks 1–2, because there's more surface area for something to go sideways. Every time you feel that pull, that's the actual test happening in real time, not a sign the approach needs adjusting. Let the routine be genuinely theirs, including the parts that don't go well. If something needs to change, change the *size* of the routine next time — not how involved you are in running it.`,
    },

    moveOutroShared: `That's the work this week — not managing a single moment well, but staying out of a whole stretch long enough to see whether the ownership actually holds. Some weeks it will. Some weeks it'll slip halfway through. Both are real, useful information about where your child's ownership is actually solid right now.`,

    whatWorkingLooksLike: `You may notice your child moving through the routine without checking in on what's next — genuinely tracking it themselves, not performing independence for your benefit. A rough patch that doesn't automatically turn into a call for help is often a stronger sign than a routine that goes perfectly, since it suggests the ownership held under real pressure, not just easy conditions. Some Storms will hold the whole stretch; others will hold most of it and need the routine trimmed next time. Both are genuine signs of progress, not a pass/fail result.`,

    thingToHoldOnto: `If this week is messier than Weeks 1 and 2, that's not a step backward — a whole routine is a genuinely harder thing to hold onto than one task, and testing it honestly means it won't always go clean. What you're building isn't a perfect week. It's a more accurate picture of where the ownership is solid and where it still needs a smaller container.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "This week, pay attention to how {{child_name}} handles a stretch with several things to get through, compared to just one task. Where does {{child_pronoun_poss}} ownership already show up, and where does it drop off?",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Hand over the whole stretch.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `Talk to {{child_name}} directly: *"I want you to run your own afternoon this week — the order, the pacing, all of it. I'm not going to manage the pieces."* Mean it, and follow through even when it's tempting to redirect.`,
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
        "12-14": "**Worked** — tell {{child_name}} this is the new normal, not a one-week trial. **Mixed** — talk through together what held and what didn't; let {{child_pronoun_subj}} name it, not just you. **Didn't land** — scale back to a two-part stretch and rebuild the trust from there.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let a real snag play out.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "When the plan goes sideways this week — and it likely will at some point — resist stepping in to manage it. This is the actual test of whether the ownership is real.",
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
        "12-14": `*"You ran your whole week, not just one task. That's real ownership — I noticed, and I'm not going to take it back."*`,
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
      "12-14": "Talk with {{child_name}} about whether the ownership held across the week. Ask {{child_pronoun_subj}} directly what {{child_pronoun_subj}} noticed, not just what you observed.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
