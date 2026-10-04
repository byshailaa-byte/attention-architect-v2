import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Running it themselves" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const runningItThemselves: GoalSkillContent = {
  problem:
    "Right now, much of what keeps {{child_name}} focused is you: the reminders, the checking, the sitting nearby. That works while you're there. When you're not, it falls apart, because the habit is yours, not {{child_pronoun_poss}}.",
  goals: [
    { key: "running-it-themselves-1", text: "{{child_name}} notices when {{child_pronoun_poss}} attention slips and brings it back", why: "without being told to", recommended: true },
    { key: "running-it-themselves-2", text: "{{child_name}} asks for what {{child_pronoun_subj}} needs instead of me guessing", why: "{{child_pronoun_subj}} names it; you stop interpreting", recommended: false },
    { key: "running-it-themselves-3", text: "The evening runs without me managing it", why: "available, not in charge", recommended: false },
    { key: "running-it-themselves-4", text: "I stop managing {{child_pronoun_poss}} focus every day", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Notice how much of it is you right now.", parentOutcome: "Count how many times you step in on a normal evening. That number is your starting point.", childOutcome: "Nothing changes yet." },
    { week: 2, objective: "Tell {{child_pronoun_obj}} what you notice, once, so {{child_pronoun_subj}} can see it too.", parentOutcome: "Describe what you see, instead of telling {{child_pronoun_obj}} what to do.", childOutcome: "{{child_pronoun_subj|cap}} starts to see what you've been handling." },
    { week: 3, objective: "Ask instead of telling, on a normal day.", parentOutcome: "Ask: \"What would make this easier to start?\" Then wait, even if the pause is long.", childOutcome: "{{child_pronoun_subj|cap}} may suggest something you wouldn't have chosen." },
    { week: 4, objective: "When the evening goes badly, let {{child_pronoun_obj}} handle it.", parentOutcome: "Don't take over when it goes wrong.", childOutcome: "Fixing it stays {{child_pronoun_poss}} job." },
    { week: 5, objective: "Leave the room, and stay out.", parentOutcome: "Stay close enough to help if asked, but out of the room.", childOutcome: "The evening may run without you in it." },
    { week: 6, objective: "Step back completely.", parentOutcome: "Nothing new. Stepping back is the whole week, and it's the hardest one.", childOutcome: "Whatever happens this week, {{child_pronoun_subj}} did it {{child_pronoun_reflexive}}." },
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
