import type { ArchetypeContent } from "@/content/types";

// Source: report-content-master.md (Storm + Pusher worked reference)
// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const storm: ArchetypeContent = {
  displayName: "The Storm",

  // S1
  s1FlavorPhrase:        "whether it's {{child_pronoun_poss}} choice, and it matters right now",
  s1EvidenceObservation: "the way {{child_name}} locks in completely on a game {{child_pronoun_subj}} chose",

  // S2
  s2Anecdote:  "{{child_pronoun_subj|cap}}'ll stay out till dark, replaying the same move on a game {{child_pronoun_subj}} chose — locked in, unstoppable. Ask {{child_pronoun_obj}} to practice the same thing for 20 minutes on someone else's schedule, and {{child_name}} is gone in five. Not defiant. Just gone. {{child_name}} needs it to be {{child_pronoun_poss}} idea, and to matter right now. Both, always.",
  s2Pullquote: "Every kid who needs it to be their idea is one real challenge away from unstoppable.",
  s2Strength:  "{{child_pronoun_poss}} own choice turns into real drive.",
  s2Shadow:    "someone else's plan turns that same energy into resistance.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to sit still. I need {{child_pronoun_obj}} to be able to stay with something long enough to actually finish it.",
    "There's a version of {{child_pronoun_obj}} that's completely switched on — I've seen it. I just don't know how to get there on purpose.",
  ],

  // S4
  s4Analysis: [
    "A mind wired for real challenges — but only the ones {{child_name}} picks. That's capability, not defiance.",
    "The moment it's assigned, it stops being {{child_pronoun_poss}}. That's when {{child_name}} checks out.",
  ],
  s4ReframeClose: "done to {{child_pronoun_obj}} — not chosen",

  // S5
  s5AxisDescriptions: {
    stability:  "Holds firm when it's {{child_pronoun_poss}} call. Drops fast when it's not. Not random — it's about who's holding the reins.",
    resistance: "Screens give {{child_pronoun_obj}} constant excitement and full control. Homework gives {{child_pronoun_obj}} neither.",
    recovery:   "Free time with no rules recharges {{child_pronoun_obj}}. Quiet time doesn't.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. No one assigned this. {{child_name}} picks up something hard on {{child_pronoun_poss}} own, and stays with it for an hour without anyone checking on {{child_pronoun_obj}} — because it's {{child_pronoun_poss}}.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "{{child_name}} fights harder for ownership, anywhere {{child_pronoun_subj}} can get it. Screens stay the one place {{child_name}} gets it free.",
  s7ChangePathBase: "{{child_name}} gets real ownership over hard things — {{child_pronoun_poss}} choice, {{child_pronoun_poss}} pace. The intensity that vanishes at 7pm shows up where it's needed, because it's asked for, not extracted.",
  s8RoadmapBullets: [
    "Real ownership, without losing structure.",
    "How to assign things without triggering resistance.",
  ],

  beatFitChild: "Attention switches on with real ownership, off the moment something feels handed to {{child_pronoun_obj}}.",
};
