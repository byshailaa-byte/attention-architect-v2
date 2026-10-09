// Report v2 content layer (?report=v2). The LLM generates the free-text fields below;
// goal, evidence, header and archetype card are assembled from stored data + templates.

// Bump when the generated-content SHAPE or voice changes. Cached rows stamped with an older
// version are treated as a cache miss: the view renders the (new-shape) fallback instantly and
// a background regenerate overwrites the stale row. See service.ts.
export const REPORT_V2_VERSION = 3;

export type ReportV2Generated = {
  // card 1 — the new voice (shown):
  seenIt: string;                   // v3: one sentence "When {Name} …, {he} <focuses well>." (no opener)
  hardPart: string;                 // v3: "{Name} isn't <wrong read>. {He}'s <real reason>."
  // v1/v2-only fields. OPTIONAL so v3 (card 2 is now fixed per archetype) can omit them.
  // Old stored rows still carry them and must still typecheck + render.
  shortGood?: string;
  shortWhy?: string;
  shortFix?: string;
  whyParas?: [string, string];      // card 2 (v1/v2) — para 1 starts "You’ve seen it yourself."
  switch: { instead: string; try: string; after: string }; // card 5 "What to try instead"
  tonight: [string, string, string]; // card 6 three numbered steps
};

// leadIn/quote/dim are kept for the v1/v2 evidence consumers. qid + optionValue are threaded
// for v3's card-3 PLAIN_ANSWER lookup (the question id + the chosen option value). Both optional
// and non-breaking: old stored rows and old consumers ignore them.
export type EvidenceItem = { leadIn: string; quote: string; dim?: string; qid?: string; optionValue?: string };

export type ReportV2Content = ReportV2Generated & {
  v?: number;                       // REPORT_V2_VERSION the row was generated at
  layout?: "v3";                    // present → render the 5-card v3 layout; absent → old 7-card
  source: "llm" | "fallback";
  // assembled (not generated):
  childName: string;
  concern: string;                  // canonical concern key
  worryLabel: string;               // human label of the worry
  headline: string;                 // §1 headline from the concern
  goldLine: string;                 // §1 italic gold line
  goal: string;                     // §7 goal from the concern→goal mapping
  evidence: EvidenceItem[];         // §3 exactly 3 verbatim answers + lead-ins
  evidenceTie: string;              // §3 one line tying them together
  archetype: string;                // §4 archetype name
  archetypeDesc: string;            // §4 strengths-first description
  disclaimer: string;               // §8
};
