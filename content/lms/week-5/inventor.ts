import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — the method genuinely incorporated someone else's idea. Keep encouraging that without commentary.\n**Mixed** — {{child_name}} agreed to the other idea on paper but quietly reverted to {{child_pronoun_poss}} own approach. Worth naming honestly if you noticed.\n**Didn't land** — {{child_name}} dominated the method entirely. Worth naming what made sharing control feel too risky this time.`;

export const weekContent: LmsWeekContent = {
  archetype: "inventor",
  week: 5,
  weekTitle: "Using it beyond homework",

  weeklyReading: {
    introShared: `Method-ownership has survived a real failure. This week: what happens when the project isn't purely {{child_name}}'s call anymore — a shared build, a group task, something where someone else's input genuinely belongs in the decision?`,

    moveCalibration: {
      "8-9": `The instinct will be to let {{child_name}} keep full control even in a shared project, since {{child_pronoun_subj}}'s used to owning method alone. This week, let {{child_pronoun_obj}} practice genuinely incorporating someone else's idea, not just tolerating it.`,
      "10-11": `Watch for stepping in to protect {{child_name}}'s original vision when a collaborator's idea threatens to change it. Let the project actually shift if the negotiation goes that way.`,
      "12-14": `At this age, {{child_name}} may perform collaboration while quietly steering everything anyway. Notice that pattern and name it honestly rather than accepting the appearance of shared ownership.`,
    },

    moveOutroShared: `Pick a genuinely shared project — a real collaborator with real input, not a token gesture toward sharing.`,

    whatWorkingLooksLike: `{{child_name}} genuinely incorporates someone else's ideas into a shared method, not just performs collaboration while steering alone.`,

    thingToHoldOnto: `Ownership that can't survive someone else's real input isn't ownership of the project — it's ownership of control.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a project this week where someone else has a real stake in the method, not just the outcome.",
        "10-11": "Same, and notice whether {{child_name}} treats the collaborator's input as optional or as genuinely part of the decision.",
        "12-14": "Notice a moment where {{child_name}}'s original plan is directly challenged by a collaborator's idea.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let a friend's or sibling's idea actually change the direction.",
      content: {
        "8-9": "Don't protect {{child_name}}'s original approach if the collaborator's idea genuinely changes the direction. Let it move.",
        "10-11": `Resist stepping in to help {{child_name}} "win" the disagreement about method. Let the negotiation run its course.`,
        "12-14": "Stay fully out of the negotiation, even when asked to weigh in — redirect back to the two of them working it out.",
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
      title: "Don't step in to protect the original plan when it starts shifting.",
      content: {
        "8-9": "Pick a project where the collaborator's idea genuinely wins out over {{child_name}}'s original plan at least once, and {{child_pronoun_subj}} has to actually follow it through.",
        "10-11": "Same, but pick a project with real stakes attached (a grade, something shown to others), so the shift in method actually matters.",
        "12-14": "Let {{child_name}} be the one to propose the compromise method, rather than the collaborator or you suggesting it.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they made room for someone else's thinking, not that they gave in.",
      content: {
        "8-9": `*"You let someone else's idea actually change the plan. That's still your ownership — it's just bigger than just you now."*`,
        "10-11": `*"That project isn't only yours anymore, and you made room for that. That's real."*`,
        "12-14": `*"You found a way to combine your idea with theirs. That's a harder skill than defending your own."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} get more comfortable with shared method by week's end?",
      "10-11": "Did the collaboration feel more genuine as the week went on, or did it stay effortful?",
      "12-14": "Did {{child_name}} start proposing compromises unprompted by the end of the week?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
