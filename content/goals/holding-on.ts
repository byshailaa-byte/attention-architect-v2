import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Holding on" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const holdingOn: GoalSkillContent = {
  problem:
    "{{child_name}} starts well. The trouble is what comes next: a new idea, a notification, a sibling, and {{child_pronoun_subj}} has lost {{child_pronoun_poss}} place. {{child_pronoun_poss|cap}} attention isn't missing. Something keeps pulling it away. That's why saying \"concentrate\" doesn't help. It comes at the wrong moment.",
  goals: [
    { key: "holding-on-1", text: "{{child_name}} keeps going with homework, even when a new idea pops up", why: "four nights out of five, instead of drifting within minutes", recommended: true },
    { key: "holding-on-2", text: "{{child_name}} comes back on {{child_pronoun_poss}} own after drifting", why: "without me noticing and calling {{child_pronoun_obj}} back", recommended: false },
    { key: "holding-on-3", text: "Homework takes one sitting instead of three", why: "the same work, without the restarts", recommended: false },
    { key: "holding-on-4", text: "I stop pushing at the moment the work is already finished in {{child_pronoun_poss}} head", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Notice when {{child_pronoun_subj}} starts to drift. Don't change anything yet.", parentOutcome: "For the first two minutes, don't step in. Just watch. Count the nights {{child_pronoun_subj}} stays with it. That's your starting point.", childOutcome: "Nothing is asked of {{child_pronoun_obj}} this week." },
    { week: 2, objective: "When a new idea pops up, give it somewhere to go, so {{child_pronoun_subj}} doesn't lose {{child_pronoun_poss}} place.", parentOutcome: "Instead of reminding {{child_pronoun_obj}}, say one line: \"Write it down, then come back to it.\" Say it once, then leave it.", childOutcome: "{{child_pronoun_subj|cap}} no longer has to choose between the idea and the homework." },
    { week: 3, objective: "Build on the time {{child_pronoun_subj}} already manages, instead of asking for more.", parentOutcome: "Don't set a finish time. Let {{child_pronoun_obj}} stop when {{child_pronoun_subj}} stops.", childOutcome: "Work that took three sittings may start taking two." },
    { week: 4, objective: "Make it easy to get back to work, so one hard moment doesn't end the evening.", parentOutcome: "Ask where it got hard, not whether it did. One question, then stay quiet.", childOutcome: "A hard question stops being the end of homework." },
    { week: 5, objective: "Remind {{child_pronoun_obj}} before {{child_pronoun_subj}} starts. Then stop reminding.", parentOutcome: "Help {{child_pronoun_obj}} set up before {{child_pronoun_subj}} sits down. Then leave the room.", childOutcome: "It may start happening when you're not there to see it." },
    { week: 6, objective: "Let {{child_pronoun_obj}} run it {{child_pronoun_reflexive}}.", parentOutcome: "Nothing new. Stepping back is the whole week.", childOutcome: "{{child_pronoun_subj|cap}} may name it {{child_pronoun_reflexive}}: \"I need ten minutes.\"" },
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
