import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "glue",
  week: 4,
  weekTitle: "Coming back after a slip",

  weeklyReading: {
    introShared: `Connection-first has been a daily habit across good and bad days. This week goes further: what happens when there's real tension that can't be fully resolved in the moment — named honestly, without forcing a tidy resolution.`,

    moveCalibration: {
      "8-9": `The instinct will be to smooth over tension quickly, to get back to "okay" as fast as possible. This week, let a disagreement or a hurt feeling stay named and unresolved for a bit rather than rushing a fix.`,
      "10-11": `Watch for over-explaining your own side as a way to resolve tension faster. Sometimes connection means sitting with "we see this differently" rather than getting {{child_name}} to agree with you.`,
      "12-14": `At this age, forced resolution can read as dismissal — "let's just move past it" can land as "your feelings about this don't get to last." Let tension breathe without a deadline on when it needs to be over.`,
    },

    moveOutroShared: `This isn't about letting real conflict fester unaddressed — it's about not rushing every friction toward an artificial "we're fine now."`,

    whatWorkingLooksLike: `Tension gets named honestly and doesn't have to resolve on a schedule. {{child_name}} experiences disagreement as survivable, not as a threat to the relationship.`,

    thingToHoldOnto: `Connection that only survives agreement isn't real connection — it's conflict-avoidance wearing a warmer name.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment of real, small tension this week — and notice your own urge to resolve it immediately.",
        "10-11": "Notice the same, and notice whether your urge to fix it is about {{child_name}}'s comfort or your own.",
        "12-14": "Notice a tension where {{child_name}} seems to want it acknowledged more than solved.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Name the tension out loud without rushing to solve it.",
      content: {
        "8-9": `Say what you notice out loud — *"I can tell we see this differently, and that's okay for now"* — without pushing toward agreement.`,
        "10-11": "Resist over-explaining your own side as a way to speed toward resolution.",
        "12-14": "Say less than you think is needed. A short acknowledgment lands better than a full explanation at this age.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — you named it and let it sit. Connection held without a tidy resolution.\n**Mixed** — you named it but circled back within the hour to "make sure we're okay." Notice whose comfort that check-in was for.\n**Didn't land** — you moved straight to fixing it. Worth naming what made the unresolved feeling hard to tolerate.`,
        "10-11": `**Worked** — you named it and let it sit. Connection held without a tidy resolution.\n**Mixed** — you named it but circled back within the hour to "make sure we're okay." Notice whose comfort that check-in was for.\n**Didn't land** — you moved straight to fixing it. Worth naming what made the unresolved feeling hard to tolerate.`,
        "12-14": `**Worked** — you named it and let it sit. Connection held without a tidy resolution.\n**Mixed** — you named it but circled back within the hour to "make sure we're okay." Notice whose comfort that check-in was for.\n**Didn't land** — you moved straight to fixing it. Worth naming what made the unresolved feeling hard to tolerate.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let it stay unresolved past the point that's comfortable.",
      content: {
        "8-9": "Pick a genuine, moderately uncomfortable tension, name it honestly, and leave it unresolved through the rest of the day.",
        "10-11": "Same, but let it run into the next day if it's not genuinely resolved — don't force closure on a deadline.",
        "12-14": "Let {{child_name}} be the one to decide when (or whether) to circle back to it — don't initiate the resolution yourself.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say you're still fine, even without sorting it out.",
      content: {
        "8-9": `*"We didn't fully sort that out, and we're still okay."*`,
        "10-11": `*"That's still a little unresolved between us, and that's fine. Not everything needs fixing right away."*`,
        "12-14": `*"We see that differently still. Doesn't change anything between us."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did connection actually hold through the unresolved tension?",
      "10-11": "Did it feel like distance at any point — and was that actually distance, or just the discomfort of not-yet-resolved?",
      "12-14": "Did {{child_name}} bring the tension back up on {{child_pronoun_poss}} own terms — and what did that tell you?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
