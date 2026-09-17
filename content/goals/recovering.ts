import { TODO } from "@/lib/content/todo";
import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Recovering" skill. Scaffold only — all copy is TODO().
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
export const recovering: GoalSkillContent = {
  goals: [
    { key: "recovering-1", text: TODO("goals/recovering/goal-1-text"), why: TODO("goals/recovering/goal-1-why"), recommended: true },
    { key: "recovering-2", text: TODO("goals/recovering/goal-2-text"), why: TODO("goals/recovering/goal-2-why"), recommended: false },
    { key: "recovering-3", text: TODO("goals/recovering/goal-3-text"), why: TODO("goals/recovering/goal-3-why"), recommended: false },
    { key: "recovering-4", text: TODO("goals/recovering/goal-4-text"), why: TODO("goals/recovering/goal-4-why"), recommended: false },
  ],
  objectives: [
    { week: 1, objective: TODO("goals/recovering/week-1-objective"), parentOutcome: TODO("goals/recovering/week-1-parent-outcome"), childOutcome: TODO("goals/recovering/week-1-child-outcome") },
    { week: 2, objective: TODO("goals/recovering/week-2-objective"), parentOutcome: TODO("goals/recovering/week-2-parent-outcome"), childOutcome: TODO("goals/recovering/week-2-child-outcome") },
    { week: 3, objective: TODO("goals/recovering/week-3-objective"), parentOutcome: TODO("goals/recovering/week-3-parent-outcome"), childOutcome: TODO("goals/recovering/week-3-child-outcome") },
    { week: 4, objective: TODO("goals/recovering/week-4-objective"), parentOutcome: TODO("goals/recovering/week-4-parent-outcome"), childOutcome: TODO("goals/recovering/week-4-child-outcome") },
    { week: 5, objective: TODO("goals/recovering/week-5-objective"), parentOutcome: TODO("goals/recovering/week-5-parent-outcome"), childOutcome: TODO("goals/recovering/week-5-child-outcome") },
    { week: 6, objective: TODO("goals/recovering/week-6-objective"), parentOutcome: TODO("goals/recovering/week-6-parent-outcome"), childOutcome: TODO("goals/recovering/week-6-child-outcome") },
  ],
  bridges: {
    homework:  TODO("goals/recovering/bridge-homework"),
    reminders: TODO("goals/recovering/bridge-reminders"),
    screens:   TODO("goals/recovering/bridge-screens"),
    confidence:TODO("goals/recovering/bridge-confidence"),
    giveup:    TODO("goals/recovering/bridge-giveup"),
    finish:    TODO("goals/recovering/bridge-finish"),
    other:     TODO("goals/recovering/bridge-other"),
  },
};
