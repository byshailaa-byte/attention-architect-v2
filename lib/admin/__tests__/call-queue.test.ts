import { describe, it, expect } from "vitest";
import {
  classifyContact, buildQueue, segmentCounts, endOfTodayIST,
  followUpRequired, validateCallLog,
  type QueueContact, type QueueCall,
} from "@/lib/admin/call-queue";

// 11:30 IST on 7 Oct 2026. End of today IST = 2026-10-07T18:29:59.999Z.
const NOW = new Date("2026-10-07T06:00:00Z");

const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 3600_000).toISOString();
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 3600_000).toISOString();

// A contact with nothing going on; each test overrides only what it exercises. No real data.
function contact(over: Partial<QueueContact> = {}): QueueContact {
  return {
    assessmentId: "a-" + (over.assessmentId ?? "x"),
    reportSentAt: null,
    paid: false,
    tier: null,
    lmsLastActivityAt: null,
    lmsFinished: false,
    calls: [],
    ...over,
  };
}
const call = (over: Partial<QueueCall> & Pick<QueueCall, "outcome">): QueueCall => ({
  followUpAt: null,
  createdAt: hoursAgo(1),
  ...over,
});

describe("endOfTodayIST", () => {
  it("is the last ms of the current IST calendar day", () => {
    expect(new Date(endOfTodayIST(NOW)).toISOString()).toBe("2026-10-07T18:29:59.999Z");
  });
});

describe("Segment A — follow-up due", () => {
  it("latest call's follow_up_at at/before end of today (IST) → A", () => {
    const c = contact({ calls: [call({ outcome: "callback", followUpAt: hoursAgo(2), createdAt: daysAgo(1) })] });
    expect(classifyContact(c, NOW)?.segment).toBe("A");
  });
  it("follow_up_at later today IST still counts as due", () => {
    const c = contact({ calls: [call({ outcome: "callback", followUpAt: "2026-10-07T17:00:00Z", createdAt: daysAgo(1) })] });
    expect(classifyContact(c, NOW)?.segment).toBe("A");
  });
  it("follow_up_at tomorrow is NOT due today", () => {
    const c = contact({ calls: [call({ outcome: "callback", followUpAt: daysAgo(-1), createdAt: daysAgo(1) })] });
    expect(classifyContact(c, NOW)?.segment).not.toBe("A");
  });
  it("overrides a 3× no-answer streak when a follow-up is set", () => {
    const c = contact({ calls: [
      call({ outcome: "no_answer", followUpAt: hoursAgo(1), createdAt: daysAgo(1) }),
      call({ outcome: "no_answer", createdAt: daysAgo(2) }),
      call({ outcome: "no_answer", createdAt: daysAgo(3) }),
    ] });
    expect(classifyContact(c, NOW)?.segment).toBe("A");
  });
});

describe("Removal rules", () => {
  it("latest outcome not_interested → off the queue", () => {
    expect(classifyContact(contact({ reportSentAt: hoursAgo(5), calls: [call({ outcome: "not_interested" })] }), NOW)).toBeNull();
  });
  it("latest outcome wrong_number → off the queue", () => {
    expect(classifyContact(contact({ reportSentAt: hoursAgo(5), calls: [call({ outcome: "wrong_number" })] }), NOW)).toBeNull();
  });
  it("latest outcome do_not_call → off the queue", () => {
    expect(classifyContact(contact({ reportSentAt: hoursAgo(5), calls: [call({ outcome: "do_not_call" })] }), NOW)).toBeNull();
  });
  it("3 no_answer/busy in a row, no follow-up → off the queue", () => {
    const c = contact({ reportSentAt: hoursAgo(5), calls: [
      call({ outcome: "busy", createdAt: daysAgo(1) }),
      call({ outcome: "no_answer", createdAt: daysAgo(2) }),
      call({ outcome: "no_answer", createdAt: daysAgo(3) }),
    ] });
    expect(classifyContact(c, NOW)).toBeNull();
  });
  it("2 no_answer in a row (recent) is held in cooldown, not yet re-queued", () => {
    const c = contact({ reportSentAt: hoursAgo(5), calls: [
      call({ outcome: "no_answer", createdAt: daysAgo(1) }),
      call({ outcome: "no_answer", createdAt: daysAgo(2) }),
    ] });
    expect(classifyContact(c, NOW)).toBeNull();
  });
});

