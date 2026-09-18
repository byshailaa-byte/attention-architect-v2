import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Holding on" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const holdingOn: GoalSkillContent = {
  problem:
    "{{child_name}} starts perfectly well. The report found the break is what happens next — a new idea, a notification, a sibling, and the page is gone. {{child_pronoun_poss|cap}} attention isn't absent; it keeps getting taken. Which is why \"concentrate\" is advice about the wrong moment.",
  goals: [
    { key: "holding-on-1", text: "{{child_name}} stays with homework when a new idea arrives", why: "four nights out of five, instead of drifting within minutes", recommended: true },
    { key: "holding-on-2", text: "{{child_name}} comes back on {{child_pronoun_poss}} own after drifting", why: "without me noticing and calling {{child_pronoun_obj}} back", recommended: false },
    { key: "holding-on-3", text: "Homework takes one sitting instead of three", why: "the same work, without the restarts", recommended: false },
    { key: "holding-on-4", text: "I stop pushing at the moment the work is already finished in {{child_pronoun_poss}} head", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Find out where the drift actually begins, without changing anything yet.", parentOutcome: "You stop stepping in during the first two minutes and watch instead. Count the nights {{child_pronoun_subj}} stays — that's your baseline.", childOutcome: "Nothing is asked of {{child_pronoun_obj}} this week." },
    { week: 2, objective: "Give the arriving idea somewhere to go, so it stops costing {{child_pronoun_obj}} the page.", parentOutcome: "One sentence replaces the reminder: \"write it down, then come back to it.\" Said once, then nothing.", childOutcome: "The new idea stops being a choice between two things." },
    { week: 3, objective: "Extend the stretch {{child_pronoun_subj}} already has, rather than asking for a longer one.", parentOutcome: "You stop naming a finish time. The stretch ends where it ends.", childOutcome: "Work that took three sittings may start taking two." },
    { week: 4, objective: "Make the return cheap, so a bad night stops ending the evening.", parentOutcome: "You ask where it got hard, not whether it did. One question, then quiet.", childOutcome: "A hard question stops being the end of homework." },
    { week: 5, objective: "Move your prompting from during, to before, to not at all.", parentOutcome: "You leave the room. Setup happens before {{child_pronoun_subj}} sits, not while {{child_pronoun_subj}} works.", childOutcome: "It may start happening when you're not there to see it." },
    { week: 6, objective: "Hand it over.", parentOutcome: "Nothing. That is the week.", childOutcome: "{{child_pronoun_subj|cap}} may name it {{child_pronoun_reflexive}}: \"I need ten minutes.\"" },
  ],
  bridges: {
    homework:   "You came in about homework. What the assessment found is that {{child_name}} starts it perfectly well — and then something arrives, and the page is gone.",
    reminders:  "You came in because you're reminding constantly. What the assessment found is that the reminders are doing someone else's job: they're what pulls {{child_name}} back after something else pulled {{child_pronoun_obj}} away.",
    screens:    "You came in worried about screens. What the assessment found is that {{child_name}} starts fine. What {{child_pronoun_subj}} can't do is stay once something new arrives, and the screen is simply the most available new thing.",
    confidence: "You came in about confidence. What the assessment found is that {{child_name}} keeps losing things halfway, which over time reads to {{child_pronoun_obj}} as not being able to do them.",
    giveup:     "You came in because {{child_name}} gives up. What the assessment found is that {{child_pronoun_subj}} doesn't give up — {{child_pronoun_subj}} gets taken. Something arrives and the first thing is dropped without a decision being made.",
    finish:     "You came in about things not getting finished. What the assessment found is exactly that: {{child_name}} begins well and something intercepts {{child_pronoun_obj}} partway.",
    other:      "What the assessment found is that {{child_name}} begins well. The break is what happens when something else arrives mid-task.",
  },
};
