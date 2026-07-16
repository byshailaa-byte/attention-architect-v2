import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const explorer: ArchetypeContent = {
  displayName: "The Explorer",

  // S1
  s1FlavorPhrase:        "how many directions are pulling at {{child_pronoun_obj}} at once",
  s1EvidenceObservation: "the way one question leads {{child_pronoun_obj}} three topics away, and {{child_pronoun_subj}} can tell you exactly how {{child_pronoun_subj}} got there",

  // S2
  s2Anecdote:  "{{child_name}} starts the assigned reading, gets three lines in, and ends up deep in a completely different question the book only mentioned once in passing. Twenty minutes later {{child_pronoun_subj}} can tell you three new facts and none of them were on the worksheet. Call it distraction and you'll spend a year fighting it. It's not distraction. It's exactly the same curiosity you'd want in a scientist, running with no channel to point it down.",
  s2Pullquote: "The tangent isn't the distraction. Sometimes it's the whole point.",
  s2Strength:  "curiosity that goes further and connects more than a fixed lesson plan ever could.",
  s2Shadow:    "without a channel, the same curiosity looks like an inability to stay on any one thing.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to stop being curious. I need {{child_pronoun_obj}} to be able to finish the thing in front of {{child_pronoun_obj}} before chasing the next one.",
    "There's a version of {{child_pronoun_obj}} that connects ideas better than I ever could at {{child_pronoun_poss}} age. I just don't know how to point it at {{child_pronoun_poss}} homework.",
  ],

  // S4
  s4Analysis: [
    "A mind that connects ideas fast — the \"wandering\" is often real thinking, just not on the assigned track.",
    "The moment a task has no room for a genuine tangent, {{child_pronoun_poss}} attention goes looking for one anyway, somewhere else.",
  ],
  s4ReframeClose: "a leash on what {{child_pronoun_poss}} curiosity is allowed to wonder about",

  // S5
  s5AxisDescriptions: {
    stability:  "Moves between things by nature — this isn't inconsistency, it's how a genuinely curious mind operates without a channel. Structure that allows *some* wandering holds {{child_pronoun_obj}} far better than structure that forbids it.",
    resistance: "Screens win because they hand {{child_pronoun_obj}} an endless supply of new threads to follow. A single-topic worksheet can't compete with an entire internet of \"what's this.\"",
    recovery:   "Recharges by following curiosity with zero destination in mind — a \"useless\" hour of reading whatever interests {{child_pronoun_obj}} is doing real work, not procrastination.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. {{child_pronoun_subj}} followed one question through four completely different topics, and can walk you through the exact thread that got {{child_pronoun_obj}} there — proud of the whole winding path, not just the destination.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "The tangents keep getting treated as the problem instead of the point, and the curiosity that used to connect ideas starts looking for anywhere it's actually welcome — usually not homework.",
  s7ChangePathBase: "{{child_name}} gets real room for the tangent, with a way back to the task built in. The wandering that used to derail everything becomes the thing that makes the work worth finishing.",
  s8RoadmapBullets: [
    "Building a real channel for the tangent, instead of fighting it.",
    "A way back to the task that doesn't feel like getting caught.",
  ],
};
