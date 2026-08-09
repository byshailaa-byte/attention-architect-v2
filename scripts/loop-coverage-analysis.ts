/**
 * Loop coverage analysis — Phase 1 investigation.
 * Ranks all 32 archetype × parent_instinct cells by n.
 * Runs dimension sweep for top 5 uncovered cells.
 * Checks Rule 1/2/3 coverage gaps in quick-fixer/pusher populations.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const ARCHETYPES = [
  "The All-In Kid","The Inventor","The Explorer","The Magnet",
  "The Glue","The Captain","The Live Wire","The Storm",
];
const INSTINCTS = ["The Quick Fixer","The Pusher","The Negotiator","The Steady Hand"];

function ruleTag(arch: string, inst: string): string {
  if (inst === "The Quick Fixer") return "R1";
  if (inst === "The Pusher")      return "R2/R3";
  if (inst === "The Negotiator" && arch === "The All-In Kid") return "R4";
  return "—";
}

function pct(n: number, d: number) {
  return d === 0 ? "n/a" : (n / d * 100).toFixed(0) + "%";
}

type Row = {
  id: string;
  archetype: string;
  parent_pattern: string;
  friction: string | null;
  friction_cons: string | null;
  attn_comp: string | null;
  recharge: string | null;
  reward: string | null;
  attn_shape: string | null;
};

async function main() {
  const rows = (await sql`
    SELECT id, archetype, parent_pattern,
           dimensions->'friction_response'->>'value'       AS friction,
           dimensions->'friction_response'->>'consistency' AS friction_cons,
           dimensions->'attention_competition'->>'value'   AS attn_comp,
           dimensions->'recharge_type'->>'value'           AS recharge,
           dimensions->'reward_driver'->>'value'           AS reward,
           dimensions->'attention_shape'->>'value'         AS attn_shape
    FROM assessments WHERE archetype IS NOT NULL AND parent_pattern IS NOT NULL
  `) as unknown as Row[];

  console.log(`Total families: ${rows.length}\n`);

  // ── SECTION 1: ALL 32 CELLS RANKED ───────────────────────────────────────────
  const counts: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (!counts[r.archetype]) counts[r.archetype] = {};
    counts[r.archetype][r.parent_pattern] = (counts[r.archetype][r.parent_pattern] ?? 0) + 1;
  }

  type Cell = { arch: string; inst: string; n: number; rule: string };
  const cells: Cell[] = [];
  for (const arch of ARCHETYPES) {
    for (const inst of INSTINCTS) {
      cells.push({ arch, inst, n: counts[arch]?.[inst] ?? 0, rule: ruleTag(arch, inst) });
    }
  }
  cells.sort((a, b) => b.n - a.n);

  console.log("=== ALL 32 CELLS RANKED BY n ===");
  console.log("rank |  n | rule  | cell");
  cells.forEach((c, i) => {
    console.log(
      `${String(i + 1).padStart(3)}  | ${String(c.n).padStart(2)} | ${c.rule.padEnd(5)} | ${c.arch} × ${c.inst}`
    );
  });

  // ── SECTION 2: POPULATION BASELINES for 4 sweep dimensions ──────────────────
  const SWEEP_DIMS = ["friction", "attn_comp", "recharge", "reward"] as const;
  const DIM_LABELS: Record<string, string> = {
    friction:  "friction_response",
    attn_comp: "attention_competition",
    recharge:  "recharge_type",
    reward:    "reward_driver",
  };

  const baseline: Record<string, Record<string, number>> = {};
  for (const dim of SWEEP_DIMS) {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const v = r[dim as keyof Row] as string | null;
      if (v) c[v] = (c[v] ?? 0) + 1;
    }
    const total = Object.values(c).reduce((a, b) => a + b, 0);
    baseline[dim] = {};
    for (const [k, v] of Object.entries(c)) baseline[dim][k] = v / total;
  }

  function dimSweepLines(dim: keyof typeof DIM_LABELS, pop: Row[]): string[] {
    const c: Record<string, number> = {};
    for (const r of pop) {
      const v = r[dim as keyof Row] as string | null;
      if (v) c[v] = (c[v] ?? 0) + 1;
    }
    const n = pop.length;
    const base = baseline[dim] ?? {};
    const allVals = [...new Set([...Object.keys(c), ...Object.keys(base)])].sort();
    return allVals.map(v => {
      const obs    = c[v] ?? 0;
      const expR   = base[v] ?? 0;
      const expCt  = expR * n;
      const rowsDiff = n > 0 ? ((obs - expCt) / Math.sqrt(Math.max(n, 1))).toFixed(1) : "n/a";
      const flag   = Math.abs(obs - expCt) >= 1.5 && n >= 2 ? " ←SIGNAL" : "";
      return `    ${v.padEnd(32)} obs=${String(obs).padStart(2)}/${n} (${pct(obs, n).padStart(4)}) exp=${expCt.toFixed(1).padStart(5)} (${(expR*100).toFixed(0).padStart(3)}%) rows_diff=${rowsDiff}${flag}`;
    });
  }

  // ── SECTION 3: TOP 5 UNCOVERED CELLS — dimension sweep ───────────────────────
  const TARGET_CELLS: [string, string][] = [
    ["The Inventor",  "The Steady Hand"],
    ["The Inventor",  "The Negotiator"],
    ["The Explorer",  "The Steady Hand"],
    ["The Glue",      "The Negotiator"],
    ["The Captain",   "The Steady Hand"],
  ];

  console.log("\n\n=== TOP 5 UNCOVERED CELLS — DIMENSION SWEEP ===");

  for (const [arch, inst] of TARGET_CELLS) {
    const cell = rows.filter(r => r.archetype === arch && r.parent_pattern === inst);
    console.log(`\n${"═".repeat(72)}`);
    console.log(`CELL: ${arch} × ${inst}   n=${cell.length}`);
    if (cell.length === 0) {
      console.log("  (no data — zero families in this dataset)");
      continue;
    }

    for (const dim of SWEEP_DIMS) {
      console.log(`\n  [${DIM_LABELS[dim]}]`);
      dimSweepLines(dim, cell).forEach(l => console.log(l));
    }

    // attention_shape distribution within cell (cross-check)
    const shapeCounts: Record<string, number> = {};
    for (const r of cell) {
      if (r.attn_shape) shapeCounts[r.attn_shape] = (shapeCounts[r.attn_shape] ?? 0) + 1;
    }
    console.log(`\n  [attention_shape in cell — cross-check only]`);
    for (const [k, v] of Object.entries(shapeCounts).sort(([,a],[,b]) => b-a)) {
      console.log(`    ${k.padEnd(32)} n=${v}/${cell.length} (${pct(v, cell.length)})`);
    }
  }

  // ── SECTION 4: RULE 1 COVERAGE — quick-fixer gaps ────────────────────────────
  console.log(`\n\n${"═".repeat(72)}`);
  console.log("RULE 1 COVERAGE — quick-fixer population, per-family loop status proxy");

  const qf = rows.filter(r => r.parent_pattern === "The Quick Fixer");
  console.log(`Quick-fixer total: ${qf.length}`);

  // Rule 1 fires when evidence_tier=hypothesis OR friction=solo-push.
  // We proxy evidence_tier from friction_cons: cons < 0.6 → likely hypothesis.
  // Note: actual BG builds evidence_tier from full HDG; this is an approximation.
  let r1Fires = 0, r1NoLoop = 0;
  const noLoopQF: Row[] = [];
  for (const r of qf) {
    const cons   = parseFloat(r.friction_cons ?? "1");
    const fires  = r.friction === "solo-push" || cons < 0.6;
    if (fires) r1Fires++;
    else { r1NoLoop++; noLoopQF.push(r); }
  }
  console.log(`  Rule 1 likely fires: ${r1Fires} (${pct(r1Fires, qf.length)})`);
  console.log(`  Falls to noLoop:     ${r1NoLoop} (${pct(r1NoLoop, qf.length)})`);
  if (noLoopQF.length > 0) {
    console.log(`\n  noLoop quick-fixer families (archetype / friction / cons):`);
    for (const r of noLoopQF) {
      console.log(`    ${r.archetype.padEnd(18)} friction=${String(r.friction).padEnd(14)} cons=${r.friction_cons ?? "?"}`);
    }

    // Dimension profile of the noLoop QF sub-pop
    console.log(`\n  Dimension profile of noLoop quick-fixer sub-population (n=${noLoopQF.length}):`);
    for (const dim of SWEEP_DIMS) {
      console.log(`  [${DIM_LABELS[dim]}]`);
      dimSweepLines(dim, noLoopQF).forEach(l => console.log(l));
    }
  }

  // ── SECTION 5: RULE 2/3 COVERAGE — pusher gaps ───────────────────────────────
  console.log(`\n${"═".repeat(72)}`);
  console.log("RULE 2/3 COVERAGE — pusher population, per-family loop status proxy");

  const push = rows.filter(r => r.parent_pattern === "The Pusher");
  console.log(`Pusher total: ${push.length}`);

  // R2 needs: reward=mastery + D2.3 node (can't check D2.3 without HDG; mastery is necessary)
  // R3 needs: reward=autonomy + friction=avoid
  // Anything else → noLoop (approximation — R2 also needs D2.3 which may be absent)
  let r2Fires = 0, r3Fires = 0, pushNoLoop = 0;
  const noLoopPush: Row[] = [];
  for (const r of push) {
    const couldR2 = r.reward === "mastery"; // D2.3 also required — counted as "could fire"
    const r3      = r.reward === "autonomy" && r.friction === "avoid";
    if (couldR2 || r3) {
      if (couldR2) r2Fires++;
      if (r3)      r3Fires++;
    } else {
      pushNoLoop++;
      noLoopPush.push(r);
    }
  }
  console.log(`  Rule 2 eligible (reward=mastery, D2.3 needed to confirm): ${r2Fires} (${pct(r2Fires, push.length)})`);
  console.log(`  Rule 3 fires (reward=autonomy + friction=avoid):           ${r3Fires} (${pct(r3Fires, push.length)})`);
  console.log(`  Falls to noLoop (neither condition):                        ${pushNoLoop} (${pct(pushNoLoop, push.length)})`);
  if (noLoopPush.length > 0) {
    console.log(`\n  noLoop pusher families:`);
    for (const r of noLoopPush) {
      console.log(`    ${r.archetype.padEnd(18)} reward=${String(r.reward).padEnd(14)} friction=${r.friction ?? "?"}`);
    }

    // Dimension profile
    console.log(`\n  Dimension profile of noLoop pusher sub-population (n=${noLoopPush.length}):`);
    for (const dim of SWEEP_DIMS) {
      console.log(`  [${DIM_LABELS[dim]}]`);
      dimSweepLines(dim, noLoopPush).forEach(l => console.log(l));
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
