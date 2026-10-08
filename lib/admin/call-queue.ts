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

  // After ANY logged call, the contact is excluded from B/C/D/E until either:
  //   (a) its follow_up_at — handled above: on/after that day it surfaces in segment A; until
  //       then (a future follow-up) it stays hidden; or
  //   (b) the call's created_at + 2 days, when no follow_up_at was set (no_answer / busy).
  // This keeps a just-called parent out of the queue so they aren't called twice in a day.
  if (latest) {
    if (followUpMs != null) return null;                 // future follow-up → wait for segment A
    const lastCallMs = ms(latest.createdAt);
    if (lastCallMs != null && nowMs < lastCallMs + 2 * DAY_MS) return null; // 2-day cooldown
  }

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

// Outcomes that MUST carry a follow_up_at: logging interest or a callback without scheduling the
// next call is how leads fall through the cracks, so both the API and the A2 form require a date.
export const OUTCOMES_REQUIRING_FOLLOWUP: CallLogOutcome[] = ["interested", "callback"];
export function followUpRequired(outcome: CallLogOutcome): boolean {
  return OUTCOMES_REQUIRING_FOLLOWUP.includes(outcome);
}
// Shared validation for a logged call (used by POST /api/admin/calls and unit tests).
export function validateCallLog(outcome: CallLogOutcome, followUpAt: string | null): { ok: true } | { ok: false; error: string } {
  if (followUpRequired(outcome) && !followUpAt) {
    return { ok: false, error: "follow_up_at is required for interested/callback" };
  }
  return { ok: true };
}

// Count per segment (A–E), for the A1 count tiles. Zero-filled.
export function segmentCounts(items: QueueItem[]): Record<Segment, number> {
  const counts: Record<Segment, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const it of items) counts[it.segment]++;
  return counts;
}

// ── Scheduled ────────────────────────────────────────────────────────────────
// A contact is "Scheduled" when its latest (non-terminal) call set a follow_up_at in the FUTURE
// (after end of today IST). These are intentionally held out of segments A–E by the cooldown; the
// Scheduled tab surfaces them so a booked callback never vanishes. On its due day the same contact
// flips into segment A (classifyContact).
export type ScheduledItem = { assessmentId: string; followUpAt: number };

export function scheduledFollowUpMs(c: QueueContact, now: Date): number | null {
  const calls = [...c.calls].sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0));
  const latest = calls[0];
  if (!latest || DEAD_OUTCOMES.has(latest.outcome)) return null;
  const fu = ms(latest.followUpAt);
  return fu != null && fu > endOfTodayIST(now) ? fu : null;
}

export function buildScheduled(contacts: QueueContact[], now: Date): ScheduledItem[] {
  const out: ScheduledItem[] = [];
  for (const c of contacts) {
    const fu = scheduledFollowUpMs(c, now);
    if (fu != null) out.push({ assessmentId: c.assessmentId, followUpAt: fu });
  }
  out.sort((a, b) => a.followUpAt - b.followUpAt); // soonest first
  return out;
}

// ── Per-PERSON grouping ──────────────────────────────────────────────────────
// The queue/cooldown/scheduled must work per PERSON, not per assessment: a parent called on
// assessment X who later does assessment Y keeps their call history + cooldown. Group by
// normalised phone (email fallback); the representative is the latest assessment, but paid / report
// / LMS state and the call history are AGGREGATED across all of the person's assessments.
export function personKey(phone: string | null, email: string | null): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  const norm = d.length === 10 ? "91" + d
    : (d.length === 12 && d.startsWith("91")) ? d
    : (d.length === 11 && d.startsWith("0")) ? "91" + d.slice(1)
    : (d.length >= 10 ? d : null);
  if (norm) return norm;
  const e = (email ?? "").trim().toLowerCase();
  return e ? "email:" + e : null;
}

export type PersonInput = QueueContact & { personKey: string; createdAt: string; tierRank?: number };

// Collapse per-assessment inputs into one QueueContact per person.
export function groupByPerson(items: PersonInput[]): QueueContact[] {
  const groups = new Map<string, PersonInput[]>();
  for (const it of items) {
    const g = groups.get(it.personKey) ?? [];
    g.push(it);
    groups.set(it.personKey, g);
  }
  const out: QueueContact[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => (ms(b.createdAt) ?? 0) - (ms(a.createdAt) ?? 0)); // latest first
    const rep = group[0];
    const paidMember = [...group].sort((a, b) => (b.tierRank ?? 0) - (a.tierRank ?? 0)).find((g) => g.paid);
    const maxIso = (sel: (x: PersonInput) => string | null) =>
      group.map(sel).filter(Boolean).sort().slice(-1)[0] ?? null;
    out.push({
      assessmentId: rep.assessmentId,
      reportSentAt: maxIso((x) => x.reportSentAt),
      paid: group.some((g) => g.paid),
      tier: paidMember?.tier ?? null,
      lmsLastActivityAt: maxIso((x) => x.lmsLastActivityAt),
      lmsFinished: group.some((g) => g.lmsFinished),
      calls: group.flatMap((g) => g.calls),
    });
  }
  return out;
}
