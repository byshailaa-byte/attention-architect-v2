import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}} weighed the competing need and made a real call, either way. Keep stepping back.\n**Mixed** — {{child_name}} made the call but you second-guessed it out loud afterward. Notice what that did to {{child_pronoun_poss}} confidence in the decision.\n**Didn't land** — you decided for {{child_name}}. Worth naming what made this one feel too urgent to leave to {{child_pronoun_obj}}.`;

export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 5,
  weekTitle: "When a Sibling Needs You Mid-Session",

  weeklyReading: {
    introShared: `Depth has been protected from interruption and from its own bad stretches. This week: what happens when a sibling's genuine need competes for the same time or space {{child_name}}'s depth needs?`,

    moveCalibration: {
      "8-9": `The instinct will be to interrupt {{child_name}}'s deep session the moment a sibling needs something, assuming depth should always yield. This week, let {{child_name}} be the one to decide how to respond, not you deciding for {{child_pronoun_obj}}.`,
      "10-11": `Watch for quietly resenting the sibling's need on {{child_name}}'s behalf, protecting the depth so fiercely it reads as the sibling's need doesn't matter. Both things can be real at once.`,
      "12-14": `At this age, {{child_name}} can hold the tension {{child_pronoun_subj}}self — resist solving it for {{child_pronoun_obj}} by deciding whose need wins.`,
    },

    moveOutroShared: `Pick moments where the competing need is real, not manufactured — a genuine ask from a sibling, not a test.`,

    whatWorkingLooksLike: `{{child_name}} weighs competing needs directly rather than defaulting to either always yielding or always protecting the depth.`,

    thingToHoldOnto: `Depth that never has to make room for anyone else isn't being tested — it's being sheltered.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where a sibling's real need runs up against {{child_name}}'s deep session.",
        "10-11": "Same, and notice whether {{child_name}} seems aware of the sibling's need at all before it becomes unavoidable.",
        "12-14": "Notice a moment where {{child_name}} has to actively choose between protecting depth and responding to someone else — not just a passing interruption.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them decide whether to pause, instead of deciding for them.",
      content: {
        "8-9": "Don't decide for {{child_name}} whether to pause. Let {{child_pronoun_obj}} choose, even if it costs the sibling some waiting.",
        "10-11": "Resist stepping in to handle the sibling's need yourself to protect the depth. Let {{child_name}} weigh it directly.",
        "12-14": "Stay out of it entirely unless asked — let the negotiation between them happen on its own terms.",
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
      title: "Let the sibling wait once, without you smoothing it over.",
      content: {
        "8-9": "Pick a genuine sibling need that collides with a deep session this week, and leave it entirely to {{child_name}} to navigate — including the option of choosing depth over the ask, without your correction afterward.",
        "10-11": "Same, but pick a moment where the sibling's need is time-sensitive, so the choice actually has weight either way.",
        "12-14": "Let {{child_name}} explain the choice to the sibling directly afterward, if a conversation is needed — don't mediate that conversation for {{child_pronoun_obj}}.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it was a hard call, not that they were selfish or generous.",
      content: {
        "8-9": `*"That wasn't an easy call — someone else needed something too, and you decided. That's real."*`,
        "10-11": `*"You had to weigh your own need against someone else's. That's not simple, and you did it."*`,
        "12-14": `*"You made a real choice there, and you owned it with {{child_pronoun_obj}} directly. That's the harder version of this."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}} get more confident weighing depth against someone else's need by week's end?",
      "10-11": "Did the sibling dynamic around these moments shift at all — more patience, more friction, or about the same?",
      "12-14": "Did {{child_name}} start factoring in the sibling's need earlier in the process, before it became urgent?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
