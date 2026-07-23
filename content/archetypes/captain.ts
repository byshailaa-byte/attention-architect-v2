import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const captain: ArchetypeContent = {
  displayName: "The Captain",

  // S1
  s1FlavorPhrase:        "whether {{child_name}} gets to lead it, not just do it",
  s1EvidenceObservation: "the way a task {{child_name}} is leading gets finished twice as fast as the identical task handed to {{child_pronoun_obj}} as an assignment",

  // S2
  s2Anecdote:  "Tell {{child_pronoun_obj}} exactly how to organize the project and {{child_pronoun_subj}}'ll slow-walk every step of it, technically compliant, clearly checked out. Say \"your call, tell me what you need\" and the same task gets done in half the time, {{child_pronoun_poss}} way, walking in the door proud of it. Not resisting the work. Resisting being crew on {{child_pronoun_poss}} own ship.",
  s2Pullquote: "{{child_pronoun_subj|cap}}'ll do almost anything — the second it's actually {{child_pronoun_poss}} to run.",
  s2Strength:  "takes real ownership and drives hard the moment something is genuinely {{child_pronoun_poss}} to run.",
  s2Shadow:    "the instant someone else takes the wheel, even briefly, the drive doesn't just dip — it can disappear entirely.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to stop wanting to be in charge. I need {{child_pronoun_obj}} to be able to take direction without shutting down.",
    "There's a version of {{child_pronoun_obj}} that runs things brilliantly — I've seen it. I just don't know how to get {{child_pronoun_obj}} to lead the parts that are actually mine to assign.",
  ],

  // S4
  s4Analysis: [
    "Real capability that shows up fully the moment {{child_name}} is in charge — and noticeably less the moment {{child_name}} isn't.",
    "The instant a task becomes someone else's plan for {{child_pronoun_obj}} to execute, the same drive that just built something impressive goes quiet.",
  ],
  s4ReframeClose: "someone else's command — not {{child_pronoun_poss}} to run",

  // S5
  s5AxisDescriptions: {
    stability:  "Holds firm while {{child_name}} is leading — genuinely strong here. The moment leadership shifts to someone else, even briefly, stability drops until {{child_name}} is back in charge of something.",
    resistance: "Screens win less on content and more on control — a game hands {{child_pronoun_obj}} full command of {{child_pronoun_poss}} next move, which most homework structurally can't.",
    recovery:   "Recharges by running something entirely {{child_pronoun_poss}} own — a project, a game, anything with no one else directing — more than by rest alone.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. {{child_name}} is running {{child_pronoun_poss}} own project start to finish, making every call {{child_pronoun_reflexive}} — and it's done twice as fast as anything anyone assigned {{child_pronoun_obj}} all week.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "Being handed someone else's plan keeps costing {{child_pronoun_obj}} more than the plan itself is worth, and the drive that shows up the second {{child_name}} is in charge keeps going missing everywhere else.",
  s7ChangePathBase: "{{child_name}} gets real command over more of what {{child_name}} does, even inside structure that still exists. The drive that only used to show up when {{child_name}} was leading starts showing up more often, because more of it is actually {{child_pronoun_poss}} to lead.",
  s8RoadmapBullets: [
    "Finding real pieces {{child_pronoun_subj}} can actually lead, inside the structure that still has to exist.",
    "Where \"{{child_pronoun_poss}} call\" can genuinely mean {{child_pronoun_poss}} call, not a managed illusion of one.",
  ],

  beatFitChild: "Attention holds when a Captain is leading, not just following someone else's plan.",
};
