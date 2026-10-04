import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Staying with it" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const stayingWithIt: GoalSkillContent = {
  problem:
    "{{child_name}} stays focused while something is interesting, and stops when it gets boring, which is most of homework. The problem isn't that the work is too hard. It's the dull middle, and right now nothing helps {{child_pronoun_obj}} get through it.",
  goals: [
    { key: "staying-with-it-1", text: "{{child_name}} keeps going even after the work gets boring", why: "four nights out of five", recommended: true },
    { key: "staying-with-it-2", text: "Homework takes one sitting instead of three", why: "the same work, without the restarts", recommended: false },
    { key: "staying-with-it-3", text: "{{child_name}} finishes what {{child_pronoun_subj}} starts without me sitting there", why: "the stretch holds without an audience", recommended: false },
    { key: "staying-with-it-4", text: "I stop counting down the minutes out loud", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Notice how long {{child_pronoun_subj}} stays with it before stopping. Don't push for more yet.", parentOutcome: "Watch and note when {{child_pronoun_subj}} stops. Don't step in. That's your starting point.", childOutcome: "Nothing changes for {{child_pronoun_obj}} tonight." },
    { week: 2, objective: "Remove one thing that keeps interrupting {{child_pronoun_obj}}.", parentOutcome: "Clear the one interruption you already know about, like a phone nearby.", childOutcome: "{{child_pronoun_subj|cap}} gets a chance to keep going as long as {{child_pronoun_subj}} naturally would." },
    { week: 3, objective: "Add a few minutes to what already works.", parentOutcome: "Don't set a finish time, and don't check in at the usual point.", childOutcome: "{{child_pronoun_subj|cap}} may go a few minutes past {{child_pronoun_poss}} usual stopping point, on {{child_pronoun_poss}} own." },
    { week: 4, objective: "Protect the routine on a night {{child_pronoun_subj}} stops early.", parentOutcome: "If it's a short night, let it be short. Say nothing about it.", childOutcome: "A short session doesn't turn into a bad evening." },
    { week: 5, objective: "Let {{child_pronoun_obj}} keep going without you watching.", parentOutcome: "Once {{child_pronoun_subj}} has started, leave the room.", childOutcome: "{{child_pronoun_subj|cap}} may keep going without you there." },
    { week: 6, objective: "Let {{child_pronoun_obj}} decide when to take a break.", parentOutcome: "Nothing new. Stepping back is the whole week.", childOutcome: "{{child_pronoun_subj|cap}} may decide {{child_pronoun_poss}} own stopping point." },
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
