import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Starting" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const starting: GoalSkillContent = {
  problem:
    "{{child_name}} finds the very start the hardest part: the gap between knowing what to do and writing the first line. That's why reminders don't land. They add pressure, but they don't show {{child_pronoun_obj}} where to begin. Until starting gets easier, nothing after it can.",
  goals: [
    { key: "starting-1", text: "{{child_name}} starts homework without being asked twice", why: "four nights out of five, instead of forty minutes of circling", recommended: true },
    { key: "starting-2", text: "{{child_name}} starts within five minutes of sitting down", why: "same work, less of the run-up", recommended: false },
    { key: "starting-3", text: "{{child_name}} starts before I've come into the room", why: "beginning stops needing an audience", recommended: false },
    { key: "starting-4", text: "I stop opening the book for {{child_pronoun_obj}}", why: "the change is mine; this is the one I control directly", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Notice how long it takes {{child_pronoun_obj}} to start. Don't change anything yet.", parentOutcome: "For the first five minutes, don't remind {{child_pronoun_obj}}. Just note how long it takes to start. Write that time down; you'll compare it in week six.", childOutcome: "Nothing is asked of {{child_pronoun_obj}}. The room is just quieter than usual." },
    { week: 2, objective: "Show {{child_pronoun_obj}} the first step, so starting isn't a big decision.", parentOutcome: "Before {{child_pronoun_subj}} sits down, write the first line of the task on a piece of paper. Then say nothing.", childOutcome: "{{child_pronoun_subj|cap}} knows exactly where to begin." },
    { week: 3, objective: "Keep the same start routine, even on the evening it feels pointless.", parentOutcome: "On a bad night, set up exactly the same way. Don't add anything.", childOutcome: "Starting becomes normal, not a big event." },
    { week: 4, objective: "After a night that didn't work, keep the routine going.", parentOutcome: "Do the same routine the next evening. Don't mention yesterday.", childOutcome: "One bad night doesn't spoil the next one." },
    { week: 5, objective: "Set things up earlier, then leave the room.", parentOutcome: "Get things ready before {{child_pronoun_subj}} sits down, not while {{child_pronoun_subj}} works.", childOutcome: "{{child_pronoun_subj|cap}} may start even when you're not there." },
    { week: 6, objective: "Let {{child_pronoun_obj}} start on {{child_pronoun_poss}} own.", parentOutcome: "Nothing new. Stepping back is the whole week.", childOutcome: "{{child_pronoun_subj|cap}} may set up {{child_pronoun_poss}} own first step." },
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
