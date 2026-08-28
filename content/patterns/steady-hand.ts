import { TODO } from "@/lib/content/todo";
import type { PatternContent } from "@/content/types";

// Source: report-content-master.md (authoring note — pending)
export const steady_hand: PatternContent = {
  displayName: "The Steady Hand",

  // S3
  s3SelfDoubts: [
    "I stay so calm on the outside that sometimes I wonder if {{child_name}} even knows I'm worried underneath it.",
    "I keep waiting for my steadiness to be enough on its own, and some nights I'm not sure waiting is actually a plan.",
  ],
  s3Disarm: "Nothing here is wrong — staying steady when nothing seems to be working is genuinely rare, and it's the thing that's kept this from turning into a bigger fight. But that same steadiness meets {{child_pronoun_poss}} needs in a specific way.",

  // S4 — template; {{child_reframe_close}} filled by renderer from archetype.s4ReframeClose.
  s4MechanismTemplate: "It's that the structure around {{child_pronoun_obj}} taught {{child_name}} focus is something {{child_reframe_close}}.",

  // S6
  s6FutureVision: "And for you — six months from now might mean your steadiness finally having something to hold onto, instead of just holding the line.",

  // S7/S8 clauses — pending authoring (report-content-master.md Session 4)
  s7StayPathClause:   "and with a Steady Hand's instinct unchanged, the calm keeps holding the line without ever quite giving it anything new to hold onto — steady, but static.",
  s7ChangePathClause: "and a Steady Hand who adds one small, deliberate shift to the steadiness becomes the parent whose calm finally has somewhere to go, instead of just somewhere to wait.",
  s8RoadmapClause:    "Where Steady Hand already works — and the one small addition that turns holding the line into moving it.",

  beatFitParent: "Instinct is to stay calm and hold steady, even when stepping in might feel like it would help faster.",
};
