// ROUTE-LEVEL eval — exercises the REAL HTTP handlers (middleware → route → engine → dev DB), not
// just the engine, so a DB/constraint error (e.g. the origin='opener' bug) returns non-200/degraded
// and FAILS the eval. Requires a running dev server with COACH_TRIAL_ENABLED=1 and the admin password:
//   ADMIN_PASSWORD=... COACH_ROUTE_EVAL=1 BASE=http://localhost:3007 npx tsx scripts/coach-route-eval.mts
// Hits the admin preview endpoints (admin Basic Auth) against the sandbox demo trial on the dev DB.
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
if (!process.env.COACH_ROUTE_EVAL) { console.log("set COACH_ROUTE_EVAL=1 (and run a dev server) to run the route eval"); process.exit(0); }
const BASE = process.env.BASE || "http://localhost:3007";
const PW = process.env.ADMIN_PASSWORD;
if (!PW) { console.error("ADMIN_PASSWORD not set"); process.exit(1); }
const AUTH = "Basic " + Buffer.from("x:" + PW).toString("base64");
const TRIAL = "fd5d006a-8905-45b3-ad58-2383bc31ca06";
const MSG = `${BASE}/api/admin/coach-preview/message`;

type Persona = { id: string; day: number; turns: string[] };
const PERSONAS: Persona[] = [
  { id: "baseline", day: 0, turns: ["I remind her once and she starts but then argues about everything", "Maybe 4 or 5 times", "ok will try tonight"] },
  { id: "didnt_work_hindi", day: 2, turns: ["It didn't work. She ignored me.", "Hindi me batao please", "theek hai"] },
  { id: "not_tried", day: 2, turns: ["Kal time hi nahi mila, bahut kaam tha", "theek hai"] },
  { id: "worked_twice", day: 3, turns: ["Sitting beside her has worked two days running, she starts calmly now", "yes that's right", "ok will do"] },
];

let failures = 0;
const fail = (persona: string, what: string) => { failures++; console.log(`  ❌ ${persona}: ${what}`); };

async function resetTrial() {
  const r = await fetch(`${BASE}/api/admin/coach-preview/reset`, { method: "POST", headers: { Authorization: AUTH, "Content-Type": "application/json" }, body: JSON.stringify({ trialId: TRIAL }) });
  if (!r.ok) throw new Error(`reset failed ${r.status}`);
}

async function opener(day: number) {
  const r = await fetch(`${MSG}?trialId=${TRIAL}&day=${day}`, { headers: { Authorization: AUTH } });
  const ct = r.headers.get("content-type") ?? "";
  const body = await r.json().catch(() => ({}));
  return { status: r.status, ct, body };
}

async function postMessage(day: number, message: string) {
  const r = await fetch(MSG, { method: "POST", headers: { Authorization: AUTH, "Content-Type": "application/json" }, body: JSON.stringify({ trialId: TRIAL, message, day }) });
  const ct = r.headers.get("content-type") ?? "";
  if (!ct.includes("ndjson")) { const j = await r.json().catch(() => ({})); return { status: r.status, ct, deltas: 0, done: null as any, json: j }; }
  const text = await r.text();
  let deltas = 0, done: any = null;
  for (const line of text.split("\n")) { if (!line.trim()) continue; try { const o = JSON.parse(line); if (typeof o.delta === "string") deltas++; if (o.done) done = o.done; } catch { /* skip */ } }
  return { status: r.status, ct, deltas, done, json: null };
}

async function main() {
  console.log(`\n######## COACH ROUTE EVAL (real HTTP handlers @ ${BASE}) ########`);
  for (const p of PERSONAS) {
    console.log(`\n--- ${p.id} (day ${p.day}) ---`);
    await resetTrial();
    // Opener GET
    const op = await opener(p.day);
    if (op.status !== 200) fail(p.id, `opener HTTP ${op.status} (expected 200)`);
    else if (op.body?.error) fail(p.id, `opener returned {error:${op.body.error}}`);
    else if (!op.body?.reply) fail(p.id, `opener had no reply`);
    else if (op.body?.degraded) fail(p.id, `opener DEGRADED (handler threw — DB/route error)`);
    else console.log(`  ✓ opener 200, reply "${String(op.body.reply).slice(0, 56)}…"`);
    // Message POSTs (streamed)
    for (const m of p.turns) {
      const res = await postMessage(p.day, m);
      if (res.status !== 200) fail(p.id, `POST "${m.slice(0, 24)}…" HTTP ${res.status}${res.json?.error ? " {error:" + res.json.error + "}" : ""}`);
      else if (!res.ct.includes("ndjson")) fail(p.id, `POST not streamed (ct=${res.ct}) json=${JSON.stringify(res.json)}`);
      else if (res.deltas < 1) fail(p.id, `POST streamed 0 deltas`);
      else if (!res.done || res.done.errored) fail(p.id, `POST done missing/errored (${JSON.stringify(res.done)})`);
      else console.log(`  ✓ POST "${m.slice(0, 24)}…" 200 ndjson ${res.deltas} deltas, done ok (msg ${String(res.done.messageId).slice(0, 8)})`);
    }
  }
  await resetTrial();
  console.log(`\n######## RESULT: ${failures === 0 ? "✓ ALL ROUTE CHECKS PASSED" : "❌ " + failures + " FAILURE(S)"} ########`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error("ROUTE EVAL ERROR:", e.message); process.exit(1); });
