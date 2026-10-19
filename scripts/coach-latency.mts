// Measures time-to-first-visible-text (first {"delta"} line) on the REAL streaming route, English vs
// Hindi, N each, and reports p50/p95. English streams live; Hindi currently buffers (engine Hindi
// backstop), so this quantifies the buffer cost. Needs a running dev server + admin password.
//   ADMIN_PASSWORD=... COACH_LAT=1 BASE=http://localhost:3007 npx tsx scripts/coach-latency.mts
import * as dotenv from "dotenv"; import path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
if (!process.env.COACH_LAT) { console.log("set COACH_LAT=1"); process.exit(0); }
const BASE = process.env.BASE || "http://localhost:3007";
const AUTH = "Basic " + Buffer.from("x:" + (process.env.ADMIN_PASSWORD ?? "")).toString("base64");
const TRIAL = "fd5d006a-8905-45b3-ad58-2383bc31ca06";
const MSG = `${BASE}/api/admin/coach-preview/message`;
const N = 10;

const EN = ["she argued again about which question first", "she started but got stuck halfway", "homework was a fight again tonight", "she did okay with maths but not english", "she refused to sit down at all", "a bit better today, only argued twice", "she cried when I corrected her", "she ignored me completely", "she started on her own today", "still takes ages to begin"];
const HI = ["aaj phir argument hua maths pe", "woh baith gayi par likhna shuru nahi kiya", "aaj thoda better tha, kam zidd ki", "usne bilkul mana kar diya", "aaj usne khud shuru kiya", "homework pe phir se ladai hui", "woh ro di jab maine galti batayi", "usne meri baat hi nahi suni", "thoda sudhar hai, do baar hi argument", "shuru karne mein bahut der lagti hai"];

async function reset() { await fetch(`${BASE}/api/admin/coach-preview/reset`, { method: "POST", headers: { Authorization: AUTH, "Content-Type": "application/json" }, body: JSON.stringify({ trialId: TRIAL }) }); }

async function ttfb(message: string, day: number): Promise<number> {
  const t0 = Date.now();
  const r = await fetch(MSG, { method: "POST", headers: { Authorization: AUTH, "Content-Type": "application/json" }, body: JSON.stringify({ trialId: TRIAL, message, day }) });
  if (!r.body) return -1;
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    if (/\{"delta"/.test(buf)) { reader.cancel(); return Date.now() - t0; }
  }
  return Date.now() - t0;
}
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

async function main() {
  const en: number[] = [], hi: number[] = [];
  await reset();
  for (let i = 0; i < N; i++) { en.push(await ttfb(EN[i], 2)); process.stdout.write("."); }
  await reset();
  for (let i = 0; i < N; i++) { hi.push(await ttfb(HI[i], 2)); process.stdout.write(":"); }
  await reset();
  console.log(`\n\nTIME-TO-FIRST-VISIBLE-TEXT (ms), N=${N} each`);
  console.log(`  English (streams live):   p50=${pct(en, 50)}  p95=${pct(en, 95)}  raw=[${en.join(",")}]`);
  console.log(`  Hindi   (current path):   p50=${pct(hi, 50)}  p95=${pct(hi, 95)}  raw=[${hi.join(",")}]`);
  console.log(`  Hindi − English p50 delta: ${pct(hi, 50) - pct(en, 50)} ms  → ${pct(hi, 50) - pct(en, 50) > 2000 ? "EXCEEDS 2s → switch Hindi to stream+check-after" : "within 2s → keep buffered regen"}`);
}
main().catch((e) => { console.error("LAT ERROR:", e.message); process.exit(1); });
