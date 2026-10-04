// DRAFT — for Shaily. Card 4 strengths + Plan week-outcome lines, in the gold voice.
// Derived from the existing archetype content (PATTERN_LINE / MEANING), phrased as clean,
// concrete ✓ strengths. No abstract nouns.

// Three ✓ strengths per archetype (Card 4).
export const ARCHETYPE_STRENGTHS: Record<string, [string, string, string]> = {
  "The Storm": [
    "Locks in hard when the idea is theirs.",
    "Brings real energy once they've chosen in.",
    "Knows their own mind and stands by it.",
  ],
  "The All-In Kid": [
    "Goes deep and loses track of time.",
    "Sticks with one thing all the way.",
    "Does their best work when left alone.",
  ],
  "The Inventor": [
    "Finds their own way to solve things.",
    "Keeps going through a hard problem.",
    "Builds real understanding, not just answers.",
  ],
  "The Explorer": [
    "Connects ideas fast across topics.",
    "Lights up at anything new.",
    "Notices links other people miss.",
  ],
  "The Magnet": [
    "Works hard and long with company.",
    "Lifts the mood of a room.",
    "Tries harder when someone's rooting for them.",
  ],
  "The Glue": [
    "Reads how people are feeling.",
    "Calms things down between others.",
    "Works best as part of a team.",
  ],
  "The Captain": [
    "Takes charge and gets things done.",
    "Pushes hard when it's their call.",
    "Thinks like someone in charge.",
  ],
  "The Live Wire": [
    "Gives everything when it counts.",
    "Brings big energy to what matters.",
    "Rises to a real challenge.",
  ],
};

export function strengthsFor(archetype: string): [string, string, string] {
  return ARCHETYPE_STRENGTHS[archetype] ?? [
    "Pays attention in their own way.",
    "Has real strengths to build on.",
    "Does well when it suits how they work.",
  ];
}
