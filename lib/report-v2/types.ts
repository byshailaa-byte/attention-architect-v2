// Report v2 content layer (?report=v2). The LLM generates the free-text fields below;
// goal, evidence, header and archetype card are assembled from stored data + templates.

export type ReportV2Generated = {
  shortGood: string;                // one line: what's working / lights them up
  shortWhy: string;                 // one line: why the worry happens
  shortFix: string;                 // one line: the one change
  whyParas: [string, string];       // §2 "Why the {worry} doesn't stick" — 2 short paras
  switch: { instead: string; try: string; after: string }; // §5 "The one switch"
  tonight: [string, string, string]; // §6 three numbered steps
};

export type EvidenceItem = { leadIn: string; quote: string };

export type ReportV2Content = ReportV2Generated & {
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
