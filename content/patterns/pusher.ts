import { TODO } from "@/lib/content/todo";
import type { PatternContent } from "@/content/types";

// Source: report-content-master.md (Storm + Pusher worked reference)
export const pusher: PatternContent = {
  displayName: "The Pusher",

  // S3
  s3SelfDoubts: [
    "Sometimes pushing works and I feel like a good parent. Sometimes it backfires and I wonder if I'm the reason this is a fight.",
    "I don't know how to want this for {{child_pronoun_obj}} without it turning into me wanting it more than {{child_name}} does.",
  ],
  s3Disarm: "Nothing here is wrong — leaning on {{child_pronoun_obj}} is a real strength. But that strength meets {{child_pronoun_poss}} need for ownership in a specific way.",

  // S4 — template; {{child_reframe_close}} is filled by renderer from archetype.s4ReframeClose.
  // Source: report-content-master.md §4 (spec-defect fix, 2026-07-09)
  s4MechanismTemplate: "It's that pushing taught {{child_name}} focus is something {{child_reframe_close}}.",

  // S6
  s6FutureVision: "And for you — not needing to lean in as hard. Easing off, without it feeling like giving up.",

  // S7/S8 clauses — appended to archetype bases by the renderer.
  // Source: report-content-master.md §7-8 (Pusher worked reference)
  s7StayPathClause:   "and with a Pusher's instinct unchanged, the harder push meets the harder fight, and the loop tightens instead of loosening.",
  s7ChangePathClause: "and a Pusher who learns when to lean in and when to step back becomes the parent who makes that ownership possible, not the one competing with it.",
  s8RoadmapClause:    "Where Pusher helps — and where to ease off.",

  beatFitParent: "Instinct is to push harder the moment a stall shows up.",
};
