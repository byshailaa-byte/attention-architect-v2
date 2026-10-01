import { describe, it, expect, vi } from "vitest";
import { backfillQueuedHandbooks, type HandbookSend } from "@/lib/leads/handbook-backfill";

type QueuedRow = { id: number; name: string; phone: string };

// Fake sql: returns the programmed queued rows for the SELECT, and records the
// id-arrays passed to each UPDATE ... WHERE id = ANY($1::int[]).
function makeSql(queued: QueuedRow[]) {
  const updated: number[][] = [];
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    if (text.includes("SELECT id, name, phone FROM handbook_leads")) {
      return Promise.resolve(queued);
    }
    if (text.includes("UPDATE handbook_leads SET wa_sent = true")) {
      updated.push(values[0] as number[]);
      return Promise.resolve([]);
    }
    return Promise.resolve([]);
  }) as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
  return { fn, updated };
}

describe("backfillQueuedHandbooks", () => {
  it("dedupe: one send per phone, and ALL that phone's rows are marked sent", async () => {
    const sql = makeSql([
      { id: 1, name: "Asha Rao", phone: "9876543210" },
      { id: 2, name: "Asha Rao", phone: "+91 98765-43210" }, // same number, different format
    ]);
    const send = vi.fn<HandbookSend>().mockResolvedValue({ ok: true });

    const result = await backfillQueuedHandbooks(sql.fn, send, 0);

    expect(send).toHaveBeenCalledTimes(1); // one send for the phone
    expect(result).toEqual({ sent: 1, failed: 0, invalid: 0, skipped_duplicates: 1 });
    expect(sql.updated).toHaveLength(1);
    expect([...sql.updated[0]].sort()).toEqual([1, 2]); // both rows marked in one UPDATE
  });

  it("invalid phone is skipped and counted, never sent", async () => {
    const sql = makeSql([{ id: 1, name: "X", phone: "12345" }]);
    const send = vi.fn<HandbookSend>().mockResolvedValue({ ok: true });

    const result = await backfillQueuedHandbooks(sql.fn, send, 0);

    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, failed: 0, invalid: 1, skipped_duplicates: 0 });
    expect(sql.updated).toHaveLength(0);
  });

  it("a failed send leaves wa_sent false (no UPDATE) and continues", async () => {
    const sql = makeSql([{ id: 1, name: "X", phone: "9876543210" }]);
    const send = vi.fn<HandbookSend>().mockResolvedValue({ ok: false, error: "WATI 400" });

    const result = await backfillQueuedHandbooks(sql.fn, send, 0);

    expect(send).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ sent: 0, failed: 1, invalid: 0, skipped_duplicates: 0 });
    expect(sql.updated).toHaveLength(0); // never marked sent
  });

  it("idempotent: a second run with nothing queued sends nothing", async () => {
    const sql = makeSql([]); // all rows already wa_sent = true → none selected
    const send = vi.fn<HandbookSend>().mockResolvedValue({ ok: true });

    const result = await backfillQueuedHandbooks(sql.fn, send, 0);

    expect(send).not.toHaveBeenCalled();
    expect(result).toEqual({ sent: 0, failed: 0, invalid: 0, skipped_duplicates: 0 });
  });
});
