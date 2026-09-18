import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Staying with it" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const stayingWithIt: GoalSkillContent = {
  problem:
    "{{child_name}} holds attention while something is interesting and stops where it turns ordinary — which is most of homework. The report found the break isn't difficulty; it's the dull middle, and there's currently nothing carrying {{child_pronoun_obj}} across it.",
  goals: [
    { key: "staying-with-it-1", text: "{{child_name}} stays with work past the point it stops being interesting", why: "four nights out of five", recommended: true },
    { key: "staying-with-it-2", text: "Homework takes one sitting instead of three", why: "the same work, without the restarts", recommended: false },
    { key: "staying-with-it-3", text: "{{child_name}} finishes what {{child_pronoun_subj}} starts without me sitting there", why: "the stretch holds without an audience", recommended: false },
    { key: "staying-with-it-4", text: "I stop counting down the minutes out loud", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Find out where the stretch actually ends, without extending it.", parentOutcome: "You watch and note the point {{child_pronoun_subj}} stops. No intervention. That point is your baseline.", childOutcome: "Nothing changes for {{child_pronoun_obj}} tonight." },
    { week: 2, objective: "Remove what interrupts the stretch before it ends on its own.", parentOutcome: "You clear one recurring interruption — the one you already know about.", childOutcome: "The stretch gets a chance to run its natural length." },
    { week: 3, objective: "Extend by a few minutes, from what already works.", parentOutcome: "You stop naming a finish time, and stop checking in at the usual point.", childOutcome: "{{child_pronoun_subj|cap}} may go a few minutes past the usual stopping point, unprompted." },
    { week: 4, objective: "Protect the stretch on a night it collapses early.", parentOutcome: "You let a short night be short, and say nothing about it.", childOutcome: "A bad stretch stops becoming a bad evening." },
    { week: 5, objective: "Let the stretch happen where you can't see it.", parentOutcome: "You leave the room once the stretch has started.", childOutcome: "The stretch may hold without you watching." },
    { week: 6, objective: "Hand the pacing over.", parentOutcome: "Nothing. That is the week.", childOutcome: "{{child_pronoun_subj|cap}} may name {{child_pronoun_poss}} own stopping point." },
  ],
  bridges: {
    homework:   "You came in about homework. What the assessment found is that {{child_name}} manages the interesting part and stops where it turns ordinary — which is most of homework.",
    reminders:  "You came in because you're reminding constantly. What the assessment found is that the reminders cluster at one point: where the work stops being interesting and there's nothing carrying {{child_pronoun_obj}} past it.",
    screens:    "You came in worried about screens. What the assessment found is that the screen arrives at a particular moment — the point where work stops being interesting and {{child_name}} has nothing to carry {{child_pronoun_obj}} past it.",
    confidence: "You came in about confidence. What the assessment found is that {{child_name}} rarely stays long enough to feel a thing get easier, which is where that belief usually comes from.",
    giveup:     "You came in because {{child_name}} gives up. What the assessment found is that it happens at a consistent point — not when it gets hard, but when it stops being interesting.",
    finish:     "You came in about things not getting finished. What the assessment found is that {{child_name}} stops at the same place each time: the dull middle, not the difficult end.",
    other:      "What the assessment found is that {{child_name}} holds attention well while something is interesting, and stops where it stops being so.",
  },
};
