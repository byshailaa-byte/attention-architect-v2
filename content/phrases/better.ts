// "What would better actually look like?" phrase table — objective-personalization-layer-spec.md §6
// Keys = multi-select option slugs from the post-assessment screen.
// Template (S6): "You told us {better_phrase} is what you're hoping for.
//                 Here's what that could look like for {ChildName} specifically:"
import type { BetterPhrase } from "@/content/types";

export const betterPhrases: Record<string, BetterPhrase> = {
  homework_start:  { display: "he comes to homework without a fight" },
  finishes:        { display: "he finishes what he starts" },
  screen_meltdowns: { display: "fewer meltdowns over screens" },
  proud:           { display: "he seems proud of something again" },
  less_tension:    { display: "less tension between us at home" },
  school_better:   { display: "he does better at school" },
};
