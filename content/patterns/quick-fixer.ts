import { TODO } from "@/lib/content/todo";
import type { PatternContent } from "@/content/types";

// Source: report-content-master.md (authoring note — pending)
export const quick_fixer: PatternContent = {
  displayName: "The Quick Fixer",

  // S3
  s3SelfDoubts: [
    "I keep swooping in to fix it before {{child_name}} even gets stuck. I don't know if I'm helping, or making sure {{child_name}} never has to try.",
    "Every time I solve it for {{child_pronoun_obj}}, some part of me is relieved — and another part wonders what {{child_name}} is actually learning from that.",
  ],
  s3Disarm: "Nothing here is wrong — showing up the second something gets hard is real care, and it's kept plenty of kids from giving up too soon. But that same instinct meets {{child_pronoun_poss}} needs in a specific way. Once you see it, you won't unsee it. The roadmap is where you shift it, not just name it.",

  // S4 — template; {{child_reframe_close}} filled by renderer from archetype.s4ReframeClose.
  s4MechanismTemplate: "It's that stepping in taught {{child_name}} focus is something {{child_reframe_close}}.",

  // S6
  s6FutureVision: "And for you — six months from now might mean watching {{child_pronoun_obj}} get stuck, and trusting the stuck moment more than your instinct to end it.",

  // S7/S8 clauses — pending authoring (report-content-master.md Session 4)
  s7StayPathClause:   "and with a Quick Fixer's instinct unchanged, every stall gets rescued before it can turn into real friction — which also means it never turns into real capability, either.",
  s7ChangePathClause: "and a Quick Fixer who learns to wait one beat longer before stepping in becomes the parent who lets struggle do its actual job, instead of the one who keeps quietly ending it early.",
  s8RoadmapClause:    "Where Quick Fixer helps — and the exact moment to let the stall run a little longer.",

  beatFitParent: "Instinct is to step in and solve it before the struggle can begin.",
};
