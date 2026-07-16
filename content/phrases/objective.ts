// Objective/concern phrase table — objective-personalization-layer-spec.md §3
// Keys = concern chip slugs from the landing page.
// Template (1 item):  "You told us {phrase} was the thing bothering you most."
// Template (2 items): "You told us {phraseA} and {phraseB} were on your mind most."
import type { ObjectivePhrase } from "@/content/types";

export const objectivePhrases: Record<string, ObjectivePhrase> = {
  focus:      { display: "why focus comes and goes" },
  screens:    { display: "the screen time battles" },
  confidence: { display: "how much he compares himself to others" },
  emotions:   { display: "his emotional ups and downs" },
  school:     { display: "how he's doing day-to-day at school" },
  potential:  { display: "why he's not living up to what he's capable of" },
};
