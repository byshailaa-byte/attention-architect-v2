// Per-call phone script shapes (client-safe). A script is generated for the NEXT call to a parent:
// call 1 = first-call, call 2+ = follow-up. Two languages: plain English or spoken Hinglish (Roman).
export type Lang = "en" | "hinglish";
export type ScriptKind = "first" | "followup";

export type ScriptSection = { title: string; seconds?: number; lines: string[]; hint?: string };
export type ScriptObjection = { label: string; answer: string };

export type CallScript = {
  kind: ScriptKind;
  lang: Lang;
  callNo: number;
  header: { caller: string; parent: string; child: string; ageBand: string; worry: string; builtFrom: string[] };
  leftOff?: string;   // follow-up: "Where you left off (call N, date): …"
  since?: string;      // follow-up: "Since then: …" (journey events after the last call)
  opener: string;      // the opening line — shown big at the top
  sections: ScriptSection[];
  objections: ScriptObjection[];
};

export type ScriptResult = {
  script: CallScript;
  source: "llm" | "fallback";
  model: string | null;
  inTok: number; outTok: number; costPaise: number;
  outcome: "ok" | "validator_fail" | "api_error";
  reason: string | null;
  cachedAt?: string;   // when the cached script was generated (for staleness)
  stale?: boolean;     // true if newer calls/journey events exist since cachedAt
};
