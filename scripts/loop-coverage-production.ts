/**
 * Full-corpus deduplication + loop coverage analysis against production branch.
 * READ ONLY — never writes to the production branch.
 * Run with ANALYTICS_DB_URL set to the analysis branch connection string.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildHdg }                from "../lib/graph/hdg";
import { buildBehaviourGraph }      from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature }  from "../lib/graph/signature";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";

const ANALYTICS_DB_URL = process.env.ANALYTICS_DB_URL;
if (!ANALYTICS_DB_URL) {
  console.error("ANALYTICS_DB_URL required");
  process.exit(1);
}
const sql = neon(ANALYTICS_DB_URL);

const ARCHETYPES = [
  "The All-In Kid","The Inventor","The Explorer","The Magnet",
  "The Glue","The Captain","The Live Wire","The Storm",
];
const INSTINCTS = ["The Quick Fixer","The Pusher","The Negotiator","The Steady Hand"];
const SWEEP_DIMS = ["friction","attn_comp","recharge","reward"] as const;
const DIM_LABELS: Record<string, string> = {
  friction:  "friction_response",
  attn_comp: "attention_competition",
  recharge:  "recharge_type",
  reward:    "reward_driver",
};
const FRICTION_QS = new Set(["D3.1","D3.2","D3.3","D3.confirm"]);
const PARENT_QS   = new Set(["G3","P1","P2"]);

function ruleTag(arch: string, inst: string): string {
  if (inst === "The Quick Fixer") return "R1";
  if (inst === "The Pusher")      return "R2/R3";
  if (inst === "The Negotiator" && arch === "The All-In Kid") return "R4";
  return "—";
}
function pct(n: number, d: number) { return d === 0 ? "n/a" : `${(n/d*100).toFixed(0)}%`; }

type Row = {
  id: string; session_id: string; child_name: string | null; parent_name: string;
  archetype: string; parent_pattern: string;
  answers: Record<string,string>;
  friction: string|null; friction_cons: string|null;
  attn_comp: string|null; recharge: string|null; reward: string|null; attn_shape: string|null;
};

async function main() {
  // ── Read all production rows ──────────────────────────────────────────────────
  const raw = (await sql`
    SELECT id, session_id, child_name, parent_name, archetype, parent_pattern, answers,
           dimensions->'friction_response'->>'value'       AS friction,
           dimensions->'friction_response'->>'consistency' AS friction_cons,
           dimensions->'attention_competition'->>'value'   AS attn_comp,
           dimensions->'recharge_type'->>'value'           AS recharge,
           dimensions->'reward_driver'->>'value'           AS reward,
           dimensions->'attention_shape'->>'value'         AS attn_shape
    FROM assessments
    WHERE archetype IS NOT NULL AND parent_pattern IS NOT NULL
    ORDER BY created_at
  `) as unknown as Row[];

  console.log(`Production rows (archetype+parent_pattern): ${raw.length}`);

  // ── Deduplication ─────────────────────────────────────────────────────────────
  // Step 1: dedupe by session_id — one row per session
  const bySession = new Map<string, Row>();
  for (const r of raw) {
    if (!bySession.has(r.session_id)) bySession.set(r.session_id, r);
  }
  const afterSessionDedupe = [...bySession.values()];
  console.log(`After session_id dedupe: ${afterSessionDedupe.length} (removed ${raw.length - afterSessionDedupe.length})`);

  // Step 2: content-fingerprint dedupe on remaining (catches same-person, different session)
  const byFp = new Map<string, Row>();
  for (const r of afterSessionDedupe) {
    const fp = JSON.stringify(Object.entries(r.answers ?? {}).sort());
    if (!byFp.has(fp)) byFp.set(fp, r);
  }
  const distinct = [...byFp.values()];
  console.log(`After content-fingerprint dedupe: ${distinct.length} (removed ${afterSessionDedupe.length - distinct.length})`);
  console.log(`Final distinct families: ${distinct.length}\n`);

  // ── Run actual loop detection ─────────────────────────────────────────────────
  type Family = {
    row: Row; fired: boolean; mechanism: string|null;
    frictionBg: string|null; piSignal: string|null;
    hdgNodes: { qid: string; trigger: string; choice: string }[];
  };

  const families: Family[] = [];
  for (const row of distinct) {
    let fired = false; let mechanism: string|null = null;
    let frictionBg: string|null = null; let piSignal: string|null = null;
    let hdgNodes: Family["hdgNodes"] = [];
    try {
      const hdg  = buildHdg(row.answers ?? {});
      const bg   = buildBehaviourGraph(hdg);
      const sig  = buildBehaviourSignature(hdg, bg);
      const loop = buildFamilyAttentionLoop(hdg, bg, sig);
      fired     = loop.detected;
      mechanism = loop.loop_tension_point?.mechanism ?? null;
      frictionBg = bg.signal_nodes.find(n => n.dimension === "friction_response")?.value ?? null;
      piSignal   = bg.signal_nodes.find(n => n.dimension === "parent_instinct")?.value   ?? null;
      hdgNodes   = hdg.nodes.map(n => ({ qid: n.source_question, trigger: n.trigger ?? "", choice: n.choice ?? "" }));
    } catch { /* skip incomplete */ }
    families.push({ row, fired, mechanism, frictionBg, piSignal, hdgNodes });
  }

  // ── Cell map ──────────────────────────────────────────────────────────────────
  type CellData = { n: number; fired: number; rule: string };
  const cellMap = new Map<string, CellData>();
  for (const arch of ARCHETYPES)
    for (const inst of INSTINCTS)
      cellMap.set(`${arch}|||${inst}`, { n: 0, fired: 0, rule: ruleTag(arch, inst) });

  for (const f of families) {
    const key = `${f.row.archetype}|||${f.row.parent_pattern}`;
    const cell = cellMap.get(key);
    if (cell) { cell.n++; if (f.fired) cell.fired++; }
  }

  const cells = [...cellMap.entries()].map(([key, d]) => {
    const [arch, inst] = key.split("|||");
    return { arch, inst, ...d };
  }).sort((a, b) => b.n - a.n || b.fired - a.fired);

  // ── Print 32-cell table ───────────────────────────────────────────────────────
  console.log("=== ALL 32 CELLS — production, deduped, actual firing rates ===");
  console.log("rank |   n | fired | fired% | has_rule | cell");
  cells.forEach((c, i) => {
    const firedPct = c.n === 0 ? " n/a" : `${pct(c.fired, c.n).padStart(4)}`;
    const ruleNote = c.rule !== "—" && c.n > 0 && c.fired === 0 ? " ← rule, 0 fire" : "";
    const ruleNote2 = c.rule !== "—" && c.n > 0 && c.fired > 0 && c.fired < c.n ? ` ← ${c.fired}/${c.n} fire` : "";
    console.log(
      `${String(i+1).padStart(3)}  | ${String(c.n).padStart(3)} | ${String(c.fired).padStart(5)} | ${firedPct}  | ${c.rule.padEnd(5)}    | ${c.arch} × ${c.inst}${ruleNote}${ruleNote2}`
    );
  });

  // ── Population baselines for sweep ───────────────────────────────────────────
  const baseline: Record<string, Record<string,number>> = {};
  for (const dim of SWEEP_DIMS) {
    const c: Record<string,number> = {};
    for (const f of families) {
      const v = f.row[dim as keyof Row] as string|null;
      if (v) c[v] = (c[v]??0)+1;
    }
    const tot = Object.values(c).reduce((a,b)=>a+b,0);
    baseline[dim] = {};
    for (const [k,v] of Object.entries(c)) baseline[dim][k] = v/tot;
  }

  function dimLines(dim: keyof typeof DIM_LABELS, pop: Family[]): string[] {
    const c: Record<string,number> = {};
    for (const f of pop) {
      const v = f.row[dim as keyof Row] as string|null;
      if (v) c[v] = (c[v]??0)+1;
    }
    const n = pop.length;
    const base = baseline[dim]??{};
    return [...new Set([...Object.keys(c),...Object.keys(base)])].sort().map(v => {
      const obs   = c[v]??0;
      const expR  = base[v]??0;
      const expCt = expR*n;
      const rd    = n>0 ? ((obs-expCt)/Math.sqrt(Math.max(n,1))).toFixed(2) : "n/a";
      const flag  = Math.abs(obs-expCt)>=1.5 && n>=3 ? " ←" : "";
      return `    ${v.padEnd(28)} obs=${String(obs).padStart(3)}/${n} (${pct(obs,n).padStart(4)}) exp=${expCt.toFixed(1).padStart(6)} (${(expR*100).toFixed(0).padStart(3)}%) rows_diff=${rd}${flag}`;
    });
  }

  // ── Re-check BORDERLINE FINDINGS from prior rounds ────────────────────────────
  console.log(`\n\n${"═".repeat(78)}`);
  console.log("RE-CHECK: BORDERLINE/SIGNAL FINDINGS vs CLEAN PRODUCTION DATA\n");

  // Finding 1: Pusher support-seek friction elevation (dev: 5/10=50% vs 17%, rows_diff=1.0)
  const pushers = families.filter(f => f.row.parent_pattern === "The Pusher");
  const pushNoLoop = pushers.filter(f => !f.fired);
  console.log(`── PUSHER POPULATION  n=${pushers.length} (${pushNoLoop.length} noLoop, ${pushers.filter(f=>f.fired).length} fired)\n`);
  console.log(`  [friction_response]`);
  dimLines("friction", pushers).forEach(l => console.log(l));
  console.log(`\n  [friction_response — noLoop sub-pop only, n=${pushNoLoop.length}]`);
  dimLines("friction", pushNoLoop).forEach(l => console.log(l));

  // Finding 2: Pusher sensory-quiet suppression (dev: 1/10=10% vs 52%, rows_diff=-1.3)
  console.log(`\n  [recharge_type — noLoop pushers, n=${pushNoLoop.length}]`);
  dimLines("recharge", pushNoLoop).forEach(l => console.log(l));
  console.log(`\n  [reward_driver — pushers, n=${pushers.length}]`);
  dimLines("reward", pushers).forEach(l => console.log(l));
  console.log(`\n  [attention_competition — pushers, n=${pushers.length}]`);
  dimLines("attn_comp", pushers).forEach(l => console.log(l));

  // Finding 3: Inventor × Steady Hand attention_competition=internal elevation (dev: 2/4=50% vs 12%, rows_diff=0.8)
  const invSH = families.filter(f => f.row.archetype === "The Inventor" && f.row.parent_pattern === "The Steady Hand");
  console.log(`\n${"─".repeat(78)}`);
  console.log(`── INVENTOR × STEADY HAND  n=${invSH.length}\n`);
  if (invSH.length > 0) {
    for (const dim of SWEEP_DIMS) {
      console.log(`  [${DIM_LABELS[dim]}]`);
      dimLines(dim, invSH).forEach(l => console.log(l));
    }
  } else console.log(`  (no families in production)`);

  // Finding 4: Inventor × Negotiator sensory-quiet suppression (dev: 0/3, rows_diff=-0.9)
  const invNeg = families.filter(f => f.row.archetype === "The Inventor" && f.row.parent_pattern === "The Negotiator");
  console.log(`\n${"─".repeat(78)}`);
  console.log(`── INVENTOR × NEGOTIATOR  n=${invNeg.length}\n`);
  if (invNeg.length > 0) {
    for (const dim of SWEEP_DIMS) {
      console.log(`  [${DIM_LABELS[dim]}]`);
      dimLines(dim, invNeg).forEach(l => console.log(l));
    }
  } else console.log(`  (no families in production)`);

  // ── Support-seek × Pusher: HDG node level on production ──────────────────────
  const pushSS = pushers.filter(f => f.frictionBg === "support-seek");
  console.log(`\n${"═".repeat(78)}`);
  console.log(`SUPPORT-SEEK × PUSHER FAMILIES — raw HDG values  n=${pushSS.length}\n`);

  for (const f of pushSS) {
    const parentNodes  = f.hdgNodes.filter(n => PARENT_QS.has(n.qid));
    const frictionNodes = f.hdgNodes.filter(n => FRICTION_QS.has(n.qid));
    console.log(`  ${f.row.child_name ?? "?"} / ${f.row.parent_name} — ${f.row.archetype}`);
    const g3 = parentNodes.find(n=>n.qid==="G3");
    const p1 = parentNodes.find(n=>n.qid==="P1");
    const p2 = parentNodes.find(n=>n.qid==="P2");
    if (g3) console.log(`    G3: "${g3.choice}"`);
    if (p1) console.log(`    P1: "${p1.choice}"`);
    if (p2) console.log(`    P2: "${p2.choice}"`);
    for (const n of frictionNodes) {
      console.log(`    ${n.qid}: "${n.choice}"`);
    }
    const d31 = frictionNodes.find(n=>n.qid==="D3.1");
    const conflict = g3?.choice.includes("push") && d31?.choice.includes("help");
    console.log(`    same-window conflict: ${conflict ?? "n/a (D3.1 absent)"}`);
    console.log();
  }

  // ── Rule 1 gap: quick-fixer families NOT firing ───────────────────────────────
  const qf = families.filter(f => f.row.parent_pattern === "The Quick Fixer");
  const qfNoLoop = qf.filter(f => !f.fired);
  console.log(`${"═".repeat(78)}`);
  console.log(`QUICK-FIXER POPULATION  n=${qf.length}  fired=${qf.filter(f=>f.fired).length}  noLoop=${qfNoLoop.length}\n`);
  console.log(`  friction_response distribution (all QF):`);
  dimLines("friction", qf).forEach(l => console.log(l));
  if (qfNoLoop.length > 0) {
    console.log(`\n  noLoop quick-fixer families:`);
    for (const f of qfNoLoop) {
      const g3 = f.hdgNodes.find(n=>n.qid==="G3");
      console.log(`    ${f.row.archetype.padEnd(18)} friction=${String(f.frictionBg).padEnd(14)} g3="${g3?.choice ?? "?"}"`);
    }
  }

  // ── Summary counts ────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(78)}`);
  console.log(`SUMMARY`);
  console.log(`  Raw production rows:          ${raw.length}`);
  console.log(`  After session_id dedupe:       ${afterSessionDedupe.length}`);
  console.log(`  After content-fp dedupe:       ${distinct.length}`);
  console.log(`  Families with loop detected:   ${families.filter(f=>f.fired).length}`);
  console.log(`  Families without loop:         ${families.filter(f=>!f.fired).length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
