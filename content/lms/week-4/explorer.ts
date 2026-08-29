import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "explorer",
  week: 4,
  weekTitle: "When the Idea Turns Out to Be Nothing",

  weeklyReading: {
    introShared: `Week 3 made the capture system a standing habit, ideas actually revisited. This week tests what happens when a followed-up idea turns out to be a genuine dead end — not a bad habit, just a real miss. Does the system (and {{child_name}}'s trust in it) survive that?`,

    moveCalibration: {
      "8-9": `When a chased tangent turns out to be a dead end, the instinct will be to gently point out it "wasn't worth chasing" — even said kindly, this teaches {{child_name}} to pre-judge ideas rather than follow curiosity honestly. Let a dead end just be a dead end this week, no commentary.`,
      "10-11": `The temptation is to use a dead end as proof the system needs more filtering ("maybe write down only the good ones"). Resist that. A system that only captures ideas you've pre-approved isn't actually {{child_pronoun_poss}} own anymore.`,
      "12-14": `At this age, watch for the subtler move — sighing, a look, a tone shift when a followed-up idea goes nowhere. {{child_name}} at this age reads those signals precisely, even unintentionally.`,
    },

    moveOutroShared: `A real dead end, not a setup — something {{child_name}} genuinely believed was worth chasing that turns out not to be.`,

    whatWorkingLooksLike: `Dead ends stop being treated as mistakes to prevent next time. The system holds {{child_name}}'s curiosity, not just {{child_pronoun_poss}} successes.`,

    thingToHoldOnto: `A system that only ever leads somewhere good isn't teaching curiosity — it's teaching {{child_name}} to only chase sure things.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice one captured idea this week that {{child_name}} follows up on that looks unlikely to lead anywhere.",
        "10-11": `Same, and notice whether your read on "unlikely" is based on the idea itself or just on how many other tangents came before it.`,
        "12-14": "Notice an idea {{child_name}} is genuinely excited to chase that you privately think won't pan out.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them chase one that clearly isn't going anywhere.",
      content: {
        "8-9": "Don't discourage it in advance and don't hint at your own doubts. Let {{child_name}} spend real time on it.",
        "10-11": `Resist the "maybe check if this is worth it first" move — that quietly pre-filters curiosity.`,
        "12-14": "Say nothing at all about likelihood of success, even when asked directly — turn it back to what {{child_name}} thinks.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — the chase hit a dead end and you said nothing evaluative. Keep that up.\n**Mixed** — you stayed quiet but visibly braced or looked away when it fizzled. Worth naming honestly if {{child_name}} noticed and asked.\n**Didn't land** — you steered away from the idea before it could run its course. Notice what made this one feel worth pre-empting.`,
        "10-11": `**Worked** — the chase hit a dead end and you said nothing evaluative. Keep that up.\n**Mixed** — you stayed quiet but visibly braced or looked away when it fizzled. Worth naming honestly if {{child_name}} noticed and asked.\n**Didn't land** — you steered away from the idea before it could run its course. Notice what made this one feel worth pre-empting.`,
        "12-14": `**Worked** — the chase hit a dead end and you said nothing evaluative. Keep that up.\n**Mixed** — you stayed quiet but visibly braced or looked away when it fizzled. Worth naming honestly if {{child_name}} noticed and asked.\n**Didn't land** — you steered away from the idea before it could run its course. Notice what made this one feel worth pre-empting.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let it dead-end fully, without steering them off it early.",
      content: {
        "8-9": "Let an idea {{child_name}} is excited about run all the way to a real dead end, with zero gentle redirect along the way.",
        "10-11": "Same, but pick one {{child_name}} has told someone else about, so the dead end is genuinely felt, not just private.",
        "12-14": "Let {{child_name}} be the one to declare it a dead end, in {{child_pronoun_poss}} own time, without you naming it first.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say dead ends are part of chasing ideas, not a reason to stop.",
      content: {
        "8-9": `*"That one didn't go anywhere — and that's a normal part of chasing ideas."*`,
        "10-11": `*"That idea didn't pan out. Doesn't mean it wasn't worth chasing."*`,
        "12-14": `*"That one fizzled. The chasing is still the skill, not the landing."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did a dead end change how eagerly {{child_name}} reached for the capture system afterward?",
      "10-11": "Did trust in the system hold, or did {{child_name}} start self-filtering ideas before capturing them?",
      "12-14": "Did {{child_name}}'s own tolerance for dead ends shift this week — separate from anything you did?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