describe("Re-queue cooldown — after any logged call", () => {
  it("interested/callback require a follow-up date (predicate)", () => {
    expect(followUpRequired("interested")).toBe(true);
    expect(followUpRequired("callback")).toBe(true);
    expect(followUpRequired("no_answer")).toBe(false);
    expect(followUpRequired("not_interested")).toBe(false);
  });

  it("a called contact is hidden the SAME day (would be B, but just called)", () => {
    const c = contact({ reportSentAt: hoursAgo(10), calls: [call({ outcome: "no_answer", createdAt: hoursAgo(1) })] });
    expect(classifyContact(c, NOW)).toBeNull();
  });

  it("a future follow-up keeps the contact hidden until that day", () => {
    const c = contact({ reportSentAt: hoursAgo(10), calls: [call({ outcome: "callback", followUpAt: daysAgo(-2), createdAt: hoursAgo(1) })] });
    expect(classifyContact(c, NOW)).toBeNull();
  });

  it("reappears in segment A on the follow-up day", () => {
    const c = contact({ reportSentAt: daysAgo(3), calls: [call({ outcome: "callback", followUpAt: hoursAgo(1), createdAt: daysAgo(1) })] });
    expect(classifyContact(c, NOW)?.segment).toBe("A");
  });

  it("no_answer (no follow-up) reappears after 2 days", () => {
    const base = { reportSentAt: daysAgo(5) };
    // 1 day after the call → still in cooldown
    expect(classifyContact(contact({ ...base, calls: [call({ outcome: "no_answer", createdAt: daysAgo(1) })] }), NOW)).toBeNull();
    // 3 days after the call → back in the queue (report is 5 days old → segment C)
    expect(classifyContact(contact({ ...base, calls: [call({ outcome: "no_answer", createdAt: daysAgo(3) })] }), NOW)?.segment).toBe("C");
  });
});

describe("validateCallLog", () => {
  it("rejects interested without a follow-up date", () => {
    expect(validateCallLog("interested", null).ok).toBe(false);
  });
  it("rejects callback without a follow-up date", () => {
    expect(validateCallLog("callback", null).ok).toBe(false);
  });
  it("accepts interested WITH a follow-up date", () => {
    expect(validateCallLog("interested", "2026-10-08T11:00:00+05:30").ok).toBe(true);
  });
  it("accepts no_answer without a follow-up date", () => {
    expect(validateCallLog("no_answer", null).ok).toBe(true);
  });
});

describe("Segment B — new report, not bought", () => {
  it("report sent within 48h, no purchase → B", () => {
    expect(classifyContact(contact({ reportSentAt: hoursAgo(10) }), NOW)?.segment).toBe("B");
  });
  it("removed from B once purchased", () => {
    const c = contact({ reportSentAt: hoursAgo(10), paid: true, tier: "tier1", lmsLastActivityAt: hoursAgo(2) });
    expect(classifyContact(c, NOW)?.segment).not.toBe("B");
  });
});

describe("Segment C — report sent 2–14 days ago, not bought", () => {
  it("report sent 5 days ago, no purchase → C", () => {
    expect(classifyContact(contact({ reportSentAt: daysAgo(5) }), NOW)?.segment).toBe("C");
  });
  it("report older than 14 days → off the queue", () => {
    expect(classifyContact(contact({ reportSentAt: daysAgo(20) }), NOW)).toBeNull();
  });
});

