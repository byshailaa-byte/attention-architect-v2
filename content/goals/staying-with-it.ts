import { TODO } from "@/lib/content/todo";
import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Staying with it" skill. Scaffold only — all copy is TODO().
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
export const stayingWithIt: GoalSkillContent = {
  goals: [
    { key: "staying-with-it-1", text: TODO("goals/staying-with-it/goal-1-text"), why: TODO("goals/staying-with-it/goal-1-why"), recommended: true },
    { key: "staying-with-it-2", text: TODO("goals/staying-with-it/goal-2-text"), why: TODO("goals/staying-with-it/goal-2-why"), recommended: false },
    { key: "staying-with-it-3", text: TODO("goals/staying-with-it/goal-3-text"), why: TODO("goals/staying-with-it/goal-3-why"), recommended: false },
    { key: "staying-with-it-4", text: TODO("goals/staying-with-it/goal-4-text"), why: TODO("goals/staying-with-it/goal-4-why"), recommended: false },
  ],
  objectives: [
    { week: 1, objective: TODO("goals/staying-with-it/week-1-objective"), parentOutcome: TODO("goals/staying-with-it/week-1-parent-outcome"), childOutcome: TODO("goals/staying-with-it/week-1-child-outcome") },
    { week: 2, objective: TODO("goals/staying-with-it/week-2-objective"), parentOutcome: TODO("goals/staying-with-it/week-2-parent-outcome"), childOutcome: TODO("goals/staying-with-it/week-2-child-outcome") },
    { week: 3, objective: TODO("goals/staying-with-it/week-3-objective"), parentOutcome: TODO("goals/staying-with-it/week-3-parent-outcome"), childOutcome: TODO("goals/staying-with-it/week-3-child-outcome") },
    { week: 4, objective: TODO("goals/staying-with-it/week-4-objective"), parentOutcome: TODO("goals/staying-with-it/week-4-parent-outcome"), childOutcome: TODO("goals/staying-with-it/week-4-child-outcome") },
    { week: 5, objective: TODO("goals/staying-with-it/week-5-objective"), parentOutcome: TODO("goals/staying-with-it/week-5-parent-outcome"), childOutcome: TODO("goals/staying-with-it/week-5-child-outcome") },
    { week: 6, objective: TODO("goals/staying-with-it/week-6-objective"), parentOutcome: TODO("goals/staying-with-it/week-6-parent-outcome"), childOutcome: TODO("goals/staying-with-it/week-6-child-outcome") },
  ],
  bridges: {
    homework:  TODO("goals/staying-with-it/bridge-homework"),
    reminders: TODO("goals/staying-with-it/bridge-reminders"),
    screens:   TODO("goals/staying-with-it/bridge-screens"),
    confidence:TODO("goals/staying-with-it/bridge-confidence"),
    giveup:    TODO("goals/staying-with-it/bridge-giveup"),
    finish:    TODO("goals/staying-with-it/bridge-finish"),
    other:     TODO("goals/staying-with-it/bridge-other"),
  },
};
