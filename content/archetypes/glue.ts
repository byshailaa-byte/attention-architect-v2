import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const glue: ArchetypeContent = {
  displayName: "The Glue",

  // S1
  s1FlavorPhrase:        "whether the people around {{child_pronoun_obj}} feel connected to {{child_pronoun_obj}}",
  s1EvidenceObservation: "the way {{child_pronoun_subj}}'ll ask if you're okay in the middle of {{child_pronoun_poss}} own homework, because something about your voice changed",

  // S2
  s2Anecdote:  "{{child_name}} is staring at {{child_pronoun_poss}} homework, pencil not moving, and you ask what's wrong and {{child_name}} says \"nothing,\" and means it — not stuck on the work. Stuck on whether you're annoyed with {{child_pronoun_obj}} from earlier. Solve that in one sentence and watch {{child_pronoun_obj}} finish the page in ten minutes. The work was never the blocker.",
  s2Pullquote: "{{child_name}} was never stuck on the work. {{child_name}} was stuck on you.",
  s2Strength:  "deeply attuned to the emotional temperature of a room — often the first to notice when something's actually wrong.",
  s2Shadow:    "that same attunement means unresolved tension anywhere nearby quietly blocks everything else, including work that has nothing to do with it.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to stop caring how everyone feels. I need {{child_pronoun_obj}} to be able to focus even when something's a little off.",
    "There's a version of {{child_pronoun_obj}} that works beautifully — I've seen it, on the calm days. I just don't know how to get there on the hard ones.",
  ],

  // S4
  s4Analysis: [
    "An attention system that's tracking the emotional temperature of the room before it can commit to anything else.",
    "The moment something feels even slightly off between people around {{child_pronoun_obj}}, that read takes priority over the task — every time, automatically.",
  ],
  s4ReframeClose: "disconnected from how the people around {{child_pronoun_obj}} feel",

  // S5
  s5AxisDescriptions: {
    stability:  "Holds well when the emotional air is clear — genuinely well. The instant something feels unresolved nearby, even unrelated to {{child_pronoun_obj}}, stability drops fast until it's addressed.",
    resistance: "Screens rarely win on excitement alone. They win when they offer connection — a video chat, a shared game — that the offline moment isn't currently providing.",
    recovery:   "Recharges through calm, connected time — a quiet moment where {{child_name}} knows things are okay restores {{child_pronoun_obj}} more than any amount of alone time or stimulation would.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. The house is calm, nothing's unresolved between anyone, and {{child_name}} has gotten through {{child_pronoun_poss}} whole list without once stopping to check if everyone's okay — because {{child_name}} already knows they are.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "Unresolved tension keeps quietly costing {{child_pronoun_obj}} focus on things that have nothing to do with the tension itself, and the connection between \"something feels off\" and \"{{child_pronoun_subj}} can't concentrate\" keeps going unnoticed.",
  s7ChangePathBase: "The emotional air around {{child_pronoun_obj}} gets named and cleared instead of left hanging, and the focus that used to disappear the moment something felt unresolved starts holding steady.",
  s8RoadmapBullets: [
    "Reading when the real blocker is emotional, not academic.",
    "A quick way to clear the air before asking {{child_pronoun_obj}} to concentrate.",
  ],

  beatFitChild: "Can't concentrate until the people around {{child_pronoun_obj}} feel connected and okay first.",
};
