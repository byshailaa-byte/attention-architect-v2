// Content type interfaces — aligned to report-content-master.md slot inventory.
// Section numbers (S1-S8) reference the 8-section report structure.
// {{tokens}} in string values are filled at render time by the Phase 4 renderer.

export type Band = "Strong" | "Mixed" | "Low";
export type AgeBand = "8-9" | "10-11" | "12-14";
export type ReflectionOutcome = "worked" | "mixed" | "didnt_land";

// ── Report content per archetype (×8) ────────────────────────────────────────
// Appendix slot list: label, flavor_phrase, evidence_observation,
// pattern_intro, anecdote, pullquote, strength, shadow, analysis[2], s4ReframeClose,
// parent_worries[2], future_scene, axis_descriptions[3 — direction is SHARED, not per-archetype]

export type ArchetypeContent = {
  displayName: string;              // "The Storm" — child.label in templates

  // S1 slots
  s1FlavorPhrase: string;           // child.flavor_phrase — archetype-specific; reused in S4
  s1EvidenceObservation: string;    // child.evidence_observation — "you've already seen it: X"

  // S2 slots
  s2Anecdote: string;               // child.anecdote — vivid, universal, age-neutral scene
  s2Pullquote: string;              // child.pullquote — the quotable line shown in pull-quote style
  s2Strength: string;               // child.strength — short phrase ("his own choice turns into real drive.")
  s2Shadow: string;                 // child.shadow — short phrase ("someone else's plan turns that same energy...")

  // S3 slots — child-side worries, voiced as parent recognition
  s3ParentWorries: [string, string];  // child.parent_worries[0..1]

  // S4 slots
  s4Analysis: [string, string];       // child.analysis[0..1] — "here's what's actually going on" bullets
  // Fragment only — composed into pattern.s4MechanismTemplate by the renderer.
  // e.g. Storm = "done to him — not chosen"
  s4ReframeClose: string;             // child_reframe_close

  // S5 slots — one description per axis, band-independent.
  // The band label ("Strong"/"Mixed"/"Low") is computed and shown separately.
  // These sentences describe HOW this archetype's version of each axis works.
  s5AxisDescriptions: {
    stability: string;               // e.g. "Holds firm when it's his call. Drops fast when it's not."
    resistance: string;              // e.g. "Screens give him constant excitement and full control."
    recovery: string;                // e.g. "Free time with no rules recharges him."
    // Direction = "Covered in Section 2." — SHARED, not per-archetype
  };

  // S6 slots
  s6FutureScene: string;             // child.future_scene — concrete near-future moment; {{child_name}} token

  // S7/S8 base slots — composed with PatternContent clauses by the renderer.
  // Decision log: §7-8 are additive (archetype context + pattern instinct), not interactive like §3.
  // So composition works here; pair-specific authoring would not add insight.
  s7StayPathBase: string;            // child.stayPathBase — what continues for THIS archetype if nothing changes
  s7ChangePathBase: string;          // child.changePathBase — the shape of change for THIS archetype
  s8RoadmapBullets: [string, string]; // child.roadmapBullets[2] — first 2 bullets, archetype-driven

  // Beat 3 fit-block — one sentence describing how this archetype's attention works in relation to the parent
  beatFitChild?: string;
};

// ── Report content per parent pattern (×4) ───────────────────────────────────
// Appendix slot list: label, self_doubts[2], disarm, mechanism, future_vision

export type PatternContent = {
  displayName: string;              // "The Pusher" — parent.label

  // S3 slots
  s3SelfDoubts: [string, string];   // parent.self_doubts[0..1] — voiced as parent interior
  s3Disarm: string;                 // parent.disarm — validates strength, names shadow, defers resolution

  // S4 slots
  // Template containing {{child_reframe_close}} (filled by renderer from archetype's s4ReframeClose)
  // and {{child_name}} (filled by standard fillTokens).
  // Pusher: "It's that pushing taught {{child_name}} focus is something {{child_reframe_close}}."
  s4MechanismTemplate: string;

  // S6 slots
  s6FutureVision: string;           // parent.future_vision — "And for you — ..."

  // S7/S8 clause slots — appended to ArchetypeContent bases by the renderer.
  s7StayPathClause: string;         // pattern.stayPathClause — what THIS pattern's instinct adds to the stay scenario
  s7ChangePathClause: string;       // pattern.changePathClause — what THIS pattern's shift makes possible
  s8RoadmapClause: string;          // pattern.roadmapClause — bullet 3, pattern-driven

  // Beat 3 fit-block — one sentence describing this parent pattern's instinct in relation to the child
  beatFitParent?: string;
};

