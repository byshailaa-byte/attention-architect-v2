import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — you noticed a real signal and let it stand. Keep noticing.\n**Mixed** — {{child_name}} signaled but you still offered to help protect the space anyway. Notice why that felt necessary.\n**Didn't land** — no clear signal showed up this round. Worth being honest about whether the habit is still forming.`;

export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 6,
  weekTitle: "When They Ask for the Quiet Themselves",

  weeklyReading: {
    introShared: `Five weeks protected {{child_name}}'s depth — from interruption, from its own bad stretches, from competing needs. This week is about noticing when {{child_pronoun_subj}} starts protecting it {{child_pronoun_poss}}self.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} asking for quiet or space on {{child_pronoun_poss}} own, without you offering it first — even a simple "can I have some time for this?" Let that stand as real, not as something to double-check.`,
      "10-11": `Notice if {{child_name}} starts protecting {{child_pronoun_poss}} own depth from others (asking a sibling to wait, closing a door) without your prompting. Resist stepping in to manage that protection for {{child_pronoun_obj}}.`,
      "12-14": `At this age, the signal may be quieter still — simply disappearing into a task without announcement, and re-emerging when done. Notice that as the habit, not as {{child_pronoun_obj}} being withdrawn.`,
    },

    moveOutroShared: `This week is mostly observation — notice the signal, don't manufacture a test for it.`,

    whatWorkingLooksLike: `{{child_name}} signals for and protects {{child_pronoun_poss}} own depth without needing you to offer or defend it.`,

    thingToHoldOnto: `Protected depth was never meant to stay something you gave — it was always meant to become something {{child_name}} takes.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} signals for depth or quiet without being offered it.",
        "10-11": "Same, and notice whether {{child_name}} protects that quiet from others (a sibling, noise) without your help.",
        "12-14": "Notice a moment where {{child_name}} simply disappears into a task without announcement, and re-emerges when done.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice when they ask for the time before you offer it.",
      content: {
        "8-9": "Don't double-check, don't offer to help protect the space. Let {{child_name}}'s own signal be enough.",
        "10-11": "Resist stepping in to manage the protection for {{child_pronoun_obj}} — let {{child_pronoun_obj}} handle it.",
        "12-14": "Say nothing about the disappearance-and-return pattern — let it be unremarkable.",
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
      title: "Don't double-check or offer to help protect it.",
      content: {
        "8-9": "Catch a genuine moment of {{child_name}} asking for or taking depth, and let it happen with zero involvement from you.",
        "10-11": "Catch a moment of {{child_name}} protecting {{child_pronoun_poss}} own depth from someone else, and stay completely out of it.",
        "12-14": "Catch the quiet disappear-and-return pattern happening on its own, and don't comment on it even afterward.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: they've started finding it themselves.",
      content: {
        "8-9": `*"You've been finding your own quiet lately, without needing me to protect it for you. That's yours now."*`,
        "10-11": `*"You've started protecting your own focus, even from other people. That's really yours now."*`,
        "12-14": `*"I've noticed you just going and finding that space on your own. That's yours."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}}'s signals for depth get clearer by week's end?",
      "10-11": "Did {{child_name}} need to protect the space from others more or less often as the week went on?",
      "12-14": "Did the pattern of disappearing into focus get more frequent or more natural-seeming by week's end?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
