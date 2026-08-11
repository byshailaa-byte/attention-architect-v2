import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "captain",
  week: 3,
  weekTitle: "Leadership, Sustained",

  weeklyReading: {
    introShared: `Week 1 tested whether your child leads differently when a decision is genuinely theirs to make, not just theirs to be consulted on. Week 2 tested that same real ownership around screens. This week hands over something bigger: an ongoing responsibility — something that needs tending over the whole week, not decided once and finished.

What matters here: a Captain thrives on real ownership, not the appearance of it. A single decision, made once, is a different kind of test than a responsibility that has to be carried day after day, including on the days it would be easier for you to quietly take it back. Weeks 1 and 2 proved that real ownership of a single moment changes how your child shows up for it. This week asks whether that holds when the responsibility doesn't end after one decision.

This week's move: hand over something that needs leading over time — organizing something for the week, being in charge of a recurring task, managing something with more than one moving piece — and let it be genuinely theirs to run, not just theirs to have been assigned.

At some point this week, something under their leadership will likely go wrong. That moment is not a cue to step in and quietly fix it or take control back. It's the actual test of whether the responsibility was real, or whether it was only real as long as everything was going smoothly.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `The pull to step back in will be strongest exactly when something under their leadership starts to slip — which is precisely the moment that matters most. Try to notice the difference between a moment that's genuinely beyond what they can handle (worth stepping in) and a moment that's just uncomfortable to watch (not the same thing). Most of what will feel urgent this week is the second kind.`,
    },

    moveOutroShared: `That's the work this week — not a responsibility that goes perfectly, but one that stays genuinely theirs to lead across the whole week, including through whatever goes wrong.`,

    whatWorkingLooksLike: `You may notice your child adjusting course on their own when something under their lead isn't working, without waiting for you to point it out — genuinely managing the responsibility rather than just holding the title of being in charge of it. A day where the lead visibly held under real difficulty is often a stronger sign than five easy days where nothing tested it. Some days the lead may quietly slip back to you — noticing when and why that happened is more useful than avoiding it happening at all.`,

    thingToHoldOnto: `Leadership that only holds when things are going well isn't quite leadership yet. This week isn't measuring whether the responsibility went smoothly — it's finding out how much of it stayed genuinely theirs when it didn't.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Notice how {{child_name}} handles leading a single decision well versus an ongoing responsibility that needs tending over time.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Hand over a real ongoing responsibility.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `Tell {{child_name}} directly: *"This is yours to run for the whole week, not just decide once — I'm not going to manage it."*`,
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Check in on it.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "**Worked** — let it keep running under {{child_pronoun_poss}} lead without unnecessary check-ins. **Mixed** — talk about which days the lead held and which it quietly slipped back to you. **Didn't land** — narrow the responsibility to something more concrete.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let a real failure happen under {{child_pronoun_poss}} lead.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Something will go wrong at some point. Don't step in to rescue or quietly retake control — let the consequence be real.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Name it directly.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `*"You led this the whole week, not just one moment of it — including when it went wrong. That's real responsibility."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "",
      "10-11": "",
      "12-14": "Ask {{child_name}} directly how it felt to carry something the whole week, not just decide once.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
