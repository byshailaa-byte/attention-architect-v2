import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Starting" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const starting: GoalSkillContent = {
  goals: [
    { key: "starting-1", text: "{{child_name}} begins homework without being asked twice", why: "four nights out of five, instead of forty minutes of circling", recommended: true },
    { key: "starting-2", text: "The gap between sitting down and starting drops under five minutes", why: "same work, less of the run-up", recommended: false },
    { key: "starting-3", text: "{{child_name}} starts before I've come into the room", why: "beginning stops needing an audience", recommended: false },
    { key: "starting-4", text: "I stop opening the book for {{child_pronoun_obj}}", why: "the change is mine; this is the one I control directly", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Find out how long the gap actually is, without changing anything.", parentOutcome: "You stop prompting for the first five minutes and time the gap instead. That number is your baseline.", childOutcome: "Nothing is asked of {{child_pronoun_obj}}. The room is quieter than usual." },
    { week: 2, objective: "Make the first step visible, so beginning stops being a decision.", parentOutcome: "You write the first line of the task on paper before {{child_pronoun_subj}} sits. Then you say nothing.", childOutcome: "The task has an entry point {{child_pronoun_subj}} didn't have to choose." },
    { week: 3, objective: "Hold the same start routine on the evening it feels pointless.", parentOutcome: "You run the identical setup on a bad night, without adding anything to it.", childOutcome: "Starting becomes ordinary rather than an event." },
    { week: 4, objective: "Keep the start intact after a night it didn't work.", parentOutcome: "You repeat the routine the next evening without mentioning yesterday.", childOutcome: "One failed night stops setting the tone for the next." },
    { week: 5, objective: "Move the setup earlier, then out of the room.", parentOutcome: "You prepare before {{child_pronoun_subj}} sits, not while {{child_pronoun_subj}} works.", childOutcome: "The start may happen without you present." },
    { week: 6, objective: "Hand the start over.", parentOutcome: "Nothing. That is the week.", childOutcome: "{{child_pronoun_subj|cap}} may set up {{child_pronoun_poss}} own first step." },
  ],
  bridges: {
    homework:   "You came in about homework. What the assessment found is that the homework isn't the problem — the ninety minutes go before it starts, because {{child_name}} has no way into the first line.",
    reminders:  "You came in because you're reminding constantly. What the assessment found is that the reminders land in a moment that has no first step in it, which is why they add pressure without adding direction.",
    screens:    "You came in worried about screens. What the assessment found is that the screen isn't competing with homework — it's filling the gap before homework begins, because beginning is the part {{child_name}} has no way into.",
    confidence: "You came in about confidence. What the assessment found is that {{child_name}} rarely reaches the part where finishing is possible — and a child who can't start doesn't accumulate the evidence that {{child_pronoun_subj}} can.",
    giveup:     "You came in because {{child_name}} gives up. What the assessment found is that most of it happens before the trying: what looks like giving up is usually never having begun.",
    finish:     "You came in about things not getting finished. What the assessment found is that the break is earlier than it looks — what doesn't get finished mostly didn't get properly started.",
    other:      "What the assessment found is that the break is right at the beginning: the gap between knowing what to do and doing the first line of it.",
  },
};
