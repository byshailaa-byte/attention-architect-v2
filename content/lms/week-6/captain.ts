import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} led unprompted and you let it stand. Keep noticing without formalizing.\n**Mixed** — {{child_name}} led, but you stepped in to confirm or approve it afterward. Notice why that felt needed.\n**Didn't land** — no clear unprompted leadership moment showed up. Worth being honest about whether the habit needs more time.`;

export const weekContent: LmsWeekContent = {
  archetype: "captain",
  week: 6,
  weekTitle: "Running it themselves",

  weeklyReading: {
    introShared: `Five weeks built leadership — through failure, through a sibling dynamic. This week is about noticing when {{child_name}} steps into leadership on {{child_pronoun_poss}} own, without you handing {{child_pronoun_obj}} the role first.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} taking charge of a small situation without being asked to. Let it stand — don't formally "put {{child_pronoun_obj}} in charge" after the fact, which would suggest {{child_pronoun_subj}} needed your permission.`,
      "10-11": `Notice if {{child_name}} steps in to lead when something's genuinely unclear, without waiting to be designated. Follow {{child_pronoun_poss}} lead in that moment rather than re-establishing your own.`,
      "12-14": `At this age, unprompted leadership might look like quietly organizing something without announcement. Notice that as real leadership, not as {{child_pronoun_obj}} being bossy or overstepping.`,
    },

    moveOutroShared: `This week is about recognizing leadership that's already happening, not creating opportunities for it.`,

    whatWorkingLooksLike: `{{child_name}} steps into leadership without being designated, and you recognize it rather than formally granting it.`,

    thingToHoldOnto: `Leadership that always needs to be handed over hasn't yet become {{child_name}}'s to simply take.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} takes charge without being asked to.",
        "10-11": "Same, and notice if {{child_name}} steps in to lead when something's genuinely unclear, without waiting to be designated.",
        "12-14": "Notice a moment of quiet, unannounced organizing — real leadership without a visible \"taking charge\" moment.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice them taking charge before anyone hands it to them.",
      content: {
        "8-9": "Don't officially hand {{child_name}} the role after the fact. Let {{child_pronoun_obj}} having taken it be enough.",
        "10-11": "Follow {{child_pronoun_poss}} lead in that moment rather than re-establishing your own.",
        "12-14": "Don't name the quiet organizing out loud — let it stay unremarked, which is part of what makes it real.",
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
      title: "Don't formalise it afterward — that implies they needed permission.",
      content: {
        "8-9": "Catch a genuine moment of unprompted leadership and let it happen fully, without co-signing it.",
        "10-11": "Catch {{child_name}} stepping in during real ambiguity, and follow {{child_pronoun_poss}} lead without re-asserting your own.",
        "12-14": "Catch the quiet organizing pattern happening, and let it go unremarked, even to yourself in the moment.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: nobody asked them to.",
      content: {
        "8-9": `*"You just took charge of that, and nobody asked you to. That's real leadership."*`,
        "10-11": `*"Things were unclear and you just stepped in. That's what real leadership looks like."*`,
        "12-14": `*"I've noticed you just... making things happen, without announcing it. That's real."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did unprompted leadership moments show up more often by week's end?",
      "10-11": "Did {{child_name}} step into ambiguous moments more confidently as the week went on?",
      "12-14": "Did the quiet-organizing pattern become more visible to you by week's end, even without {{child_name}} announcing it?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
