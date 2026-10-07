import { describe, it, expect, vi } from "vitest";
import { sendReportWithRetry, REPORT_RETRY_BACKOFF_MS } from "@/lib/whatsapp";

const noSleep = async () => {}; // don't actually wait in tests

describe("sendReportWithRetry", () => {
  it("fails twice then succeeds → marked sent (onSent once, onFailed never)", async () => {
    let calls = 0;
    const send = vi.fn(async () => {
      calls++;
      if (calls <= 2) throw new Error("transient");
      // 3rd attempt succeeds
    });
    const onSent = vi.fn(async () => {});
    const onFailed = vi.fn(async () => {});

    const result = await sendReportWithRetry({ send, onSent, onFailed, sleep: noSleep });

    expect(result).toBe("sent");
    expect(send).toHaveBeenCalledTimes(3);
    expect(onSent).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("fails 3 times → marked failed, no throw (onFailed once, onSent never)", async () => {
    const send = vi.fn(async () => { throw new Error("down"); });
    const onSent = vi.fn(async () => {});
    const onFailed = vi.fn(async () => {});

    // Must not throw.
    const result = await sendReportWithRetry({ send, onSent, onFailed, sleep: noSleep });

    expect(result).toBe("failed");
    expect(send).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(onSent).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it("succeeds first try → one send, no retries, no backoff waits", async () => {
    const send = vi.fn(async () => {});
    const sleep = vi.fn(noSleep);
    const result = await sendReportWithRetry({ send, onSent: async () => {}, onFailed: async () => {}, sleep });
    expect(result).toBe("sent");
    expect(send).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("waits the configured backoff (2s, 8s) between attempts", async () => {
    const waits: number[] = [];
    const sleep = async (ms: number) => { waits.push(ms); };
    const send = vi.fn(async () => { throw new Error("x"); });
    await sendReportWithRetry({ send, onSent: async () => {}, onFailed: async () => {}, sleep });
    expect(waits).toEqual(REPORT_RETRY_BACKOFF_MS);
    expect(REPORT_RETRY_BACKOFF_MS).toEqual([2000, 8000]);
  });
});
