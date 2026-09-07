import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} held presence across more than one person without your help. Keep stepping back.\n**Mixed** — {{child_name}} managed some of it but you filled a gap. Notice what made that gap feel like it needed filling.\n**Didn't land** — you managed the group moment for {{child_name}}. Worth naming what made this one feel too uncomfortable to leave alone.`;

export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 5,
  weekTitle: "Using it beyond homework",

  weeklyReading: {
    introShared: `Presence has held through a real, visible struggle, one-on-one. This week: what happens when presence has to extend to more than one person — a peer or sibling in the mix, not just {{child_name}} and you?`,

    moveCalibration: {
      "8-9": `The instinct will be to manage the group dynamic yourself the moment a peer or sibling joins. Let {{child_name}} find {{child_pronoun_poss}} own way of being present with more than one person, even if it's awkward at first.`,
      "10-11": `Watch for filling the social gaps for {{child_name}} when a group moment gets quiet or uneven. Let {{child_pronoun_obj}} sit with that, rather than smoothing it for {{child_pronoun_obj}}.`,
      "12-14": `At this age, group presence can feel higher-stakes socially. Resist coaching {{child_name}} on how to act in the moment — let {{child_pronoun_obj}} navigate it and debrief after, only if asked.`,
    },

    moveOutroShared: `Pick low-stakes group moments to start — a sibling and a friend, a small gathering, not a large or high-pressure social setting.`,

    whatWorkingLooksLike: `{{child_name}} extends real presence to more than one person without needing you to manage the social dynamic.`,

    thingToHoldOnto: `Presence that only works one-on-one hasn't yet been tested for the version that matters most later — in a room full of people.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}}'s presence needs to extend to more than one person at once.",
        "10-11": "Same, and notice whether {{child_name}} seems to have a natural way of including more than one person, or defaults to focusing on just one.",
        "12-14": "Notice a group moment where {{child_name}}'s presence is genuinely tested — not just physically there, but attentive to more than one person.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them navigate a group moment without you smoothing it.",
      content: {
        "8-9": "Don't manage the group dynamic or smooth the moment. Let {{child_pronoun_obj}} navigate it directly.",
        "10-11": "Resist filling silences or redirecting attention on {{child_name}}'s behalf when the group moment gets uneven.",
        "12-14": "Stay out of the social navigation entirely, even when it's visibly a little awkward.",
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
      title: "Don't fill the awkward gap when the room goes uneven.",
      content: {
        "8-9": "Pick a genuine group setting where {{child_name}}'s presence is tested across more than one person, with zero social management from you, even when it's briefly awkward.",
        "10-11": "Same, but pick a setting with a slightly longer duration, so {{child_name}} has to sustain group presence, not just manage a brief moment.",
        "12-14": "Let {{child_name}} choose how much to engage with each person in the group — don't nudge {{child_pronoun_obj}} toward \"fairness\" in attention.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they held it with more than one person, which is harder.",
      content: {
        "8-9": `*"You were really there for more than one person today. That's not the same skill as one-on-one — and you've got it."*`,
        "10-11": `*"You held space for the whole group, not just one person. That's a bigger version of what you do."*`,
        "12-14": `*"You read a room with more than one person in it and stayed present the whole time. That's real."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did group presence get easier for {{child_name}} by the end of the week?",
      "10-11": "Did {{child_name}} seem to enjoy group moments more or less as the week went on?",
      "12-14": "Did {{child_name}}'s own comfort in groups shift this week, separate from anything you did?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
