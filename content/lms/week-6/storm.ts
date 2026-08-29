import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — you noticed unprompted ownership and let it stand. Keep noticing without commenting.\n**Mixed** — you noticed it but still offered a choice out of habit. Notice how quickly the old reflex shows up even when it's not needed.\n**Didn't land** — you didn't notice any unprompted moments this round. That's real information — worth being honest about whether it's genuinely rare yet, or whether you're still filling the space before {{child_name}} gets there.`;


export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 6,
  weekTitle: "When They Decide Before You Offer",

  weeklyReading: {
    introShared: `Five weeks built {{child_name}}'s ownership — through routines, real failures, and shared decisions. This week isn't a new test. It's about noticing what's already changed: moments where {{child_name}} takes ownership without you offering it first.`,

    moveCalibration: {
      "8-9": `The habit for five weeks has been offering {{child_name}} a choice. This week, watch for {{child_pronoun_obj}} making one before you get the chance to offer it — and resist jumping in to narrate or praise it in the moment, which can make it feel performed rather than natural.`,
      "10-11": `Watch your own reflex to still frame things as choices out of habit ("do you want to decide, or...") even when {{child_name}} has already started deciding on {{child_pronoun_poss}} own. Let the habit of offering fade where it's no longer needed.`,
      "12-14": `At this age, unprompted ownership can look like quiet independence rather than a visible decision moment — {{child_name}} just does the thing without narrating the choice at all. Notice that as real ownership, not as {{child_pronoun_obj}} skipping a step.`,
    },

    moveOutroShared: `This week is about observation more than intervention — there's less to "do" and more to notice.`,

    whatWorkingLooksLike: `{{child_name}} makes real choices without waiting to be offered one. Your role has shifted from offering to noticing.`,

    thingToHoldOnto: `The goal was never to keep offering choices forever — it was to make yourself unnecessary to the choosing.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} makes a real choice before you've offered one.",
        "10-11": "Notice the same, and notice your own habit of framing things as choices even when {{child_pronoun_subj}} no longer needs that framing.",
        "12-14": "Notice a moment of quiet, unnarrated ownership — something {{child_name}} just decided and did, without announcing it.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice a choice they made without waiting for you.",
      content: {
        "8-9": "When you notice it, don't praise it out loud in the moment. Let it be normal, not a milestone.",
        "10-11": "Resist the old habit of offering a choice that's already been made. Notice, don't narrate.",
        "12-14": "Say nothing at all — this is the week for observation, not intervention.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: { "8-9": D3, "10-11": D3, "12-14": D3 },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let it pass without praising it into a moment.",
      content: {
        "8-9": "This week's test isn't about creating a moment — it's about catching a real one, something small like choosing what to wear or how to organize a task, and letting it pass without commentary, correction, or praise.",
        "10-11": "Catch something with a bit more weight — a plan {{child_name}} makes without checking with you first — and let it stand without narrating that you noticed.",
        "12-14": "Catch a moment where {{child_name}} makes a real call independently, possibly one you wouldn't have made yourself, and resist the urge to weigh in even afterward.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once, at the end of the week — not every time.",
      content: {
        "8-9": `*"I noticed you picked that on your own today. That's yours."*`,
        "10-11": `*"I've noticed you deciding things on your own lately, without me asking. That's really yours now."*`,
        "12-14": `*"You've been making calls on your own for a while now. I don't need to check in on that anymore."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "How many unprompted choices did you actually catch this week?",
      "10-11": "Did your habit of offering choices fade at all, or is it still your default?",
      "12-14": "What did it feel like to just notice, rather than manage?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
