import { describe, it, expect } from "vitest";
import { processWatiEvent } from "@/lib/leads/wati-ingest";

// Capturing fake sql: records each tagged-template call's SQL text + interpolated values,
// returns programmed results by call order.
function makeSql(results: unknown[][]) {
  const calls: { text: string; values: unknown[] }[] = [];
  let i = 0;
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("?"), values });
    return Promise.resolve(results[i++] ?? []);
  }) as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
  return { fn, calls };
}

describe("processWatiEvent", () => {
  it("is idempotent: a duplicate message id writes no new rows", async () => {
    const { fn, calls } = makeSql([[{ "1": 1 }]]); // dedup SELECT finds the id
    await processWatiEvent(fn, { waId: "9876543210", whatsappMessageId: "wamid-1", text: "hi" });
    expect(calls.length).toBe(1);
    expect(calls[0].text).toContain("SELECT 1 FROM wa_events");
    expect(calls.some(c => c.text.includes("INSERT INTO wa_events"))).toBe(false);
    expect(calls.some(c => c.text.includes("INSERT INTO wa_contacts"))).toBe(false);
  });

  it("first message with a sourceId -> ad_click; first_source_* never in the conflict update", async () => {
    const { fn, calls } = makeSql([[], [], [], []]); // not dup, first contact, upsert, event
    await processWatiEvent(fn, {
      waId: "9876543210", whatsappMessageId: "wamid-2",
      sourceId: "ad_123", sourceUrl: "https://fb/x", sourceType: 1, senderName: "A", text: "hi",
    });
    const upsert = calls.find(c => c.text.includes("INSERT INTO wa_contacts"))!;
    expect(upsert.text).toContain("ON CONFLICT (phone) DO UPDATE");
    // first_source_* appear in the INSERT column list but MUST NOT be in the DO UPDATE set:
    const doUpdate = upsert.text.slice(upsert.text.indexOf("DO UPDATE"));
    expect(doUpdate).not.toContain("first_source");
    const ev = calls.find(c => c.text.includes("INSERT INTO wa_events") && c.text.includes("wati_message_id"))!;
    expect(ev.values).toContain("ad_click");
  });

  it("keyword sets needs_human with the matched reason; the message text is never stored", async () => {
    const TEXT = "please REFUND my payment";
    const { fn, calls } = makeSql([
      [],                              // dedup: not dup
      [{ phone: "+919876543210" }],    // existing contact (not first)
      [],                              // contact upsert
      [],                              // event insert
      [{ phone: "+919876543210" }],    // needs_human UPDATE RETURNING -> flagged
      [],                              // handoff insert
    ]);
    await processWatiEvent(fn, { waId: "9876543210", whatsappMessageId: "wamid-3", text: TEXT });

    const upd = calls.find(c => c.text.includes("UPDATE wa_contacts") && c.text.includes("needs_human = true"))!;
    expect(upd).toBeTruthy();
    expect(upd.values).toContain("refund");
    expect(calls.some(c => c.text.includes("INSERT INTO wa_events") && c.text.includes("handoff"))).toBe(true);

    // The raw text (or any word unique to it) must never appear as an interpolated value.
    const allValues = calls.flatMap(c => c.values).map(v => String(v));
    expect(allValues).not.toContain(TEXT);
    expect(allValues.some(v => v.includes("payment"))).toBe(false);
  });

  it("ignores outbound (owner) messages and unresolvable phones", async () => {
    const a = makeSql([]); await processWatiEvent(a.fn, { waId: "9876543210", owner: true, text: "hi" });
    expect(a.calls.length).toBe(0);
    const b = makeSql([]); await processWatiEvent(b.fn, { waId: "12345", text: "hi" }); // junk phone
    expect(b.calls.length).toBe(0);
  });
});
