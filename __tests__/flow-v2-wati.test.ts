import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendWhatsAppReport } from "@/lib/whatsapp";

// The real WhatsApp send is verified by the operator in production (?flow=v2). Locally we
// MOCK WATI and assert the exact payload the v2 flow would send via /api/report/claim.
describe("sendWhatsAppReport — payload (mocked WATI)", () => {
  beforeEach(() => {
    vi.stubEnv("WATI_API_ENDPOINT", "https://wati.mock");
    vi.stubEnv("WATI_ACCESS_TOKEN", "test-token");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("POSTs send_assessment_new with {name, '1'=session id} to 91<phone>, one send", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: { body: string }) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ result: true }) } as unknown as Response;
    }));

    await sendWhatsAppReport({
      parentName: "Priya",
      childName: "TestKid",
      sessionId: "11111111-1111-1111-1111-111111111111",
      rawPhone: "7389070676",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/api/v1/sendTemplateMessage?whatsappNumber=917389070676");
    expect(calls[0].body.template_name).toBe("send_assessment_new");
    expect(calls[0].body.parameters).toEqual([
      { name: "name", value: "Priya" },
      { name: "1", value: "11111111-1111-1111-1111-111111111111" },
    ]);
  });
});