describe("Segment D — tier2 plan calls", () => {
  it("tier2 buyer, no plan calls yet → Plan call 1 of 3", () => {
    const c = contact({ paid: true, tier: "tier2", lmsLastActivityAt: hoursAgo(2) });
    const r = classifyContact(c, NOW);
    expect(r?.segment).toBe("D");
    expect(r?.label).toBe("Plan call 1 of 3");
  });
  it("counts interested/callback calls → Plan call N of 3", () => {
    const c = contact({ paid: true, tier: "tier2", lmsLastActivityAt: hoursAgo(2), calls: [
      call({ outcome: "interested", createdAt: daysAgo(5) }),
      call({ outcome: "callback", createdAt: daysAgo(3) }),
    ] });
    expect(classifyContact(c, NOW)?.label).toBe("Plan call 3 of 3");
  });
  it("after 3 plan calls, no longer in D", () => {
    const c = contact({ paid: true, tier: "tier2", lmsLastActivityAt: hoursAgo(2), calls: [
      call({ outcome: "interested", createdAt: daysAgo(5) }),
      call({ outcome: "interested", createdAt: daysAgo(4) }),
      call({ outcome: "callback", createdAt: daysAgo(3) }),
    ] });
    expect(classifyContact(c, NOW)?.segment).not.toBe("D");
  });
  it("tier1 buyer is never in D", () => {
    const c = contact({ paid: true, tier: "tier1", lmsLastActivityAt: hoursAgo(2) });
    expect(classifyContact(c, NOW)?.segment).not.toBe("D");
  });
});

describe("Segment E — paid but stuck", () => {
  it("paid, no LMS activity for 3+ days, not finished → E", () => {
    const c = contact({ paid: true, tier: "tier1", lmsLastActivityAt: daysAgo(5) });
    expect(classifyContact(c, NOW)?.segment).toBe("E");
  });
  it("cleared once there is LMS activity after the last call", () => {
    const c = contact({ paid: true, tier: "tier1", lmsLastActivityAt: daysAgo(4), calls: [
      call({ outcome: "callback", createdAt: daysAgo(6) }), // activity (4d ago) is after this call (6d ago)
    ] });
    expect(classifyContact(c, NOW)).toBeNull();
  });
  it("not stuck when LMS activity is recent", () => {
    const c = contact({ paid: true, tier: "tier1", lmsLastActivityAt: hoursAgo(5) });
    expect(classifyContact(c, NOW)).toBeNull();
  });
  it("finished plan is never stuck", () => {
    const c = contact({ paid: true, tier: "tier1", lmsLastActivityAt: daysAgo(10), lmsFinished: true });
    expect(classifyContact(c, NOW)).toBeNull();
  });
  it("tier2 buyer with 3 plan calls, stuck in LMS → falls through to E", () => {
    const c = contact({ paid: true, tier: "tier2", lmsLastActivityAt: daysAgo(6), calls: [
      call({ outcome: "interested", createdAt: daysAgo(5) }),
      call({ outcome: "interested", createdAt: daysAgo(4) }),
      call({ outcome: "callback", createdAt: daysAgo(3) }),
    ] });
    expect(classifyContact(c, NOW)?.segment).toBe("E");
  });
});

describe("buildQueue — priority + ordering", () => {
  it("orders A→E, then oldest-waiting-first within a segment, each contact once", () => {
    const contacts: QueueContact[] = [
      contact({ assessmentId: "E1", paid: true, tier: "tier1", lmsLastActivityAt: daysAgo(5) }),
      contact({ assessmentId: "B_new", reportSentAt: hoursAgo(5) }),
      contact({ assessmentId: "B_old", reportSentAt: hoursAgo(40) }),
      contact({ assessmentId: "A1", calls: [call({ outcome: "callback", followUpAt: hoursAgo(1), createdAt: daysAgo(1) })] }),
    ];
    const q = buildQueue(contacts, NOW);
    expect(q.map((i) => i.segment)).toEqual(["A", "B", "B", "E"]);
    // within B, the older report (40h) comes before the newer (5h)
    const bs = q.filter((i) => i.segment === "B").map((i) => i.assessmentId);
    expect(bs).toEqual(["B_old", "B_new"]);
    // every contact appears at most once
    expect(new Set(q.map((i) => i.assessmentId)).size).toBe(q.length);
  });

  it("segmentCounts zero-fills every segment", () => {
    const q = buildQueue([
      contact({ assessmentId: "b", reportSentAt: hoursAgo(5) }),
      contact({ assessmentId: "e", paid: true, tier: "tier1", lmsLastActivityAt: daysAgo(5) }),
    ], NOW);
    expect(segmentCounts(q)).toEqual({ A: 0, B: 1, C: 0, D: 0, E: 1 });
  });
});
