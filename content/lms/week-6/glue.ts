import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} named a feeling and you just listened. Keep doing that.\n**Mixed** — you listened but then offered a fix anyway. Notice whether it was asked for.\n**Didn't land** — you moved straight to problem-solving. Worth naming what made just listening feel insufficient in that moment.`;

export const weekContent: LmsWeekContent = {
  archetype: "glue",
  week: 6,
  weekTitle: "Running it themselves",

  weeklyReading: {
    introShared: `Five weeks built connection-first as a habit, including through real, unresolved tension. This week is about noticing when {{child_name}} starts naming {{child_pronoun_poss}} own feelings unprompted, without you asking "what's wrong?" first.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} saying how {{child_pronoun_subj}} feels before you ask — even something simple like "I'm frustrated." Let that stand without immediately trying to fix the feeling.`,
      "10-11": `Notice if {{child_name}} names a feeling and then also says what {{child_pronoun_subj}} needs (or doesn't need) from you. Follow that instruction exactly, even if it's "nothing, I just wanted to say it."`,
      "12-14": `At this age, naming a feeling unprompted is a significant act of trust. Resist responding with advice or solutions unless asked — the naming itself is often the whole request.`,
    },

    moveOutroShared: `This week is about listening, not fixing — the feeling being named is often the entire ask.`,

    whatWorkingLooksLike: `{{child_name}} names {{child_pronoun_poss}} own emotional state without prompting, and you listen without rushing to fix it.`,

    thingToHoldOnto: `A feeling that's named and simply heard is often already handled — it doesn't always need solving too.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} names {{child_pronoun_poss}} own feeling without you asking first.",
        "10-11": "Same, and notice if {{child_name}} also says what {{child_pronoun_subj}} needs (or doesn't need) from you.",
        "12-14": "Notice a moment where naming the feeling unprompted seems like a real act of trust, not a casual comment.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice when they name how they're feeling unprompted.",
      content: {
        "8-9": "When it happens, just listen. Don't move to solve or explain the feeling away.",
        "10-11": "Follow whatever instruction comes with it exactly, even if it's \"nothing, I just wanted to say it.\"",
        "12-14": "Resist offering advice or solutions unless directly asked — the naming itself is often the whole request.",
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
      title: "Just listen — don't move to fix it unless they ask.",
      content: {
        "8-9": "Catch a genuine moment of {{child_name}} naming a feeling unprompted, and give full attention without offering a solution.",
        "10-11": "Catch the moment and follow the specific instruction that comes with it, exactly.",
        "12-14": "Catch a moment of real trust being extended, and simply receive it — no advice, no follow-up questions unless invited.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: you're glad they can tell you.",
      content: {
        "8-9": `*"You told me how you were feeling without me asking. That matters, and I'm glad you can do that."*`,
        "10-11": `*"You told me exactly what you needed too. That made it easy for me to actually help the right way."*`,
        "12-14": `*"You trusted me with that without me asking. I don't take that lightly."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} name feelings unprompted more often by week's end?",
      "10-11": "Did the accompanying instructions get clearer by week's end?",
      "12-14": "Did the moments of trust feel like they deepened at all this week?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