// ── Fit content (archetype × parent combination, 32 total) ───────────────────
// Appendix slot list (corrected): fit.reveal only.
// stay_path / change_path / roadmap_bullets are COMPOSED, not pair-specific.
// See report-content-master.md §7-8 decision log: 8 archetype bases + 4 pattern clauses = 12,
// not 32. Fields live on ArchetypeContent (s7StayPathBase / s7ChangePathBase / s8RoadmapBullets)
// and PatternContent (s7StayPathClause / s7ChangePathClause / s8RoadmapClause).

export type FitContent = {
  // S3 — the flagship: the named-interaction paragraph.
  // Verbatim from report-fit-reveals-all-32.md.
  // Tokens: {{name}} (parent), {{child_name}} (child).
  fitReveal: string;
};

// ── Personalization phrase tables ─────────────────────────────────────────────
// Keys defined by objective-personalization-layer-spec.md §3, §5, §6.
// Used in Section 1 (objective), Section 4 (tried), Section 6 (better).

export type ObjectivePhrase = {
  display: string;   // the full phrase used in templates ("the screen time battles")
};

export type TriedPhrase = {
  display: string;   // used in S4 "you've already tried X"
};

export type BetterPhrase = {
  display: string;   // used in S6 "you told us X is what you're hoping for"
};

// ── Report conversion content (new sections) ─────────────────────────────────

export type TonightTip = {
  instead: string;
  try: string;
  why: string;
};

export type TimelineScene = {
  today: string;
  wk1: string;
  wk2: string;
  wk3: string;
  wk4: string;
  wk5: string;
  wk6: string;
};

// ── LMS content ───────────────────────────────────────────────────────────────
// Phase 6. LmsWeekContent stores both the main weekly reading and the daily action cards.

export type LmsWeeklyReading = {
  // Everything from "How this week works" through the Pusher-specific opener paragraph,
  // quick recap, and "why we start here" — up to the age-band calibration block.
  introShared: string;

  // The "one move" — age-band-specific calibration. Parent sees EXACTLY ONE block.
  moveCalibration: Record<AgeBand, string>;

  // Shared text immediately after the calibration block.
  moveOutroShared: string;

  // "What working actually looks like this week" section.
  whatWorkingLooksLike: string;

  // "One thing to hold onto" section.
  thingToHoldOnto: string;
};

export type LmsDayCard = {
  day: number;
  title: string;
  // Most days have identical content across age bands. Where age-band variation exists,
  // each band gets the full text (band-specific sentence appended for that band).
  content: Record<AgeBand, string>;
  // null = Day 1 (observe only, no tap).
  // Days 2–5 all collect a reflection tap at card-close.
  // nextDayOpening: present on Days 2–4 (tap drives next card's opening fork).
  //                 absent on Day 5 (weekend uses computed week_trend from all 4 taps).
  // No-tap default when parent skips: "mixed" branch — least presumptuous either direction.
  reflection: {
    prompt: string;
    nextDayOpening?: Record<ReflectionOutcome, string>;
  } | null;
};

export type LmsWeekendReview = {
  content: Record<AgeBand, string>;
  noteReflectionIntro: string;  // sentence before echoed back reflection notes
};

export type LmsWeekContent = {
  archetype: string;
  week: number;
  weekTitle: string;
  weeklyReading: LmsWeeklyReading;
  days: LmsDayCard[];
  weekendReview: LmsWeekendReview;
};
