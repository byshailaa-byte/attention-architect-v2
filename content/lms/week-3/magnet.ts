import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 3,
  weekTitle: "Staying with it on an ordinary day",

  weeklyReading: {
    introShared: `Week 1 tested something quiet: whether simply being nearby, without offering guidance or correction, changed how your child engaged with what they were doing. Week 2 tested that same steady presence around screens. This week asks whether that presence can extend across a longer stretch — more than one activity, more time — without turning into supervision somewhere along the way.

What's worth holding onto: a Magnet's attention isn't dependent on your input. It's supported by your presence itself — the fact that you're there is the resource, not what you say while you're there. Weeks 1 and 2 proved this works for a single, contained stretch. This week tests whether it holds for longer, because the longer the stretch, the stronger the pull to eventually say something — a suggestion, a check-in, a small correction — that quietly turns presence into supervision.

This week's move: sit with your child through a longer stretch than usual, spanning more than one activity if possible, without offering guidance, correction, or check-ins along the way. The presence is the whole point. Anything added on top of it — even something well-meant — dilutes what makes it work.

Somewhere in that longer stretch, something will likely go sideways for your child — a frustration, a mistake, a stuck moment. The instinct in that moment is to become useful, to fix it or guide them through it. This week asks you to stay present without doing either — not fixing, not leaving, just remaining.`,

    moveCalibration: {
      "8-9": `Just sitting near {{child_name}} without saying anything gets harder the longer it goes — you'll notice the urge to say something, usually when a quiet moment feels like it needs filling. Notice that urge. Most of the time, it doesn't need filling.`,
      "10-11": `The pull to say something increases the longer the stretch goes — not because anything's wrong, but because silence over time starts to feel like you're not doing anything. Notice when you're about to speak and ask whether it's genuinely needed, or just something to do with the quiet. Most of the time it's the second one.`,
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
        "8-9": "Just watch. Notice how long you usually sit near {{child_name}} before saying something.",
        "10-11": "Just watch. Notice how long your steady, wordless presence from Week 1 tends to last before it either turns into a check-in or you step away. Just notice the natural length.",
        "12-14": "Notice how your presence tends to shift into a check-in or a suggestion after a certain length of time.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Stay present across a longer stretch, not just the start.",
      content: {
        "8-9": "Sit with {{child_name}} longer, without talking. Stay close through more than one thing {{child_pronoun_subj}}'s doing, without giving tips or checking in.",
        "10-11": "Extend the presence, without adding input. Sit nearby for a longer stretch than usual — through more than one activity if possible — without offering guidance, correction, or check-ins. The presence itself is the resource; anything you say on top of it dilutes it.",
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
        "8-9": "Do it again. Fork: Worked — stay a little longer next time. Mixed — notice when you almost said something. Didn't land — go back to a shorter quiet stretch and build from there.",
        "10-11": `Do it again. Fork: Worked — extend a little further. Notice if {{child_name}} settles into it more the longer it goes. Mixed — did the presence hold for part of the stretch and then get pulled into a check-in? Notice what triggered the pull. Didn't land — the stretch may be too long right now. Go back to a shorter, well-held presence and build the duration from there.`,
        "12-14": "**Worked** — extend it further. **Mixed** — notice what pulled you into a check-in, and name that to yourself honestly. **Didn't land** — shorten the stretch and rebuild the duration gradually.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Don't drift off the moment it seems to be going fine.",
      content: {
        "8-9": "Stay, even when something goes wrong. If {{child_name}} gets stuck or upset while you're there, stay. Don't fix it, don't leave.",
        "10-11": "Stay present through a rough moment, without rescuing. At some point in the longer stretch, something will go sideways for {{child_name}} — frustration, a mistake, a stuck moment. Stay present. Don't step in to fix it, and don't step away either. Just remain.",
        "12-14": "When something goes sideways for {{child_name}} during the stretch, stay present without fixing it or stepping away.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say you stayed, and that they didn't need managing.",
      content: {
        "8-9": `Name it. "I was right there with you the whole time today, even the hard part. You didn't need me to fix anything."`,
        "10-11": `Name it. Tell {{child_name}}: "I was here with you through the whole thing today, even the tricky part. You didn't need me to fix it — just to be there."`,
        "12-14": `*"I was here with you through the whole thing, even the hard part. You didn't need me to fix it — just to be there."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did just being there hold, even through the rough part?",
      "10-11": "Did your presence hold across the longer stretch, including the rough moment, without turning into supervision?",
      "12-14": "Ask {{child_name}} whether {{child_pronoun_subj}} noticed your presence felt different this week — steadier, less like supervision.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
