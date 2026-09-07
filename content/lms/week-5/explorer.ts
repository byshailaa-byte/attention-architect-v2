import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} noticed the interruption and adjusted without prompting. Keep stepping back.\n**Mixed** — {{child_name}} noticed but you jumped in with a reminder anyway. Notice whether {{child_pronoun_subj}} actually needed it.\n**Didn't land** — the interruption went unnoticed by {{child_name}} and you had to name it. Worth naming honestly what the social cue was and whether it's worth revisiting together later.`;

export const weekContent: LmsWeekContent = {
  archetype: "explorer",
  week: 5,
  weekTitle: "Using it beyond homework",

  weeklyReading: {
    introShared: `The capture system has survived a real dead end. This week: what happens when {{child_name}}'s tangent-chasing pulls someone else's attention along with it — a sibling mid-focus, a friend trying to talk?`,

    moveCalibration: {
      "8-9": `The instinct will be to police {{child_name}}'s excitement the moment it disrupts someone else, shutting it down fast. This week, let {{child_pronoun_obj}} notice the interruption and adjust, rather than you enforcing it.`,
      "10-11": `Watch for over-apologizing on {{child_name}}'s behalf when a tangent interrupts someone else. Let {{child_pronoun_obj}} own the interruption and the repair.`,
      "12-14": `At this age, {{child_name}} can genuinely read whether an interruption landed badly — resist narrating the social cue for {{child_pronoun_obj}}; let {{child_pronoun_obj}} pick it up.`,
    },

    moveOutroShared: `This is about real, everyday interruptions — not manufacturing a conflict, and not letting genuinely disruptive behavior go unaddressed if it's affecting someone else's real need for focus or quiet.`,

    whatWorkingLooksLike: `{{child_name}} reads the effect of a tangent on someone else and adjusts without being told — curiosity and social awareness holding together.`,

    thingToHoldOnto: `A chase that never has to notice anyone else isn't being tested for awareness — just for enthusiasm.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where a tangent {{child_name}} is chasing pulls at someone else's attention or focus.",
        "10-11": "Same, and notice whether {{child_name}} registers the interruption at all before it's pointed out.",
        "12-14": "Notice a moment where {{child_name}}'s excitement genuinely collides with someone else's need for quiet or focus.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them notice the interruption themselves before you name it.",
      content: {
        "8-9": "Don't intervene to redirect or apologize on {{child_name}}'s behalf. Let {{child_pronoun_obj}} register the effect and decide what to do.",
        "10-11": `Resist prompting with "do you notice what that's doing to them?" — let {{child_name}} arrive at the observation {{child_pronoun_poss}} own way.`,
        "12-14": "Say nothing at all, even afterward, unless {{child_name}} brings it up first.",
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
      title: "Let a real one happen, and let them repair it their own way.",
      content: {
        "8-9": "Let a genuine interruption occur, and let {{child_name}} be the one to notice and repair it — including a real apology or adjustment, without your prompting.",
        "10-11": "Same, but pick a moment where the other person's need is genuinely significant (studying, a task with a deadline), so the repair actually matters.",
        "12-14": "Let {{child_name}} decide the form the repair takes — don't script the apology or the fix for {{child_pronoun_obj}}.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they read the room, not that they were finally quiet.",
      content: {
        "8-9": `*"You noticed that pulled someone else's attention, and you handled it yourself. That's the skill."*`,
        "10-11": `*"You caught that on your own and fixed it. That's real awareness, not just curiosity."*`,
        "12-14": `*"You read the room there and adjusted. That's a skill a lot of adults still don't have."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} get quicker at noticing the effect on others by week's end?",
      "10-11": "Did repairs happen faster or more naturally as the week went on?",
      "12-14": "Did {{child_name}} start pre-empting interruptions before they happened, by week's end?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
