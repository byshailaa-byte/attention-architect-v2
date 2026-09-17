import { TODO } from "@/lib/content/todo";
import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Holding on" skill. Scaffold only — all copy is TODO().
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
export const holdingOn: GoalSkillContent = {
  goals: [
    { key: "holding-on-1", text: TODO("goals/holding-on/goal-1-text"), why: TODO("goals/holding-on/goal-1-why"), recommended: true },
    { key: "holding-on-2", text: TODO("goals/holding-on/goal-2-text"), why: TODO("goals/holding-on/goal-2-why"), recommended: false },
    { key: "holding-on-3", text: TODO("goals/holding-on/goal-3-text"), why: TODO("goals/holding-on/goal-3-why"), recommended: false },
    { key: "holding-on-4", text: TODO("goals/holding-on/goal-4-text"), why: TODO("goals/holding-on/goal-4-why"), recommended: false },
  ],
  objectives: [
    { week: 1, objective: TODO("goals/holding-on/week-1-objective"), parentOutcome: TODO("goals/holding-on/week-1-parent-outcome"), childOutcome: TODO("goals/holding-on/week-1-child-outcome") },
    { week: 2, objective: TODO("goals/holding-on/week-2-objective"), parentOutcome: TODO("goals/holding-on/week-2-parent-outcome"), childOutcome: TODO("goals/holding-on/week-2-child-outcome") },
    { week: 3, objective: TODO("goals/holding-on/week-3-objective"), parentOutcome: TODO("goals/holding-on/week-3-parent-outcome"), childOutcome: TODO("goals/holding-on/week-3-child-outcome") },
    { week: 4, objective: TODO("goals/holding-on/week-4-objective"), parentOutcome: TODO("goals/holding-on/week-4-parent-outcome"), childOutcome: TODO("goals/holding-on/week-4-child-outcome") },
    { week: 5, objective: TODO("goals/holding-on/week-5-objective"), parentOutcome: TODO("goals/holding-on/week-5-parent-outcome"), childOutcome: TODO("goals/holding-on/week-5-child-outcome") },
    { week: 6, objective: TODO("goals/holding-on/week-6-objective"), parentOutcome: TODO("goals/holding-on/week-6-parent-outcome"), childOutcome: TODO("goals/holding-on/week-6-child-outcome") },
  ],
  bridges: {
    homework:  TODO("goals/holding-on/bridge-homework"),
    reminders: TODO("goals/holding-on/bridge-reminders"),
    screens:   TODO("goals/holding-on/bridge-screens"),
    confidence:TODO("goals/holding-on/bridge-confidence"),
    giveup:    TODO("goals/holding-on/bridge-giveup"),
    finish:    TODO("goals/holding-on/bridge-finish"),
    other:     TODO("goals/holding-on/bridge-other"),
  },
};
