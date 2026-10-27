// @vitest-environment jsdom
// "Offer trial" must ask for confirmation before it activates anything — clicking the button only
// opens the confirm; the trial is granted only after "Start".
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { ParentPanel } from "@/app/admin/parents/ParentsView";
import type { ParentRow } from "@/lib/admin/parents/types";

const ROW: ParentRow = {
  key: "k1", parentName: "Asha", phoneDisplay: "+91 90000 00001", telHref: "tel:+919000000001",
  waHref: "https://wa.me/919000000001", hasPhone: true,
  children: [{ assessmentId: "11111111-1111-1111-1111-111111111111", sessionId: "22222222-2222-2222-2222-222222222222", childName: "Aarav", ageBand: "10-11", worry: "homework", journey: "Report read", archetype: "The All-In Kid", assessedAt: "2026-10-10T00:00:00Z" }],
  leadAt: "10 Oct", leadAtMs: 1, bucket: "callback", statusLabel: "Callback",
  followUpAt: null, followUpMs: null, followUpOverdue: false, tries: 1, lastNote: null, coachFlag: false, isInternal: false,
};

function mockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/api/admin/parents/detail")) return json({ calls: [], reports: {}, answers: {} });
    if (u.includes("/api/admin/coach-trial/status")) return json({ enabled: true, paid: false, alreadyTrialed: false, trialId: null, trialLink: null, previewId: null, previewUrl: null, approved: false, chip: "not_previewed", view: null });
    if (u.includes("/api/admin/parents/offer-trial")) return json({ ok: true, trialId: "t1", trialLink: "https://x/y", waMessage: "hi" });
    return json({});
  });
  function json(body: unknown) { return { ok: true, json: async () => body } as unknown as Response; }
}

describe("Parents panel — Offer trial confirm", () => {
  beforeEach(() => { global.fetch = mockFetch() as unknown as typeof fetch; });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("clicking Offer trial opens a confirm and does NOT grant until Start", async () => {
    render(<ParentPanel row={ROW} position={{ n: 1, total: 1 }} onClose={() => {}} onListRefresh={() => {}} onNext={() => {}} />);

    // Offer trial button appears once trial status resolves (enabled, not offered).
    const offerBtn = await screen.findByRole("button", { name: "Offer trial" });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const offerCalls = () => fetchMock.mock.calls.filter((c) => String(c[0]).includes("/offer-trial")).length;

    fireEvent.click(offerBtn);
    // Confirm shows; nothing granted yet.
    expect(await screen.findByText(/Start Asha’s 4-day trial now\?/)).toBeTruthy();
    expect(offerCalls()).toBe(0);

    // Confirm → now it grants.
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(offerCalls()).toBe(1));
  });

  it("Cancel on the confirm grants nothing", async () => {
    render(<ParentPanel row={ROW} position={{ n: 1, total: 1 }} onClose={() => {}} onListRefresh={() => {}} onNext={() => {}} />);
    const offerBtn = await screen.findByRole("button", { name: "Offer trial" });
    fireEvent.click(offerBtn);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes("/offer-trial")).length).toBe(0);
  });
});
