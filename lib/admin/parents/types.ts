// Client-safe types + constants for the Parents screen. No server-only imports here, so both the
// server data layer (data.ts) and the client view (ParentsView.tsx) can import from it.

export type ParentChild = {
  assessmentId: string;
  sessionId: string;
  childName: string;
  ageBand: string;
  worry: string;          // display label
  journey: string;        // "Report read · plan opened on 2 days · Week 1 Day 3"
  archetype: string;      // display name, e.g. "The All-In Kid"
  assessedAt: string;     // ISO of the assessment
};
export type ParentRow = {
  key: string;
  parentName: string;
  phoneMasked: string | null;
  telHref: string | null;
  waHref: string | null;
  hasPhone: boolean;
  children: ParentChild[];
  leadAt: string;         // newest assessment date (display)
  leadAtMs: number;
  bucket: Bucket;
  statusLabel: string;    // the pill text
  followUpAt: string | null;
  followUpMs: number | null;
  followUpOverdue: boolean;
  tries: number;
  lastNote: string | null;
  coachFlag: boolean;     // the Coach flagged a call for this parent
};

// Side-panel detail shapes (client-safe).
export type PanelCall = {
  id: string;
  assessment_id: string;
  outcome: string;
  status: string | null;
  objection: string | null;
  notes: string | null;
  next_steps: string | null;
  follow_up_at: string | null;
  duration_sec: number | null;
  called_by: string | null;
  created_at: string;
};
export type PanelReport = {
  worry: string;
  hardPart: string;
  tonightStep: string;
  goal: string;
};
// Assessment answers per child for the Answers tab: full question text (with {name} → child name)
// + the chosen answer in plain words, grouped into sections in assessment order.
export type AnswerSection = { section: string; items: { q: string; a: string }[] };
export type PanelAnswers = Record<string, AnswerSection[]>;

export const BUCKETS = [
  "all", "new", "no_pickup", "callback", "interested", "trial_offered",
  "trial_in_progress", "purchased", "other_course", "not_interested", "no_phone",
] as const;
export type Bucket = (typeof BUCKETS)[number];
export const BUCKET_LABEL: Record<Bucket, string> = {
  all: "All", new: "New", no_pickup: "Did not pick up", callback: "Callback", interested: "Interested",
  trial_offered: "Trial offered", trial_in_progress: "Trial in progress", purchased: "Purchased",
  other_course: "Other course", not_interested: "Not interested", no_phone: "No phone",
};
