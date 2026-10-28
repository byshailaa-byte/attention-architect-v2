// Client-safe shapes for the Parent timeline (merged multi-source feed).
export type TlSource = "site" | "call" | "message" | "coach";

export type TlEvent = {
  id: string;
  t: string;            // ISO
  timeLabel: string;    // "8:42 pm"
  source: TlSource;
  icon: string;         // glyph key: site|call|message|coach|checkout|report|roadmap|plan|assess|done|lead|trial|purchase
  title: string;
  sub?: string;
  child?: string;       // set only when the home has 2+ children
  href?: string;        // Coach row → /admin/coach-review
  approx?: boolean;     // "~" — derived/approximate value
  dayKey: string;       // IST yyyy-mm-dd
  dayLabel: string;     // "FRI 17 OCT"
  visitId?: string;     // site/coach events belong to a visit
  dropOff?: string;     // if set, render a drop-off marker under this event
};

export type TlVisit = { id: string; index: number; source: string; range: string };
export type TlFirstCame = { source: string; adName: string | null; device: string | null } | null;
export type TlSummary = { visits: number; reportMinutes: number; reportApprox: boolean; lastCard: number | null; totalCards: number; calls: number };

export type TimelineResult = {
  summary: TlSummary;
  firstCame: TlFirstCame;
  events: TlEvent[];                 // newest first, already paginated
  visits: Record<string, TlVisit>;
  counts: { all: number; site: number; call: number; message: number; coach: number };
  total: number;
  truncated: boolean;
};
