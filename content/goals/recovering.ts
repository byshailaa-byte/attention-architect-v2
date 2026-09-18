import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Recovering" skill.
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
// {{child_name}} = child's first name; {{child_pronoun_*}} resolve from child_gender
// (they/their fallback), filled by fillLmsContent at render.
export const recovering: GoalSkillContent = {
  problem:
    "{{child_name}} doesn't lose focus so much as fail to return to it. The report found that one hard question, one mistake, and the evening is over. The break is the coming back — a different skill from the staying, and the one that's missing.",
  goals: [
    { key: "recovering-1", text: "{{child_name}} comes back after a hard question instead of stopping for the night", why: "four nights out of five", recommended: true },
    { key: "recovering-2", text: "A mistake stops ending the evening", why: "the recovery takes minutes, not the rest of the night", recommended: false },
    { key: "recovering-3", text: "{{child_name}} restarts without me talking {{child_pronoun_obj}} back into it", why: "the return stops needing a conversation first", recommended: false },
    { key: "recovering-4", text: "I stop rescuing at the first sign of frustration", why: "the change is mine", recommended: false },
  ],
  objectives: [
    { week: 1, objective: "Find out what a stall looks like before you step into it.", parentOutcome: "You wait ninety seconds before responding, and count how often {{child_pronoun_subj}} restarts alone. That's your baseline.", childOutcome: "A gap opens where the rescue used to be." },
    { week: 2, objective: "Take the weight off the thing {{child_pronoun_subj}} got stuck on.", parentOutcome: "You ask where it got hard, not whether it did. One question, then quiet.", childOutcome: "The stuck moment stops being a verdict on {{child_pronoun_obj}}." },
    { week: 3, objective: "Keep the return available on an ordinary day.", parentOutcome: "You leave the work out rather than clearing it away.", childOutcome: "Coming back costs less than starting again." },
    { week: 4, objective: "Make the return the thing that counts, not the finishing.", parentOutcome: "You mark the return out loud, once — not the completion.", childOutcome: "{{child_pronoun_subj|cap}} may come back on {{child_pronoun_poss}} own within minutes." },
    { week: 5, objective: "Let the return happen without you in the room.", parentOutcome: "You're elsewhere when the stall happens.", childOutcome: "The restart may occur before you'd have noticed it." },
    { week: 6, objective: "Hand the recovery over.", parentOutcome: "Nothing. That is the week.", childOutcome: "{{child_pronoun_subj|cap}} may say \"I need a minute\" and mean it." },
  ],
  bridges: {
    homework:   "You came in about homework. What the assessment found is that one hard question ends the evening — the work stops not because it's too hard, but because {{child_name}} has no way back in after a stall.",
    reminders:  "You came in because you're reminding constantly. What the assessment found is that most of the reminding happens after something went wrong. You're not starting {{child_pronoun_obj}}; you're restarting {{child_pronoun_obj}}.",
    screens:    "You came in worried about screens. What the assessment found is that the screen shows up after something goes wrong, not before. It's where {{child_name}} goes once a hard question has ended the evening.",
    confidence: "You came in about confidence. What the assessment found is that {{child_name}} treats a stall as a verdict — and a child who can't come back from a mistake collects mistakes rather than recoveries.",
    giveup:     "You came in because {{child_name}} gives up. What the assessment found is more specific: {{child_pronoun_subj}} doesn't give up at the start. {{child_pronoun_subj|cap}} stops after something goes wrong, and can't find the way back.",
    finish:     "You came in about things not getting finished. What the assessment found is that they aren't abandoned — they're interrupted by something going wrong, and never resumed.",
    other:      "What the assessment found is that {{child_name}} loses things at the point something goes wrong. The coming back is the part that's missing.",
  },
};
