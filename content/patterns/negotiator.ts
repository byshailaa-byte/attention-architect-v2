import { TODO } from "@/lib/content/todo";
import type { PatternContent } from "@/content/types";

// Source: report-content-master.md (authoring note — pending)
export const negotiator: PatternContent = {
  displayName: "The Negotiator",

  // S3
  s3SelfDoubts: [
    "I've basically turned homework into a marketplace. I don't know if {{child_name}} is learning to focus or just learning to ask what's in it for {{child_pronoun_obj}}.",
    "Every deal that works makes me a little more worried about what happens the day I don't have anything left to offer.",
  ],
  s3Disarm: "Nothing here is wrong — knowing how to make something worth {{child_pronoun_poss}} while is a real skill, and it's gotten plenty of kids through plenty of hard nights. But that same instinct meets {{child_pronoun_poss}} needs in a specific way. Once you see it, you won't unsee it. The roadmap is where you shift it, not just name it.",

  // S4 — template; {{child_reframe_close}} filled by renderer from archetype.s4ReframeClose.
  s4MechanismTemplate: "It's that negotiating taught {{child_name}} focus is something {{child_reframe_close}}.",

  // S6
  s6FutureVision: "And for you — six months from now might mean noticing {{child_name}} has started sometimes just because, with no trade on the table at all.",

  // S7/S8 clauses — pending authoring (report-content-master.md Session 4)
  s7StayPathClause:   "and with a Negotiator's instinct unchanged, the deal-making keeps working right up until there's nothing left to trade — and then it stops working at all.",
  s7ChangePathClause: "and a Negotiator who learns to let some things matter without a trade attached becomes the parent whose kid starts doing things because they're worth doing, not because something's on offer.",
  s8RoadmapClause:    "Where Negotiator helps — and where the deal is quietly doing the opposite of what it's meant to.",
};
