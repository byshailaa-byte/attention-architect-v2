import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} explained {{child_pronoun_poss}} approach and you just listened. Keep doing that.\n**Mixed** — you listened but then offered your own take on the reasoning. Notice whether that was asked for.\n**Didn't land** — you evaluated the reasoning out loud. Worth naming what made that feel necessary.`;

export const weekContent: LmsWeekContent = {
  archetype: "inventor",
  week: 6,
  weekTitle: "When They Explain Why Without Being Asked",

  weeklyReading: {
    introShared: `Five weeks built method-ownership — through failure, through real collaboration. This week is about noticing when {{child_name}} starts explaining or defending {{child_pronoun_poss}} approach unprompted, without needing you to ask why {{child_pronoun_subj}}'s doing it that way.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} volunteering the reasoning behind {{child_pronoun_poss}} approach without you asking "why are you doing it that way?" Let that stand as genuine ownership, not as {{child_pronoun_obj}} needing your approval.`,
      "10-11": `Notice if {{child_name}} pushes back on unsolicited suggestions with a real reason, not just resistance. Listen to the reason rather than evaluating whether it's the "right" one.`,
      "12-14": `At this age, {{child_name}} may explain {{child_pronoun_poss}} method to someone else entirely — a peer, a teacher — without you present. Notice that as the fullest version of this, even though you won't witness it directly.`,
    },

    moveOutroShared: `Your job this week is to listen when it happens, not to evaluate whether the reasoning is good.`,

    whatWorkingLooksLike: `{{child_name}} explains and defends {{child_pronoun_poss}} approach unprompted, and you listen without evaluating.`,

    thingToHoldOnto: `Method-ownership was never about {{child_name}} choosing well every time — it was about {{child_pronoun_obj}} being able to say why.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} explains {{child_pronoun_poss}} method unprompted.",
        "10-11": "Same, and notice whether {{child_name}} pushes back on suggestions with real reasons, not just resistance.",
        "12-14": "Notice if {{child_name}} explains {{child_pronoun_poss}} method to someone else entirely — not to you.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice when they explain their reasoning without you asking.",
      content: {
        "8-9": "When it happens, listen fully without weighing in on whether the reasoning is right.",
        "10-11": "Listen to the pushback and its reasoning without countering it, even gently.",
        "12-14": "If you only hear about it secondhand (a teacher, a friend mentions it), resist asking {{child_name}} to explain it to you too.",
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
      title: "Listen to it without weighing in on whether it's right.",
      content: {
        "8-9": "Catch a genuine moment of {{child_name}} defending {{child_pronoun_poss}} method, and give full attention without evaluation.",
        "10-11": "Catch a real pushback against a suggestion, backed by real reasoning, and let the reasoning stand without a counter-argument.",
        "12-14": "Catch an instance of {{child_name}} owning {{child_pronoun_poss}} method in a context you're not directly part of, even secondhand.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: they've started defending their own thinking.",
      content: {
        "8-9": `*"You explained your thinking there without me asking. That's real ownership — of the method and the reasoning."*`,
        "10-11": `*"You pushed back with a real reason, not just because. That's real thinking, and I heard it."*`,
        "12-14": `*"You're explaining your own approach to other people now, not just me. That's really yours."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}}'s explanations of {{child_pronoun_poss}} own method get more confident this week?",
      "10-11": "Did the pushback-with-reasoning pattern show up more often by week's end?",
      "12-14": "Did you hear about {{child_name}} owning {{child_pronoun_poss}} method outside the house at all this week?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
