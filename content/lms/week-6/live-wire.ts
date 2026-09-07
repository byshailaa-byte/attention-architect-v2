import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} set a real stake unprompted and you let it be {{child_pronoun_poss}}. Keep doing that.\n**Mixed** — {{child_name}} set the stake but asked you to help formalize it, and you did more than was needed. Notice the difference between supporting and supplying.\n**Didn't land** — no clear unprompted stake showed up. Worth being honest about whether the habit needs more time to become automatic.`;

export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 6,
  weekTitle: "Running it themselves",

  weeklyReading: {
    introShared: `Five weeks built self-generated stakes — through real loss, through shared consequence. This week is about noticing when {{child_name}} invents {{child_pronoun_poss}} own stakes entirely unprompted, without you setting up the structure first.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} setting a bet or a challenge for {{child_pronoun_obj}}self, out of nowhere. Let it stand as real, even if it seems small or silly to you.`,
      "10-11": `Notice if {{child_name}} sets a stake and doesn't tell you the terms in advance, only revealing it after. Resist asking for the terms upfront next time — let {{child_pronoun_obj}} own the whole arc, including the reveal.`,
      "12-14": `At this age, {{child_name}} may set stakes privately, invisible to you entirely. Notice indirect signs of this (a personal goal mentioned in passing) rather than needing visibility into every stake {{child_pronoun_subj}} sets.`,
    },

    moveOutroShared: `This week is about validating stakes {{child_name}} sets {{child_pronoun_poss}}self, not supplying the structure for them.`,

    whatWorkingLooksLike: `{{child_name}} invents {{child_pronoun_poss}} own stakes without prompting, and you respond with validation rather than structure.`,

    thingToHoldOnto: `A stake {{child_name}} still needs you to help set isn't fully {{child_pronoun_poss}} own yet — the real sign is when {{child_pronoun_subj}} invents one you never saw coming.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} sets a stake for {{child_pronoun_obj}}self without any prompting from you.",
        "10-11": "Same, and notice if {{child_name}} keeps the terms private until after, only revealing them once it's resolved.",
        "12-14": "Notice any indirect sign of a private stake — a personal goal mentioned in passing, without full visibility into it.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice a stake they set without any prompting from you.",
      content: {
        "8-9": "Don't help set the terms or offer to make it official. Let it be entirely {{child_name}}'s construction.",
        "10-11": "Resist asking for the terms upfront — let {{child_pronoun_obj}} own the whole arc, including the reveal.",
        "12-14": "Don't probe for more detail on the private stake than {{child_name}} volunteers.",
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
      title: "Don't help formalise it — let it stay entirely theirs.",
      content: {
        "8-9": "Catch a genuine, unprompted stake and respond only with genuine interest — no structuring, no \"official\" version of it.",
        "10-11": "Catch the reveal of a stake whose terms you didn't know in advance, and receive it with full interest, not surprise at being kept out of the process.",
        "12-14": "Catch an indirect sign of a private stake, and don't press for the full picture — just acknowledge what's shared.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: nobody asked them to set that.",
      content: {
        "8-9": `*"You set that for yourself — nobody asked you to. That's really yours."*`,
        "10-11": `*"You didn't even tell me the terms until it was done. That's yours, start to finish."*`,
        "12-14": `*"Whatever that goal is, it's yours. You don't have to loop me into all of it."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did unprompted stakes show up more often, or with more confidence, by week's end?",
      "10-11": "Did {{child_name}} keep more terms private as the week went on, or start sharing more?",
      "12-14": "Did you notice more (or fewer) signs of private stakes by week's end?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
