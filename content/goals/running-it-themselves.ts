import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Running it themselves" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const runningItThemselves: GoalSkillContent = {
  goals: [
    { key: "running-it-themselves-1", text: "{{child_name}} notices {{child_pronoun_poss}} own attention and adjusts it", why: "without being told to", recommended: true },
    { key: "running-it-themselves-2", text: "{{child_name}} asks for what {{child_pronoun_subj}} needs instead of me guessing", why: "{{child_pronoun_subj}} names it; you stop interpreting", recommended: false },
    { key: "running-it-themselves-3", text: "The evening runs without me managing it", why: "available, not in charge", recommended: false },
    { key: "running-it-themselves-4", text: "I stop managing {{child_pronoun_poss}} attention day to day", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Find out how much of it is currently you.", parentOutcome: "You count your interventions in a normal evening. That number is your baseline.", childOutcome: "Nothing changes yet." },
    { week: 2, objective: "Say what you're noticing, once, so it becomes visible to {{child_pronoun_obj}}.", parentOutcome: "You describe what you see rather than what to do.", childOutcome: "The thing you've been managing becomes something {{child_pronoun_subj}} can see." },
    { week: 3, objective: "Ask instead of instruct, on an ordinary day.", parentOutcome: "\"What would make this easier to start?\" Then wait, even if the pause is long.", childOutcome: "{{child_pronoun_subj|cap}} may answer with something you wouldn't have chosen." },
    { week: 4, objective: "Let a bad night stay {{child_pronoun_poss}}.", parentOutcome: "You don't take the evening back when it goes wrong.", childOutcome: "The recovery stays {{child_pronoun_poss}} problem to solve." },
    { week: 5, objective: "Step out of the room and stay out.", parentOutcome: "Available, not present.", childOutcome: "The evening may run without you in it." },
    { week: 6, objective: "Say nothing.", parentOutcome: "Nothing. That is the week — and it's the hardest one.", childOutcome: "Whatever {{child_pronoun_subj}} does this week is {{child_pronoun_poss}}." },
  ],
  bridges: {
    homework:   "You came in about homework. What the assessment found is that homework works — but it works because you're running it, and that's a job with no end date.",
    reminders:  "You came in because you're reminding constantly. What the assessment found is that the reminding *is* the attention. Take it away and there isn't yet a system underneath.",
    screens:    "You came in worried about screens. What the assessment found is that most of what holds {{child_name}}'s attention together is currently you, and the screen wins whenever you aren't the one holding it.",
    confidence: "You came in about confidence. What the assessment found is that {{child_name}} has little evidence {{child_pronoun_subj}} manages {{child_pronoun_poss}} own attention, because {{child_pronoun_subj}} hasn't yet had to.",
    giveup:     "You came in because {{child_name}} gives up. What the assessment found is that {{child_pronoun_subj}} gives up when you're not there to keep it going. The persistence is currently yours, not {{child_pronoun_poss}}.",
    finish:     "You came in about things not getting finished. What the assessment found is that the ones that finish are the ones you carried. That's the part to hand over.",
    other:      "What the assessment found is that most of what holds {{child_name}}'s attention together is currently you.",
  },
};
