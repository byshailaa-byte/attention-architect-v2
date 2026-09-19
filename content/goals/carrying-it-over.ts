import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Carrying it over" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const carryingItOver: GoalSkillContent = {
  problem:
    "{{child_name}} manages this well where you've set it up, and not at all where you haven't. The report found the skill is real but hasn't travelled — it currently lives in the conditions you create rather than in {{child_pronoun_obj}}.",
  goals: [
    { key: "carrying-it-over-1", text: "{{child_name}} uses it somewhere I'm not watching", why: "outside homework, without a prompt", recommended: true },
    { key: "carrying-it-over-2", text: "The same approach shows up outside homework", why: "not just at the desk, not just in the evening", recommended: false },
    { key: "carrying-it-over-3", text: "{{child_name}} manages a task I didn't set up", why: "something that wasn't arranged for {{child_pronoun_obj}}", recommended: false },
    { key: "carrying-it-over-4", text: "I stop being the trigger for it happening", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Find out where it currently works and where it doesn't.", parentOutcome: "You note which settings it holds in. That list is your baseline.", childOutcome: "Nothing is asked of {{child_pronoun_obj}}." },
    { week: 2, objective: "Name the thing that works, once, so it becomes portable.", parentOutcome: "You give it a name {{child_pronoun_subj}}'d actually use. Then you stop explaining it.", childOutcome: "The approach becomes something {{child_pronoun_subj}} can carry rather than something you run." },
    { week: 3, objective: "Run it on an ordinary task that isn't homework.", parentOutcome: "You apply the same setup to something small and unrelated.", childOutcome: "{{child_pronoun_subj|cap}} may recognise the shape of it somewhere new." },
    { week: 4, objective: "Keep it available after it fails in a new setting.", parentOutcome: "You don't retreat to homework-only when it doesn't transfer.", childOutcome: "A failed transfer stops meaning it only works at the desk." },
    { week: 5, objective: "Remove yourself as the trigger.", parentOutcome: "You stop initiating it, and wait to see whether it appears.", childOutcome: "It may happen without a prompt." },
    { week: 6, objective: "Hand it over entirely.", parentOutcome: "Nothing. That is the week.", childOutcome: "{{child_pronoun_subj|cap}} may use it somewhere you never suggested." },
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
