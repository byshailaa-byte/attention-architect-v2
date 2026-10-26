// Demonstrates the stall beacon + incremental flush of streamCoachTurn without the model or DB:
// an injected turn that takes 12s before its first delta. Expect a {beat} at ~10s (keeps the stream
// alive + resets the 20s client watchdog), then deltas, then {done}. Prints "+<ms>  <line>" per line.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { streamCoachTurn, type StreamDeps } from "@/lib/coach/runtime";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const args = {
  ctx: { system: "", history: [], tools: [], toolSubject: { kind: "trial", subjectId: "s1", assessmentId: null, week: 1, day: 1 }, language: "en" },
  subject: { kind: "trial", subjectId: "s1", child: "Diya", childGender: "girl" },
  userMessage: "ok", key: { kind: "trial", userId: "u1", trialId: "t1", day: 1 },
} as unknown as Parameters<typeof streamCoachTurn>[0];

const deps: StreamDeps = {
  sideEffects: false,
  persist: (async () => "mid-1") as unknown as StreamDeps["persist"],
  runTurn: (async (o: { onDelta?: (t: string) => void }) => {
    await sleep(12_000);               // 12s of "thinking" — longer than the 10s beacon interval
    o.onDelta?.("Okay — "); o.onDelta?.("let's keep it simple tonight.");
    return { text: "Okay — let's keep it simple tonight.", toolCalls: [], inputTokens: 0, outputTokens: 0, model: "demo", costPaise: 0, latencyMs: 12000, errored: false };
  }) as unknown as StreamDeps["runTurn"],
};

const resp = streamCoachTurn(args, deps);
console.log("response headers:");
for (const [k, v] of resp.headers.entries()) console.log(`  ${k}: ${v}`);
const reader = resp.body!.getReader();
const dec = new TextDecoder();
const t0 = Date.now();
let buf = "";
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let nl: number;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
    if (line.trim()) console.log(`+${String(Date.now() - t0).padStart(6)}ms  ${line}`);
  }
}
console.log(`+${String(Date.now() - t0).padStart(6)}ms  [stream closed]`);
process.exit(0);
