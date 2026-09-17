import { TODO } from "@/lib/content/todo";
import type { GoalSkillContent } from "@/content/types";

// Goal content for the "Carrying it over" skill. Scaffold only — all copy is TODO().
// 4 goals · 6 objectives (weeks 1–6) · 7 bridge lines keyed by concern.
export const carryingItOver: GoalSkillContent = {
  goals: [
    { key: "carrying-it-over-1", text: TODO("goals/carrying-it-over/goal-1-text"), why: TODO("goals/carrying-it-over/goal-1-why"), recommended: true },
    { key: "carrying-it-over-2", text: TODO("goals/carrying-it-over/goal-2-text"), why: TODO("goals/carrying-it-over/goal-2-why"), recommended: false },
    { key: "carrying-it-over-3", text: TODO("goals/carrying-it-over/goal-3-text"), why: TODO("goals/carrying-it-over/goal-3-why"), recommended: false },
    { key: "carrying-it-over-4", text: TODO("goals/carrying-it-over/goal-4-text"), why: TODO("goals/carrying-it-over/goal-4-why"), recommended: false },
  ],
  objectives: [
    { week: 1, objective: TODO("goals/carrying-it-over/week-1-objective"), parentOutcome: TODO("goals/carrying-it-over/week-1-parent-outcome"), childOutcome: TODO("goals/carrying-it-over/week-1-child-outcome") },
    { week: 2, objective: TODO("goals/carrying-it-over/week-2-objective"), parentOutcome: TODO("goals/carrying-it-over/week-2-parent-outcome"), childOutcome: TODO("goals/carrying-it-over/week-2-child-outcome") },
    { week: 3, objective: TODO("goals/carrying-it-over/week-3-objective"), parentOutcome: TODO("goals/carrying-it-over/week-3-parent-outcome"), childOutcome: TODO("goals/carrying-it-over/week-3-child-outcome") },
    { week: 4, objective: TODO("goals/carrying-it-over/week-4-objective"), parentOutcome: TODO("goals/carrying-it-over/week-4-parent-outcome"), childOutcome: TODO("goals/carrying-it-over/week-4-child-outcome") },
    { week: 5, objective: TODO("goals/carrying-it-over/week-5-objective"), parentOutcome: TODO("goals/carrying-it-over/week-5-parent-outcome"), childOutcome: TODO("goals/carrying-it-over/week-5-child-outcome") },
    { week: 6, objective: TODO("goals/carrying-it-over/week-6-objective"), parentOutcome: TODO("goals/carrying-it-over/week-6-parent-outcome"), childOutcome: TODO("goals/carrying-it-over/week-6-child-outcome") },
  ],
  bridges: {
    homework:  TODO("goals/carrying-it-over/bridge-homework"),
    reminders: TODO("goals/carrying-it-over/bridge-reminders"),
    screens:   TODO("goals/carrying-it-over/bridge-screens"),
    confidence:TODO("goals/carrying-it-over/bridge-confidence"),
    giveup:    TODO("goals/carrying-it-over/bridge-giveup"),
    finish:    TODO("goals/carrying-it-over/bridge-finish"),
    other:     TODO("goals/carrying-it-over/bridge-other"),
  },
};
