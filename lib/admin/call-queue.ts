// Pure call-queue logic for the admin Calling dashboard (A1/A2). No I/O, no React, no DB —
// the real CrmSource feeds it rows and it decides who to call today and why. Unit-tested in
// lib/admin/__tests__/call-queue.test.ts (one case per rule, invented data only).
//
// Segments, in priority order (each contact appears once, in the highest-priority segment):
//   A. Follow-up due    — latest call has follow_up_at ≤ end of today (IST)
//   B. New report        — report sent in the last 48h, not bought
//   C. Ageing report     — report sent 2–14 days ago, not bought
//   D. Plan calls        — tier2 (₹4,999) buyer, <3 interested/callback calls → "Plan call N of 3"
//   E. Paid but stuck    — paid, no LMS activity for 3+ days, not finished
//
// Removed from the queue when:
//   • B/C contact has purchased
//   • latest outcome is not_interested / wrong_number / do_not_call
//   • 3 no_answer/busy in a row (segment A still overrides, when a follow-up is set)
//   • D once 3 plan calls are logged (then falls through to E if stuck)
//   • E once there is LMS activity after the last call

export type CallLogOutcome =
  | "interested" | "callback" | "not_interested" | "purchased"
  | "no_answer" | "busy" | "wrong_number" | "do_not_call";

export type Segment = "A" | "B" | "C" | "D" | "E";

export type QueueCall = {
  outcome: CallLogOutcome;
  followUpAt: string | null; // ISO, from call_log.follow_up_at
  createdAt: string;         // ISO, from call_log.created_at
};

// One contact = one assessment, with just the fields the queue rules need.
export type QueueContact = {
  assessmentId: string;
  reportSentAt: string | null;      // assessments.whatsapp_report_sent_at
  paid: boolean;                     // a paid purchase exists
  tier: string | null;               // purchases.tier ('tier1' | 'tier2' | legacy)
  lmsLastActivityAt: string | null;  // MAX(lms_progress.completed_at)
  lmsFinished: boolean;              // whole plan completed
  calls: QueueCall[];                // this contact's call_log rows, any order
};

export type QueueItem = {
  assessmentId: string;
  segment: Segment;
  label: string;        // human segment label (D carries "Plan call N of 3")
  waitingSince: number; // ms epoch — sort key, oldest-waiting-first within a segment
};

const DEAD_OUTCOMES = new Set<CallLogOutcome>(["not_interested", "wrong_number", "do_not_call"]);
const NO_CONTACT = new Set<CallLogOutcome>(["no_answer", "busy"]);
const PLAN_OUTCOMES = new Set<CallLogOutcome>(["interested", "callback"]);

const DAY_MS = 24 * 3600_000;
const IST_OFFSET_MS = 5.5 * 3600_000; // IST = UTC+5:30, no DST
const SEGMENT_LABEL: Record<Segment, string> = {
  A: "Follow-up due",
  B: "New report, not bought",
  C: "Report sent, not bought",
  D: "Plan call",
  E: "Paid but stuck",
};
const SEGMENT_ORDER: Record<Segment, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

// End of the current IST calendar day, as a real UTC epoch (ms). A follow_up_at at or before
// this instant counts as "due today or earlier".
export function endOfTodayIST(now: Date): number {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS); // IST wall-clock as a UTC frame
  const nextMidnightIst = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) + DAY_MS;
  return nextMidnightIst - IST_OFFSET_MS - 1; // back to real UTC, last ms of today IST
}

function ms(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

// Classify a single contact into its highest-priority segment, or null if it's off the queue.
export function classifyContact(c: QueueContact, now: Date): QueueItem | null {
  const nowMs = now.getTime();
  const calls = [...c.calls].sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0)); // newest first
  const latest = calls[0] ?? null;

  // Absolute removal: the parent asked not to be called / can't be reached here.
  if (latest && DEAD_OUTCOMES.has(latest.outcome)) return null;

  // Segment A — a due follow-up. Overrides every block below (incl. the no-contact streak).
  const followUpMs = latest ? ms(latest.followUpAt) : null;
  if (followUpMs != null && followUpMs <= endOfTodayIST(now)) {
    return { assessmentId: c.assessmentId, segment: "A", label: SEGMENT_LABEL.A, waitingSince: followUpMs };
  }

  // Three no-answer/busy in a row and no follow-up set → stop trying for now.
  let streak = 0;
  for (const call of calls) {
    if (NO_CONTACT.has(call.outcome)) streak++;
    else break;
  }
  if (streak >= 3) return null;

  const mkItem = (segment: Segment, waitingSince: number, label = SEGMENT_LABEL[segment]): QueueItem =>
    ({ assessmentId: c.assessmentId, segment, label, waitingSince });

  if (c.paid) {
    const lastCallMs = latest ? ms(latest.createdAt) : null;

    // Segment D — tier2 (₹4,999) plan calls, until 3 interested/callback calls are logged.
    if (c.tier === "tier2") {
      const planCalls = calls.filter((x) => PLAN_OUTCOMES.has(x.outcome)).length;
      if (planCalls < 3) {
        const purchasedWait = lastCallMs ?? nowMs; // longest-since-last-call first
        return mkItem("D", purchasedWait, `Plan call ${planCalls + 1} of 3`);
      }
    }

    // Segment E — paid but stuck: no LMS activity for 3+ days, plan not finished, and no
    // movement since the last call (any LMS activity after the last call clears them).
    if (!c.lmsFinished) {
      const lastActivityMs = ms(c.lmsLastActivityAt);
      const staleFrom = lastActivityMs ?? ms(c.reportSentAt) ?? lastCallMs ?? nowMs;
      const stale = nowMs - staleFrom >= 3 * DAY_MS;
      const movedSinceCall = lastActivityMs != null && lastCallMs != null && lastActivityMs > lastCallMs;
      if (stale && !movedSinceCall) return mkItem("E", lastActivityMs ?? staleFrom);
    }
    return null; // paid, not stuck, not a pending plan call
  }

  // Not bought — segments B/C off the report-sent time.
  const sentMs = ms(c.reportSentAt);
  if (sentMs != null) {
    const age = nowMs - sentMs;
    if (age <= 2 * DAY_MS) return mkItem("B", sentMs);          // ≤48h
    if (age <= 14 * DAY_MS) return mkItem("C", sentMs);         // 2–14 days
  }
  return null;
}

// Build the full queue: classify everyone, drop the removed, and order by segment priority
// (A→E) then oldest-waiting-first inside each segment.
export function buildQueue(contacts: QueueContact[], now: Date): QueueItem[] {
  const items: QueueItem[] = [];
  for (const c of contacts) {
    const item = classifyContact(c, now);
    if (item) items.push(item);
  }
  items.sort((a, b) =>
    SEGMENT_ORDER[a.segment] - SEGMENT_ORDER[b.segment] || a.waitingSince - b.waitingSince,
  );
  return items;
}

// Count per segment (A–E), for the A1 count tiles. Zero-filled.
export function segmentCounts(items: QueueItem[]): Record<Segment, number> {
  const counts: Record<Segment, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const it of items) counts[it.segment]++;
  return counts;
}
