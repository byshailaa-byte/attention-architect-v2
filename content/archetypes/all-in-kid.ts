import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const all_in_kid: ArchetypeContent = {
  displayName: "The All-In Kid",

  // S1
  s1FlavorPhrase:        "the depth {{child_name}} needs, not a lack of it",
  s1EvidenceObservation: "the way {{child_pronoun_subj}} can sit with one thing for two straight hours, completely absorbed",

  // S2
  s2Anecdote:  "Give {{child_name}} one book, one drawing, one problem, and {{child_pronoun_subj}}'ll disappear into it for two hours without looking up. Call {{child_pronoun_obj}} for dinner once and it genuinely doesn't register — not ignoring you, just gone. Now hand {{child_pronoun_obj}} three short worksheets instead of one long one, with a five-minute break built in between. Watch the same kid go flat by worksheet two. Focus didn't get worse. {{child_name}} got interrupted before finishing, three times instead of once.",
  s2Pullquote: "Not shorter tasks. Fewer interruptions.",
  s2Strength:  "goes deeper than almost anyone when left alone with something.",
  s2Shadow:    "the same depth makes any interruption — even a well-meant check-in — feel like being physically pulled out of something.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to focus less. I need {{child_pronoun_obj}} to be able to stop and switch when {{child_name}} actually has to.",
    "There's a version of {{child_pronoun_obj}} that goes so deep into things — I just wish I knew how to get {{child_pronoun_obj}} back out without a fight.",
  ],

  // S4
  s4Analysis: [
    "A mind built to go deep — but every switch, even a well-meant one, costs {{child_pronoun_obj}} more than it costs most kids.",
    "The moment something interrupts {{child_pronoun_obj}} mid-depth, it doesn't just pause {{child_pronoun_obj}}. It takes real time to get back in.",
  ],
  s4ReframeClose: "interrupted before it's finished — not {{child_pronoun_poss}} to control",

  // S5
  s5AxisDescriptions: {
    stability:  "Holds *unusually* firm once {{child_name}} is in — this is a real strength, not a fragility. The cost shows up at the edges: transitions and interruptions land harder on {{child_pronoun_obj}} than on most kids.",
    resistance: "Screens don't win by being more exciting. They win on the rare occasions the offline task is too shallow to earn the same depth {{child_name}} is capable of.",
    recovery:   "Uninterrupted time — even just twenty minutes with nothing pulling at {{child_pronoun_obj}} — recharges {{child_pronoun_obj}} more than any amount of \"fun\" activity that keeps switching.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. No one assigned this. {{child_name}} is three hours into a project {{child_pronoun_subj}} started on {{child_pronoun_poss}} own, and hasn't looked up once — not because anyone's watching, but because nothing's interrupted {{child_pronoun_obj}}.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "The interruptions keep costing {{child_pronoun_obj}} more than they should, and {{child_name}} keeps needing longer to recover from each one. Depth starts to feel like something that gets punished instead of protected.",
  s7ChangePathBase: "{{child_name}} gets real stretches of uninterrupted time, built around {{child_pronoun_obj}}, not squeezed into everyone else's schedule. The same depth that used to get cut short starts finishing what it started.",
  s8RoadmapBullets: [
    "Protecting real blocks of uninterrupted time, without it costing everyone else's schedule.",
    "Reading the difference between {{child_pronoun_poss}} needing a break and {{child_pronoun_poss}} needing to not be broken out of something.",
  ],
};
