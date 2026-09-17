import { TODO } from "@/lib/content/todo";
import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Running it themselves" skill. Scaffold only — all copy is TODO().
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
export const runningItThemselves: GoalSkillContent = {
  goals: [
    { key: "running-it-themselves-1", text: TODO("goals/running-it-themselves/goal-1-text"), why: TODO("goals/running-it-themselves/goal-1-why"), recommended: true },
    { key: "running-it-themselves-2", text: TODO("goals/running-it-themselves/goal-2-text"), why: TODO("goals/running-it-themselves/goal-2-why"), recommended: false },
    { key: "running-it-themselves-3", text: TODO("goals/running-it-themselves/goal-3-text"), why: TODO("goals/running-it-themselves/goal-3-why"), recommended: false },
    { key: "running-it-themselves-4", text: TODO("goals/running-it-themselves/goal-4-text"), why: TODO("goals/running-it-themselves/goal-4-why"), recommended: false },
  ],
  objectives: [
    { week: 1, objective: TODO("goals/running-it-themselves/week-1-objective"), parentOutcome: TODO("goals/running-it-themselves/week-1-parent-outcome"), childOutcome: TODO("goals/running-it-themselves/week-1-child-outcome") },
    { week: 2, objective: TODO("goals/running-it-themselves/week-2-objective"), parentOutcome: TODO("goals/running-it-themselves/week-2-parent-outcome"), childOutcome: TODO("goals/running-it-themselves/week-2-child-outcome") },
    { week: 3, objective: TODO("goals/running-it-themselves/week-3-objective"), parentOutcome: TODO("goals/running-it-themselves/week-3-parent-outcome"), childOutcome: TODO("goals/running-it-themselves/week-3-child-outcome") },
    { week: 4, objective: TODO("goals/running-it-themselves/week-4-objective"), parentOutcome: TODO("goals/running-it-themselves/week-4-parent-outcome"), childOutcome: TODO("goals/running-it-themselves/week-4-child-outcome") },
    { week: 5, objective: TODO("goals/running-it-themselves/week-5-objective"), parentOutcome: TODO("goals/running-it-themselves/week-5-parent-outcome"), childOutcome: TODO("goals/running-it-themselves/week-5-child-outcome") },
    { week: 6, objective: TODO("goals/running-it-themselves/week-6-objective"), parentOutcome: TODO("goals/running-it-themselves/week-6-parent-outcome"), childOutcome: TODO("goals/running-it-themselves/week-6-child-outcome") },
  ],
  bridges: {
    homework:  TODO("goals/running-it-themselves/bridge-homework"),
    reminders: TODO("goals/running-it-themselves/bridge-reminders"),
    screens:   TODO("goals/running-it-themselves/bridge-screens"),
    confidence:TODO("goals/running-it-themselves/bridge-confidence"),
    giveup:    TODO("goals/running-it-themselves/bridge-giveup"),
    finish:    TODO("goals/running-it-themselves/bridge-finish"),
    other:     TODO("goals/running-it-themselves/bridge-other"),
  },
};
