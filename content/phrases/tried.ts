// "What have you already tried?" phrase table — objective-personalization-layer-spec.md §5
// Keys = multi-select option slugs from the post-assessment screen.
// Template (S4): "You've already tried {tried_phrase}. That's a reasonable thing to try —
//                 it just doesn't touch the real driver: {flavor_phrase}."
import type { TriedPhrase } from "@/content/types";

export const triedPhrases: Record<string, TriedPhrase> = {
  screen_limits: { display: "screen time limits / app blockers" },
  device_away:   { display: "taking the device away" },
  tuition:       { display: "more tuition / extra classes" },
  talking:       { display: "talking it through with him" },
  rewards:       { display: "rewards or consequences" },
  nothing:       { display: "nothing yet — this is new territory" },
};
