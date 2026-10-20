import { describe, it, expect } from "vitest";
import { streamCoachTurn, type StreamDeps } from "@/lib/coach/runtime";
import type { RunResult } from "@/lib/coach/engine";

// The streamed Coach MUST always deliver a terminal {done} (or a clean error) — never an endless
// spinner — and must do so inside the turn budget. These tests drive streamCoachTurn with injected
// runners (no model, no DB) so the invariant is deterministic. Mirrors the prod incident where a
// stalled turn left the client spinning with no {done}.

function fakeResult(text: string): RunResult {
  return { text, toolCalls: [], inputTokens: 0, outputTokens: 0, model: "test", costPaise: 0, latencyMs: 1, errored: false };
}

// Minimal args; ctx/subject only need the fields repeatGuardFor/hindiGuardFor read.
function makeArgs(userMessage: string) {
  return {
    ctx: { system: "", history: [], tools: [], toolSubject: { kind: "trial", subjectId: "s1", assessmentId: null, week: 1, day: 1 }, language: "en" },
    subject: { kind: "trial", subjectId: "s1", child: "Diya", childGender: "girl" },
    userMessage,
    key: { kind: "trial", userId: "u1", trialId: "t1", day: 1 },
  } as unknown as Parameters<typeof streamCoachTurn>[0];
}

// Read the NDJSON Response to completion; return the deltas, the {done} payload (or null), and timing.
async function drain(resp: Response) {
  const reader = resp.body!.getReader();
  const dec = new TextDecoder();
  const t0 = Date.now();
  let buf = "", doneAt = -1;
  const deltas: string[] = [];
  let done: Record<string, unknown> | null = null;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    buf += dec.decode(r.value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line) continue;
      const obj = JSON.parse(line);
      if (typeof obj.delta === "string") deltas.push(obj.delta);
      else if (obj.done) { done = obj.done; doneAt = Date.now() - t0; }
    }
  }
  return { deltas, done, doneAt, totalMs: Date.now() - t0 };
}

const noPersist: StreamDeps["persist"] = async () => "mid-1";

describe("streamCoachTurn — always terminates with {done}, within budget", () => {
  it("fast turn: streams the delta then a {done} with the messageId, well under 20s", async () => {
    const deps: StreamDeps = {
      sideEffects: false, persist: noPersist,
      runTurn: (async (o: { onDelta?: (t: string) => void }) => { o.onDelta?.("hi"); return fakeResult("hi"); }) as unknown as StreamDeps["runTurn"],
    };
    const out = await drain(streamCoachTurn(makeArgs("ok"), deps));
    expect(out.deltas.join("")).toBe("hi");
    expect(out.done).not.toBeNull();
    expect(out.done!.messageId).toBe("mid-1");
    expect(out.done!.errored).toBe(false);
    expect(out.doneAt).toBeLessThan(20_000); // FAILS if a turn takes >20s to done
  });

  it("stalled turn: a hung runner still yields a terminal {done:errored} inside the budget (never endless)", async () => {
    const deps: StreamDeps = {
      sideEffects: false, persist: noPersist, budgetMs: 200,
      runTurn: (() => new Promise(() => {})) as unknown as StreamDeps["runTurn"], // never resolves
    };
    const out = await drain(streamCoachTurn(makeArgs("ok"), deps));
    expect(out.done).not.toBeNull();            // FAILS if the stream ends without a done
    expect(out.done!.errored).toBe(true);
    expect(out.doneAt).toBeLessThan(5_000);     // forced done fires at ~budgetMs, not the function limit
  });

  it("throwing turn: a runner that throws still yields {done:errored}", async () => {
    const deps: StreamDeps = {
      sideEffects: false, persist: noPersist,
      runTurn: (() => { throw new Error("boom"); }) as unknown as StreamDeps["runTurn"],
    };
    const out = await drain(streamCoachTurn(makeArgs("ok"), deps));
    expect(out.done).not.toBeNull();
    expect(out.done!.errored).toBe(true);
  });

  it("slow post-generation work cannot withhold {done}: persist that hangs is time-boxed", async () => {
    const deps: StreamDeps = {
      sideEffects: false, budgetMs: 60_000,
      persist: (() => new Promise(() => {})) as unknown as StreamDeps["persist"], // hangs forever
      runTurn: (async (o: { onDelta?: (t: string) => void }) => { o.onDelta?.("hi"); return fakeResult("hi"); }) as unknown as StreamDeps["runTurn"],
    };
    // POST_BUDGET_MS (12s) caps the hung persist; done still arrives. Keep well under that here would
    // require lowering the constant — instead assert it arrives at all and is not missing.
    const out = await drain(streamCoachTurn(makeArgs("tell me what to do"), deps));
    expect(out.deltas.join("")).toBe("hi");
    expect(out.done).not.toBeNull();
  }, 20_000);
});
