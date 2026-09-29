// sendOpsAlert must NEVER throw — it runs on failure paths where a thrown alert would
// mask the original error. These tests hit the REAL notify module (no mock) and stub fetch.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendOpsAlert (never throws)", () => {
  const ORIG = { ...process.env };
  beforeEach(() => { vi.restoreAllMocks(); process.env = { ...ORIG }; });
  afterEach(() => { process.env = { ...ORIG }; });

  it("does not throw when Resend returns 500, and logs the failure loudly", async () => {
    process.env.RESEND_API_KEY = "key";
    process.env.ALERT_EMAIL = "ops@example.com";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("boom", { status: 500 }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { sendOpsAlert } = await import("@/lib/alerts/notify");
    await expect(sendOpsAlert("subj", "body")).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(errSpy.mock.calls[0]?.[0])).toContain("OPS ALERT NOT DELIVERED");
  });

  it("does not call Resend and logs loudly when RESEND_API_KEY is unset", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.ALERT_EMAIL = "ops@example.com";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 200 }));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { sendOpsAlert } = await import("@/lib/alerts/notify");
    await expect(sendOpsAlert("subj", "body")).resolves.toBeUndefined();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(String(errSpy.mock.calls[0]?.[0])).toContain("OPS ALERT NOT DELIVERED");
  });
});
