import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — you noticed the habit running on its own and said nothing. Keep noticing quietly.\n**Mixed** — you noticed and mentioned it, which briefly turned it into a performance. Notice how that changed the moment.\n**Didn't land** — the system doesn't seem to be running independently yet. Worth being honest about whether more repetition is still needed rather than assuming it's failed.`;

export const weekContent: LmsWeekContent = {
  archetype: "explorer",
  week: 6,
  weekTitle: "Running it themselves",

  weeklyReading: {
    introShared: `Five weeks built the capture system into a standing habit. This week is about noticing when it becomes truly automatic — {{child_name}} reaching for it without any reminder, structure, or check-in from you.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} reaching for the capture system on {{child_pronoun_poss}} own, in a moment you didn't set up or remind {{child_pronoun_obj}} about. Let that be the win, however small it looks.`,
      "10-11": `Notice if {{child_name}} starts using the system in contexts you never introduced it for — school, a hobby, a friend's house. That's the habit generalizing on its own.`,
      "12-14": `At this age, {{child_name}} may have quietly modified the system to something {{child_pronoun_poss}} own — a different format, a different tool. Notice that as ownership, not as {{child_pronoun_obj}} abandoning what you built together.`,
    },

    moveOutroShared: `This week is about recognizing the habit has become {{child_name}}'s own, in whatever form it now takes.`,

    whatWorkingLooksLike: `{{child_name}} uses the capture system automatically, in {{child_pronoun_poss}} own way, without needing reminders or structure from you.`,

    thingToHoldOnto: `A system that still needs you to maintain it isn't {{child_name}}'s yet — it's still yours, on loan.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} reaches for the capture system without any prompt or reminder.",
        "10-11": "Same, and notice if {{child_name}} uses the system in a context you never introduced it for.",
        "12-14": "Notice whether {{child_name}} has modified the system into something {{child_pronoun_poss}} own — a different format or tool.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice them using it somewhere you never set it up.",
      content: {
        "8-9": "Don't comment on it in the moment, even positively. Let it just be normal.",
        "10-11": "Don't ask where {{child_name}} picked up the new context for using it — let the generalization happen without your notice being obvious.",
        "12-14": "Don't ask about the modified version or suggest going back to the original format — let it be genuinely {{child_pronoun_poss}}.",
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
      title: "Let it be unremarkable — don't turn it into a moment.",
      content: {
        "8-9": "Catch a genuine moment of independent use and let it pass without comment.",
        "10-11": "Catch the system being used somewhere new (school, a hobby) and don't remark on the new context.",
        "12-14": "Catch the personalized version in use and let it stand as fully {{child_pronoun_poss}} own, without comparing it to the original.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: the system's theirs now, whatever it looks like.",
      content: {
        "8-9": `*"You've been catching your own ideas without me reminding you. That system's really yours now."*`,
        "10-11": `*"You're using that everywhere now, not just where we started. That's the habit sticking."*`,
        "12-14": `*"You made that system your own. Whatever it looks like now, it's working because it's actually yours."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did the system show up more often, unprompted, by week's end?",
      "10-11": "Did it show up in more places by week's end?",
      "12-14": "Has the personalized version stuck, or shifted again this week?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
