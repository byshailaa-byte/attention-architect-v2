import { describe, it, expect } from "vitest";
import {
  mergeLeads,
  reasonToStatus,
  type AssessmentRow,
  type HandbookRow,
  type WaContactRow,
  type PurchaseRow,
} from "@/lib/leads/merge";

// ── Fixture builders (sensible defaults, override per test) ─────────────────────

function assessment(over: Partial<AssessmentRow> = {}): AssessmentRow {
  return {
    session_id: "11111111-1111-1111-1111-111111111111",
    phone: "9876543210",
    child_name: "Aarav",
    parent_name: "Parent A",
    archetype: "The Explorer",
    age_band: "10-11",
    email: null,
    created_at: "2026-09-29T10:00:00.000Z",
    utm: null,
    started_at: null,
    report_sent_at: null,
    roadmap_click_at: null,
    checkout_at: null,
    ...over,
  };
}

function waContact(over: Partial<WaContactRow> = {}): WaContactRow {
  return {
    phone: "+919876543210",
    name: "Parent A",
    first_source_id: null,
    first_source_url: null,
    first_source_type: null,
    first_seen_at: "2026-09-29T09:00:00.000Z",
    last_seen_at: "2026-09-29T09:05:00.000Z",
    needs_human: false,
    needs_human_reason: null,
    needs_human_at: null,
    handled_at: null,
    ...over,
  };
}

function purchase(over: Partial<PurchaseRow> = {}): PurchaseRow {
  return {
    phone: "9876543210",
    status: "paid",
    tier: "full",
    amount_paise: 499900,
    created_at: "2026-09-30T12:00:00.000Z",
    ...over,
  };
}

const EMPTY = { assessments: [] as AssessmentRow[], handbook: [] as HandbookRow[], waContacts: [] as WaContactRow[], purchases: [] as PurchaseRow[] };

// ── Tests ───────────────────────────────────────────────────────────────────────

describe("mergeLeads", () => {
  it("merge: the same phone in assessments and wa_contacts collapses to one lead", () => {
    const leads = mergeLeads({
      ...EMPTY,
      assessments: [assessment({ phone: "9876543210" })],
      waContacts: [waContact({ phone: "+919876543210" })],
    });
    expect(leads).toHaveLength(1);
    expect(leads[0].phone).toBe("+919876543210");
    expect(leads[0].mergedFrom.assessments).toBe(1);
    expect(leads[0].mergedFrom.waContact).toBe(true);
  });

  it("merge: a 10-digit number and its +91 form are one lead", () => {
    const leads = mergeLeads({
      ...EMPTY,
      assessments: [
        assessment({ phone: "9876543210", session_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }),
        assessment({ phone: "+919876543210", session_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" }),
      ],
    });
    expect(leads).toHaveLength(1);
    expect(leads[0].phone).toBe("+919876543210");
    expect(leads[0].mergedFrom.assessments).toBe(2);
  });

  it("merge: a junk phone is dropped entirely", () => {
    const leads = mergeLeads({
      ...EMPTY,
      assessments: [assessment({ phone: "12345" })],
      handbook: [{ id: 1, phone: "notaphone", name: "x", age_band: "3-5", wa_sent: false, created_at: "2026-09-29T10:00:00.000Z" }],
    });
    expect(leads).toHaveLength(0);
  });

  it("merge: paid beats every other furthest step", () => {
    const leads = mergeLeads({
      ...EMPTY,
      assessments: [assessment({
        phone: "9876543210",
        started_at: "2026-09-29T10:01:00.000Z",
        report_sent_at: "2026-09-29T10:05:00.000Z",
        roadmap_click_at: "2026-09-30T08:41:00.000Z",
        checkout_at: "2026-09-30T08:44:00.000Z",
      })],
      purchases: [purchase({ phone: "9876543210" })],
    });
    expect(leads).toHaveLength(1);
    expect(leads[0].furthestStep).toBe("paid");
    expect(leads[0].furthestStepLabel).toBe("Paid");
    expect(leads[0].furthestRank).toBe(6);
    expect(leads[0].status).toBe("Customer");
    expect(leads[0].amountPaise).toBe(499900);
  });

  it("merge: an internal phone appearing only in handbook_leads and wa_contacts is excluded", () => {
    const INTERNAL = "9998887776";
    const leads = mergeLeads(
      {
        ...EMPTY,
        assessments: [assessment({ phone: "9876543210" })], // a normal lead
        handbook: [{ id: 9, phone: INTERNAL, name: "Staff", age_band: "6-7", wa_sent: true, created_at: "2026-09-29T10:00:00.000Z" }],
        waContacts: [waContact({ phone: "+91" + INTERNAL, first_seen_at: "2026-09-20T00:00:00.000Z", last_seen_at: "2026-09-20T00:00:00.000Z" })],
      },
      [INTERNAL], // internal set (10-digit; mergeLeads normalizes)
    );
    // Only the internal person is dropped — the normal lead survives.
    expect(leads).toHaveLength(1);
    expect(leads[0].phone).toBe("+919876543210");
    expect(leads.some((l) => l.phone === "+91" + INTERNAL)).toBe(false);
  });
});

describe("reasonToStatus — one label per needs_human reason group", () => {
  it("refund → Refund", () => {
    expect(reasonToStatus("refund")).toBe("Refund");
  });
  it("payment / paid / not received → Payment issue", () => {
    for (const w of ["payment", "paid", "not received"]) expect(reasonToStatus(w)).toBe("Payment issue");
  });
  it("talk to / call me / speak to / a person / real person / human → Asked for a person", () => {
    for (const w of ["talk to", "call me", "speak to", "a person", "real person", "human"]) {
      expect(reasonToStatus(w)).toBe("Asked for a person");
    }
  });
  it("doctor / medicine / medication / adhd / autism → Medical question", () => {
    for (const w of ["doctor", "medicine", "medication", "adhd", "autism"]) expect(reasonToStatus(w)).toBe("Medical question");
  });
  it("suicide / kill / hurt / abuse / beat / harm → Safety — reply now", () => {
    for (const w of ["suicide", "kill", "hurt", "abuse", "beat", "harm"]) expect(reasonToStatus(w)).toBe("Safety — reply now");
  });
  it("unknown / null → Needs reply", () => {
    expect(reasonToStatus("gibberish")).toBe("Needs reply");
    expect(reasonToStatus(null)).toBe("Needs reply");
  });
});
