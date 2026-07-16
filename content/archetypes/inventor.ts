import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const inventor: ArchetypeContent = {
  displayName: "The Inventor",

  // S1
  s1FlavorPhrase:        "whether it felt like {{child_pronoun_poss}} own idea",
  s1EvidenceObservation: "the way {{child_name}} rebuilds something four different wrong ways before it's finally right, and never once looks bored doing it",

  // S2
  s2Anecdote:  "Show {{child_name}} how to build the thing correctly, step by step, and {{child_pronoun_subj}}'ll do it once, badly, and never touch it again. Say nothing, hand {{child_pronoun_obj}} the same materials, and {{child_pronoun_subj}}'ll take it apart, get it wrong four different ways, and build something better than the instructions ever would have. Not avoiding the right way. Finding out if it's actually {{child_pronoun_poss}}.",
  s2Pullquote: "Every 'wrong' way {{child_name}} insists on trying is {{child_pronoun_obj}} checking if it's really {{child_pronoun_poss}}.",
  s2Strength:  "builds real, durable understanding by getting it wrong {{child_pronoun_poss}} own way first.",
  s2Shadow:    "a \"helpful\" correction too early can read as *your way doesn't count*, and shut the building down entirely.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to follow instructions perfectly. I need {{child_pronoun_obj}} to get the work done without turning every assignment into a redesign.",
    "There's a real thinker in there — I've seen it. I just don't know how to get {{child_pronoun_obj}} to build the thing that's actually due.",
  ],

  // S4
  s4Analysis: [
    "A mind that goes deep and holds — but only inside something {{child_name}} is actually building, not executing.",
    "The moment the method becomes prescribed instead of discovered, the same depth that made {{child_pronoun_obj}} brilliant an hour ago disappears.",
  ],
  s4ReframeClose: "someone else's blueprint — not something {{child_pronoun_subj}} built",

  // S5
  s5AxisDescriptions: {
    stability:  "Holds firm once {{child_name}} is building — but \"building\" has to mean {{child_pronoun_poss}} own approach. Someone else's instructions can break the hold even when the task itself is unchanged.",
    resistance: "Screens win specifically where they let {{child_pronoun_obj}} tinker and fail without anyone correcting {{child_pronoun_poss}} method. Homework loses the moment it becomes about the \"right\" way.",
    recovery:   "Recharges by making something with no stakes attached — a small project nobody's grading is doing real recovery work, not wasting time.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. {{child_name}} has taken something apart for the third time, doing it {{child_pronoun_poss}} own way again — not because the instructions were wrong, but because {{child_pronoun_poss}} way is the whole point.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "Every corrected method chips away a little more at {{child_pronoun_poss}} willingness to try at all. The kid who used to rebuild things four wrong ways just stops attempting the fifth.",
  s7ChangePathBase: "{{child_name}} gets real room to arrive at {{child_pronoun_poss}} own method, wrong turns included. The building that used to stop the moment it became \"the right way\" starts happening again.",
  s8RoadmapBullets: [
    "Giving {{child_pronoun_obj}} room to get it wrong {{child_pronoun_poss}} own way before stepping in.",
    "Where correction actually helps — and where it just shuts the building down.",
  ],
};
