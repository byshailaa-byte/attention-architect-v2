import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 3,
  weekTitle: "Protecting It on the Days It's Inconvenient",

  weeklyReading: {
    introShared: `Week 1 tested something specific: what happens when your child gets one genuinely protected block of time, with zero interruptions, for something they're deeply absorbed in. Week 2 asked whether that same protection could exist around screens without becoming a fight. This week asks whether it holds across something longer — a whole stretch with more than one activity in it, including the transitions between them.

The recap that matters: an All-In Kid's attention isn't scattered. It goes narrow and deep, and interruption costs more for this kind of attention than most others — pulling them out mid-absorption isn't a small correction, it's a real cost every time. Weeks 1 and 2 protected a single block. This week protects a whole afternoon or evening, transitions included, because the transitions are often where the real interruptions sneak in — not during the deep-focus block itself, but in the in-between moments where a quick check-in feels harmless.

This week's move: pick a stretch with more than one activity, and protect the entire thing from interruption — not just the visible deep-focus part. No "how's it going," no check-ins, across transitions too.

Somewhere in that longer stretch, something will likely not go smoothly. A stuck moment, a frustration, a shift in plan. The instinct to step in during that moment will be strong, especially since it's tempting to think the protection was really only meant for the easy parts. It wasn't. Protected depth that only holds when things are going well isn't really protection — it's convenience.`,

    moveCalibration: {
      "8-9": `The quiet stretch itself is usually easy to protect. It's the moment right after — when {{child_name}} finishes one thing and moves to the next — where a "how'd that go?" sneaks in without you noticing. Watch there most.`,
      "10-11": `Watch the transitions more than the focus block itself — it's easy to protect one quiet stretch, harder to notice you've interrupted right as {{child_name}} shifts from one part of the routine to the next. That ordinary-looking check-in is usually where the protection actually breaks, not the middle of the real work.`,
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
        "8-9": "Just watch. Notice how long {{child_name}} gets left alone with something {{child_pronoun_subj}} loves, without a check-in.",
        "10-11": "Just watch. No move yet. Today, notice where {{child_name}} already gets one protected block of uninterrupted time, and where {{child_pronoun_poss}} day still gets chopped into interruptions even during things {{child_pronoun_subj}} cares about.",
        "12-14": "Notice how {{child_name}} handles a longer, uninterrupted stretch this week compared to the shorter blocks from before.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Keep the block even on the day it's least convenient for you.",
      content: {
        "8-9": "Protect a longer stretch. Let {{child_name}} go a good long while — through more than one part of an activity — with zero check-ins from you.",
        "10-11": `Protect a whole stretch, not just one block. Pick an afternoon or evening routine with more than one activity in it. Protect the whole stretch from interruption — not just the single deep-focus block you protected in Week 1, but the transitions in between too. No check-ins, no "how's it going," across the whole thing.`,
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
        "8-9": "Do it again. Fork: Worked — go a little longer next time. Mixed — notice where the quiet almost got interrupted. Didn't land — go back to a shorter protected time and build up slowly.",
        "10-11": `Do it again. Fork: Worked — extend the protected stretch again. The muscle is building. Mixed — where did the protection slip? Often it's the transition moments, not the focus itself, that get interrupted. Note that pattern. Didn't land — the stretch may have been too long. Go back to two connected blocks with a protected transition between them.`,
        "12-14": "**Worked** — extend it further and say so. **Mixed** — talk with {{child_name}} about which parts of the stretch held and which slipped. **Didn't land** — shorten the stretch and rebuild the length gradually.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "When something else comes up, protect it anyway once.",
      content: {
        "8-9": "Let a tricky moment happen. If {{child_name}} gets stuck or frustrated during the stretch, don't step in. Let {{child_pronoun_subj}} work through it.",
        "10-11": "Let a session run into a rough patch. Somewhere in the protected stretch, something won't go smoothly — {{child_name}} gets stuck, frustrated, or the plan shifts. Don't rescue it. Protected depth includes protecting {{child_pronoun_poss}} right to work through the rough patch too.",
        "12-14": "If {{child_name}} hits frustration or a stuck point mid-stretch, don't step in. Protected depth includes protecting the struggle, not just the flow.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say you kept it, and why it mattered that you did.",
      content: {
        "8-9": `Name it. "You stayed with that for a long time, even the tricky part. That's real focus."`,
        "10-11": `Name it. Tell {{child_name}}: "You held your own focus across the whole afternoon, even when part of it got hard. That's real depth — not just when things are easy."`,
        "12-14": `*"You held focus across the whole stretch, including the hard part. That's real depth, not just when it's easy."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did the quiet time hold, even through the hard moment?",
      "10-11": "Did the protection hold across the whole stretch, including the harder moments, or only the easy parts?",
      "12-14": "Ask {{child_name}} directly how the longer stretch felt, especially through the rough patch.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
