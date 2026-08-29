import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}}'s instinct genuinely helped, and you let it happen without taking over. Keep stepping back.\n**Mixed** — {{child_name}} tried but the conflict needed real mediation eventually. Notice where the line actually was.\n**Didn't land** — you stepped in immediately. Worth naming what made this one feel too volatile to leave to {{child_name}}.`;

export const weekContent: LmsWeekContent = {
  archetype: "glue",
  week: 5,
  weekTitle: "When It's a Fight Between the Two of Them",

  weeklyReading: {
    introShared: `Connection has survived real, unresolved tension. This week: what happens when a sibling conflict is genuinely part of the picture — {{child_name}}'s connection-first instinct meeting a third person's stake in the same moment?`,

    moveCalibration: {
      "8-9": `The instinct will be to referee the sibling conflict yourself before {{child_name}}'s own connection-first instinct gets a chance to work. Let {{child_pronoun_obj}} try first.`,
      "10-11": `Watch for treating {{child_name}}'s connection-first instinct as a way to end the sibling conflict quickly, rather than something with its own value regardless of resolution speed.`,
      "12-14": `At this age, {{child_name}} may take on more emotional labor in a sibling conflict than is fair. Notice that pattern — connection-first shouldn't mean {{child_pronoun_subj}} always absorbs the tension.`,
    },

    moveOutroShared: `This is about real sibling friction, not manufactured tension — and about {{child_name}}'s role in it being observed honestly, not assumed to be fully responsible for resolving it.`,

    whatWorkingLooksLike: `{{child_name}}'s connection-first instinct is given real room, and {{child_pronoun_subj}} isn't quietly expected to be the family's emotional fixer.`,

    thingToHoldOnto: `Connection that only ever means absorbing everyone else's tension isn't a gift — it's a job {{child_name}} shouldn't have to hold alone.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment of real sibling conflict this week where {{child_name}}'s connection-first instinct shows up.",
        "10-11": "Same, and notice whether {{child_name}} steps toward the conflict naturally or waits to be asked to help.",
        "12-14": "Notice a sibling conflict where {{child_name}} seems to take on more emotional weight than is fair for {{child_pronoun_poss}} role in it.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let their instinct to smooth it try first, before you referee.",
      content: {
        "8-9": "Before stepping in to referee, let {{child_name}}'s own instinct to connect play out, even if it's imperfect.",
        "10-11": "Hold back longer than feels comfortable before stepping in — give {{child_name}}'s instinct real room.",
        "12-14": "Watch specifically for {{child_name}} over-extending emotionally, and be ready to step in for {{child_pronoun_poss}} sake, not just to resolve the conflict faster.",
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
      title: "Watch for them carrying more of it than is fair.",
      content: {
        "8-9": "Let a genuine sibling conflict give {{child_name}}'s connection-first instinct real room to work before you step in.",
        "10-11": "Same, but actively watch for {{child_name}} absorbing more of the tension than is fair, and step in for {{child_pronoun_poss}} sake if that happens.",
        "12-14": "Afterward, check in with {{child_name}} privately about how the conflict felt for {{child_pronoun_obj}}, separate from whether it got resolved.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it's not all theirs to hold.",
      content: {
        "8-9": `*"You tried to hold things together there. That matters — and it's not all your job to fix, either."*`,
        "10-11": `*"You stepped toward that conflict instead of away from it. That's real, and you don't have to carry all of it."*`,
        "12-14": `*"You held a lot in that moment. It's okay for it not to all be yours to hold."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}}'s connection-first instinct get a fair chance to work this week?",
      "10-11": "Did {{child_name}} seem to carry the sibling tension home with {{child_pronoun_obj}} afterward, or let it go?",
      "12-14": "Did {{child_name}} get to just be a kid in the conflict at any point this week, not just the peacemaker?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
