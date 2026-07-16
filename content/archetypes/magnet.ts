import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const magnet: ArchetypeContent = {
  displayName: "The Magnet",

  // S1
  s1FlavorPhrase:        "who {{child_name}} is doing it with, not what {{child_name}} is doing",
  s1EvidenceObservation: "the way {{child_name}} does forty minutes of focused work at the kitchen table, and can't manage ten alone in {{child_pronoun_poss}} room on the exact same task",

  // S2
  s2Anecdote:  "Put {{child_pronoun_obj}} at a desk alone with the exact same homework {{child_pronoun_subj}} did an hour ago at the kitchen table next to someone, and watch the wheels stop turning. Nothing about the work changed. The room did. {{child_pronoun_subj}} didn't lose focus — {{child_pronoun_subj}} lost the one thing that was quietly doing half the work: somebody there.",
  s2Pullquote: "Take away the people and you didn't simplify the task. You removed the engine.",
  s2Strength:  "genuinely does better work, more consistently, in the presence of someone else.",
  s2Shadow:    "left fully alone, that same wiring reads as an inability to self-motivate — when the real gap is presence, not motivation.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to work alone. I need {{child_pronoun_obj}} to be able to get something done even when nobody's sitting with {{child_pronoun_obj}}.",
    "There's a version of {{child_pronoun_obj}} that's completely locked in — when someone's there. I just don't know how to get {{child_pronoun_obj}} that far on {{child_pronoun_poss}} own.",
  ],

  // S4
  s4Analysis: [
    "Attention that's genuinely anchored by presence — not a discipline gap, a wiring fact.",
    "The moment {{child_name}} is fully alone with something, the same task that worked fine an hour ago starts to drift, because the thing quietly doing half the work just left the room.",
  ],
  s4ReframeClose: "isolated from the people who make it work — not something shared",

  // S5
  s5AxisDescriptions: {
    stability:  "Moves between things when alone — but holds remarkably well with someone simply present, even silent, nearby. The presence is the anchor, not the supervision.",
    resistance: "Screens win hardest in isolation, when there's no one else to focus alongside. The same screen loses a lot of pull the moment a sibling or parent is doing something adjacent.",
    recovery:   "Recharges through time with people — not necessarily talking, just not alone. Solitary quiet time often doesn't restore {{child_pronoun_obj}} the way it would a different kind of kid.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. {{child_name}} is at the table with someone else nearby, working through something hard for forty straight minutes — not because anyone's helping, just because someone's there.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "The expectation to work alone keeps outpacing what {{child_pronoun_subj}} can actually do alone, and the gap between \"should focus fine by {{child_pronoun_reflexive}}\" and \"genuinely can't right now\" keeps reading as a discipline problem instead of what it is.",
  s7ChangePathBase: "{{child_name}} gets real, low-key presence built into the moments that need it — not supervision, just someone there. The work that used to fall apart alone starts holding together.",
  s8RoadmapBullets: [
    "Building in real presence, without it turning into hovering.",
    "Where independence genuinely helps {{child_pronoun_obj}} — and where it's just isolating {{child_pronoun_obj}}.",
  ],
};
