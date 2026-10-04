import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Carrying it over" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const carryingItOver: GoalSkillContent = {
  problem:
    "{{child_name}} does well when you've set things up, and struggles when you haven't. The skill is real. It just hasn't moved from your setup into {{child_pronoun_poss}} own habits yet.",
  goals: [
    { key: "carrying-it-over-1", text: "{{child_name}} does it even when I'm not watching", why: "outside homework, without a prompt", recommended: true },
    { key: "carrying-it-over-2", text: "The same habit shows up outside homework", why: "not just at the desk, not just in the evening", recommended: false },
    { key: "carrying-it-over-3", text: "{{child_name}} manages a task I didn't set up", why: "something that wasn't arranged for {{child_pronoun_obj}}", recommended: false },
    { key: "carrying-it-over-4", text: "I'm no longer the one who has to start it", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Notice where it works and where it doesn't.", parentOutcome: "Note the times and places it works. That list is your starting point.", childOutcome: "Nothing is asked of {{child_pronoun_obj}}." },
    { week: 2, objective: "Give what works a name, so {{child_pronoun_subj}} can use it anywhere.", parentOutcome: "Pick a name {{child_pronoun_subj}}'d actually use, say it once, then stop explaining.", childOutcome: "It becomes {{child_pronoun_poss}} habit, not your setup." },
    { week: 3, objective: "Try it on a small task that isn't homework.", parentOutcome: "Use the same setup for something small, like packing the school bag.", childOutcome: "{{child_pronoun_subj|cap}} may spot that it works there too." },
    { week: 4, objective: "Keep going even when it doesn't work somewhere new.", parentOutcome: "If it fails outside homework, don't go back to using it only for homework.", childOutcome: "One miss doesn't mean it only works at the desk." },
    { week: 5, objective: "Stop being the one who starts it.", parentOutcome: "Don't start it yourself. Wait and see if {{child_pronoun_subj}} does.", childOutcome: "It may happen without you saying anything." },
    { week: 6, objective: "Let {{child_pronoun_obj}} own it fully.", parentOutcome: "Nothing new. Stepping back is the whole week.", childOutcome: "{{child_pronoun_subj|cap}} may use it somewhere you never suggested." },
  ],
  bridges: {
    homework:   "You came in about homework. What the assessment found is that homework goes well when you've set it up — and that nothing like it happens anywhere you haven't.",
    reminders:  "You came in because you're reminding constantly. What the assessment found is that the reminding never ends because the focus is real, but it currently only exists where you've put it.",
    screens:    "You came in worried about screens. What the assessment found is that {{child_name}} manages this well when you've set it up, and not at all when you haven't. The screen wins in the rooms you aren't in.",
    confidence: "You came in about confidence. What the assessment found is that {{child_name}}'s sense of what {{child_pronoun_subj}} can do is tied to where you are. It doesn't travel with {{child_pronoun_obj}}.",
    giveup:     "You came in because {{child_name}} gives up. What the assessment found is that {{child_pronoun_subj}} doesn't, where you've set things up. {{child_pronoun_subj|cap}} gives up in the settings that have no setup in them.",
    finish:     "You came in about things not getting finished. What the assessment found is that there's a pattern in which ones get finished: the ones you didn't set up.",
    other:      "What the assessment found is that it works where you've arranged it, and nowhere else. The skill hasn't travelled yet.",
  },
};
