import type { LmsWeekContent } from "@/content/types";

// Week 3 — all bands (8–9, 10–11, 12–14) authored.
export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 3,
  weekTitle: "Staying with it on an ordinary day",

  weeklyReading: {
    introShared: `This is Week 3 of a program built specifically for a Storm. Week 1 tested one thing: does real ownership over a single task actually change how your child shows up for it. Week 2 asked whether that same ownership holds up around screens — one of the hardest places to hand over control. This week asks something different: does it hold across a whole stretch, not just one moment you set up carefully?

Quick recap of what matters: a Storm's attention isn't missing. It switches off the instant something feels like it's being done *to* them rather than *by* them. Ownership is the on-switch. Weeks 1 and 2 proved that's true in a single, contained instance. That's a real result — but a single instance is still something you can engineer. A whole afternoon, with several pieces and real friction along the way, is harder to fake.

This week's move: instead of one task with real choice, your child gets a whole routine — several pieces strung together, like an after-school sequence — with real say over the order and pacing of the entire thing. Not "pick which homework to do first." The whole stretch, start to finish, is theirs to run.

Why this matters more than it might seem: a Storm who only gets ownership when you've carefully set it up learns that focus is something you grant, not something they generate. A Storm who holds ownership across a messier, longer stretch — including the part where something goes sideways — is building something closer to a real, durable skill.

This week may not go as smoothly as Weeks 1 and 2. That's expected, not a sign it isn't working. A single task is easier to protect than a whole afternoon. What you're actually testing this week is whether the ownership generalizes, or whether it was only ever working because the conditions were unusually clean.`,

    moveCalibration: {
      "8-9": `You'll want to jump in the moment something in the stretch doesn't go smoothly — that's the normal instinct, and it's also the exact moment to hold back. A wobble isn't proof the stretch was too much for {{child_name}}. If it needs to get smaller next time, make it shorter, not more managed.`,
      "10-11": `The pull to step in will show up most right when the routine starts slipping — a step forgotten, timing thrown off. That's not a sign the choice was too big for {{child_name}}; it's the actual test happening. If it needs to shrink next time, shrink how many pieces are in the routine, not how much say {{child_pronoun_subj}} has over it.`,
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
        "8-9": "Just watch. Notice today: does {{child_name}} get a say in just one thing, or in a few things in a row?",
        "10-11": `Just watch. No move yet. Today, notice where {{child_name}} already gets real choice in a single task versus where {{child_pronoun_subj}} doesn't get any say across a whole stretch of the day — homework time, the after-school routine, whatever has multiple pieces strung together. Just notice the difference in how {{child_pronoun_subj}} moves through each.`,
        "12-14": "This week, pay attention to how {{child_name}} handles a stretch with several things to get through, compared to just one task. Where does {{child_pronoun_poss}} ownership already show up, and where does it drop off?",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Hand them the whole stretch, not just the first step.",
      content: {
        "8-9": `Let {{child_name}} run a few things in a row. Pick a stretch with a few steps — like getting ready after school. Let {{child_name}} pick the order. "You choose what comes first, second, and last."`,
        "10-11": `Hand over a whole routine, not just one task. Pick a routine with several pieces — not "clean your room" but something like the whole after-school sequence: snack, homework, free time, before dinner. Hand {{child_name}} real say over the order and pacing of the whole thing, not just one piece of it. "You've got these things to get through before dinner. You decide the order."`,
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
        "8-9": "Do it again. Fork: Worked — let {{child_pronoun_subj}} run it again tomorrow, no help needed. Mixed — notice which part still needed you. Didn't land — try just two things in a row first, not a whole stretch.",
        "10-11": `Do it again. Fork: Worked — offer the same routine-level choice again tomorrow. Don't add structure back in; let the ownership stay at the routine level, not shrink back to task level. Mixed — notice where it held and where it slipped. Did {{child_pronoun_subj}} own the order but still need a nudge on timing? That's real progress, not failure — name what worked before what didn't. Didn't land — the jump from one task to a whole routine may have been too big at once. Go back to two connected tasks with real choice between them, and build from there.`,
        "12-14": "**Worked** — tell {{child_name}} this is the new normal, not a one-week trial. **Mixed** — talk through together what held and what didn't; let {{child_pronoun_subj}} name it, not just you. **Didn't land** — scale back to a two-part stretch and rebuild the trust from there.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "When it snags mid-way, don't step in to smooth it.",
      content: {
        "8-9": "Let something not go perfectly. Somewhere in the stretch, something won't go smoothly. Don't jump in. Let {{child_name}} figure out the next step.",
        "10-11": "A longer stretch, with a real snag built in. Let the routine run across a tougher day — one with less time, or one more thing added in. Resist stepping in to manage it even when the plan starts slipping. This is where ownership either holds under real pressure or reverts to needing a manager.",
        "12-14": "When the plan goes sideways this week — and it likely will at some point — resist stepping in to manage it. This is the actual test of whether the ownership is real.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say what they held onto, not that they got through it.",
      content: {
        "8-9": `Name it. "You ran that whole thing yourself — not just one part. That's a big deal."`,
        "10-11": `Name it. Tell {{child_name}} directly: "You ran your whole afternoon this week. That's real ownership — noticing what needs doing and deciding how to move through it, not just doing one thing when asked."`,
        "12-14": `*"You ran your whole week, not just one task. That's real ownership — I noticed, and I'm not going to take it back."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did the choosing hold across the whole stretch, or just the first part?",
      "10-11": "Did the ownership hold across the routine, or did it need to shrink back down to single tasks? Either answer is useful data, not a verdict on {{child_name}}.",
      "12-14": "Talk with {{child_name}} about whether the ownership held across the week. Ask {{child_pronoun_subj}} directly what {{child_pronoun_subj}} noticed, not just what you observed.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
