import type { ArchetypeContent } from "@/content/types";

// Pronoun-retrofitted per objective-personalization-layer-spec.md §7a
export const live_wire: ArchetypeContent = {
  displayName: "The Live Wire",

  // S1
  s1FlavorPhrase:        "how much real stimulation the moment offers",
  s1EvidenceObservation: "the way a timed challenge gets full, locked-in effort while the identical untimed version gets ninety seconds",

  // S2
  s2Anecdote:  "A worksheet with no clock, no stakes, no surprise — {{child_name}} is gone in ninety seconds, not because it's too hard, but because nothing about it is asking anything of {{child_pronoun_obj}}. Turn the exact same content into a race against a timer and watch {{child_pronoun_obj}} lock in like it's the only thing in the world. Not lazy on the quiet version. Not receiving a signal at all.",
  s2Pullquote: "Give {{child_pronoun_obj}} nothing to push against and there's nothing left to push with.",
  s2Strength:  "brings real, sustained intensity to anything that offers genuine stakes or challenge.",
  s2Shadow:    "without that charge, the same task doesn't just bore {{child_pronoun_obj}} — it barely registers as happening at all.",

  // S3
  s3ParentWorries: [
    "I don't need {{child_pronoun_obj}} to calm down. I need {{child_pronoun_obj}} to be able to stay with something that isn't thrilling for more than five minutes.",
    "There's a version of {{child_pronoun_obj}} that's completely electric — I've seen it. I just don't know how to get that same energy pointed at something quiet.",
  ],

  // S4
  s4Analysis: [
    "An attention system that needs real stimulation to switch on — not a shorter attention span, a higher activation threshold.",
    "The moment a task has no stakes, no clock, no surprise, it doesn't just bore {{child_pronoun_obj}}. It barely registers as happening at all.",
  ],
  s4ReframeClose: "flattened into something with no charge",

  // S5
  s5AxisDescriptions: {
    stability:  "Holds only while the stimulation holds — this tracks with Storm's baseline, but the trigger is different. Storm needs ownership; Live Wire needs genuine intensity, and will disengage from even {{child_pronoun_poss}} own idea if it goes flat.",
    resistance: "Screens win overwhelmingly — they're built to deliver exactly the kind of constant, escalating stimulation {{child_pronoun_poss}} attention runs on. This is the steepest Resistance gap of any archetype.",
    recovery:   "Recharges through genuine physical or sensory intensity — movement, noise, real activity — not quiet. Quiet time often doesn't restore {{child_pronoun_obj}}; it just removes the one thing keeping {{child_pronoun_obj}} engaged.",
  },

  // S6
  s6FutureScene: "Saturday afternoon. {{child_name}} is fully locked into something with a real clock and real stakes, completely wired in — not because anyone made {{child_pronoun_obj}}, because it's finally offering something worth switching on for.",

  // S7/S8 base — composed with pattern clauses
  s7StayPathBase:   "Low-stimulation tasks keep asking for an engagement {{child_name}} genuinely doesn't have access to without a real hook, and the gap between \"won't try\" and \"nothing here is asking anything of {{child_pronoun_obj}}\" keeps getting read as laziness.",
  s7ChangePathBase: "{{child_name}} gets real stakes and real charge built into ordinary tasks — a clock, a challenge, something at risk. The flatness that used to hit within ninety seconds starts taking a lot longer to show up, because there's finally something to push against.",
  s8RoadmapBullets: [
    "Building real stakes into ordinary tasks — a clock, a challenge, something on the line.",
    "Telling the difference between {{child_pronoun_poss}} not trying and the task genuinely offering nothing to switch on for.",
  ],
};
