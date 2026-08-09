/**
 * Two tasks:
 * 1. Run actual buildFamilyAttentionLoop on every family → real firing rates per cell.
 * 2. Pull HDG node-level data for the 5 support-seek × pusher families.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildHdg }                from "../lib/graph/hdg";
import { buildBehaviourGraph }      from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature }  from "../lib/graph/signature";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";

const sql = neon(process.env.DATABASE_URL!);

const ARCHETYPES = [
  "The All-In Kid","The Inventor","The Explorer","The Magnet",
  "The Glue","The Captain","The Live Wire","The Storm",
];
const INSTINCTS = ["The Quick Fixer","The Pusher","The Negotiator","The Steady Hand"];

// Rule coverage in principle (has a rule that CAN apply for this instinct)
function ruleTag(arch: string, inst: string): string {
  if (inst === "The Quick Fixer") return "R1";
  if (inst === "The Pusher")      return "R2/R3";
  if (inst === "The Negotiator" && arch === "The All-In Kid") return "R4";
  return "—";
}

async function main() {
  const rows = (await sql`
    SELECT id, archetype, parent_pattern, answers,
           dimensions->'friction_response'->>'value' AS friction
    FROM assessments
    WHERE archetype IS NOT NULL AND parent_pattern IS NOT NULL
  `) as unknown as {
    id: string;
    archetype: string;
    parent_pattern: string;
    answers: Record<string, string>;
    friction: string | null;
  }[];

  console.log(`Total families: ${rows.length}\n`);

  // ── TASK 1: run actual loop detection on every family ─────────────────────────
  type CellData = { rule: string; total: number; fired: number; ruleLabel: string };
  const cellMap: Map<string, CellData> = new Map();

  // Initialize all 32 cells
  for (const arch of ARCHETYPES) {
    for (const inst of INSTINCTS) {
      const key = `${arch}|||${inst}`;
      cellMap.set(key, { rule: ruleTag(arch, inst), total: 0, fired: 0, ruleLabel: ruleTag(arch, inst) });
    }
  }

  // Track per-family results for HDG analysis
  const familyResults: { id: string; arch: string; inst: string; friction: string | null; fired: boolean; mechanism: string | null }[] = [];

  for (const row of rows) {
    const answers = row.answers ?? {};
    let fired = false;
    let mechanism: string | null = null;

    try {
      const hdg  = buildHdg(answers);
      const bg   = buildBehaviourGraph(hdg);
      const sig  = buildBehaviourSignature(hdg, bg);
      const loop = buildFamilyAttentionLoop(hdg, bg, sig);
      fired     = loop.detected;
      mechanism = loop.loop_tension_point?.mechanism ?? null;
    } catch {
      // answers may be incomplete — treat as noLoop
    }

    const key = `${row.archetype}|||${row.parent_pattern}`;
    const cell = cellMap.get(key);
    if (cell) {
      cell.total++;
      if (fired) cell.fired++;
    }

    familyResults.push({ id: row.id, arch: row.archetype, inst: row.parent_pattern, friction: row.friction, fired, mechanism });
  }

  // Build ranked cell list with actual firing rate
  type CellRow = { arch: string; inst: string; n: number; fired: number; rule: string };
  const cells: CellRow[] = [];
  for (const [key, data] of cellMap.entries()) {
    const [arch, inst] = key.split("|||");
    cells.push({ arch, inst, n: data.total, fired: data.fired, rule: data.rule });
  }
  cells.sort((a, b) => b.n - a.n || b.fired - a.fired);

  console.log("=== ALL 32 CELLS: n, rule coverage, ACTUAL firing rate ===");
  console.log("rank |  n | fired | fired% | has_rule | cell");
  cells.forEach((c, i) => {
    const firedPct = c.n === 0 ? " n/a" : `${(c.fired / c.n * 100).toFixed(0).padStart(3)}%`;
    const ruleLabel = c.rule === "—" ? "none   " : `${c.rule.padEnd(5)}  `;
    const firingNote = c.rule !== "—" && c.n > 0 && c.fired === 0
      ? " ← rule exists but 0 fire"
      : "";
    console.log(
      `${String(i + 1).padStart(3)}  | ${String(c.n).padStart(2)} | ${String(c.fired).padStart(5)} | ${firedPct}  | ${ruleLabel} | ${c.arch} × ${c.inst}${firingNote}`
    );
  });

  // ── TASK 2: HDG node-level for the 5 support-seek × pusher families ──────────
  const targetFamilies = familyResults.filter(
    r => r.inst === "The Pusher" && r.friction === "support-seek"
  );

  console.log(`\n\n${"═".repeat(78)}`);
  console.log(`SUPPORT-SEEK × PUSHER FAMILIES — HDG node-level decision data`);
  console.log(`n = ${targetFamilies.length} families\n`);

  // Pull answers for each
  const targetIds = targetFamilies.map(f => f.id);
  const detailRows = (await sql`
    SELECT id, archetype, parent_pattern, child_name, answers
    FROM assessments WHERE id = ANY(${targetIds}::uuid[])
  `) as unknown as {
    id: string;
    archetype: string;
    parent_pattern: string;
    child_name: string | null;
    answers: Record<string, string>;
  }[];

  // HDG node IDs relevant to this interaction
  const FRICTION_QUESTION_IDS = new Set(["D3.1","D3.2","D3.3","D3.confirm"]);
  const PARENT_QUESTION_IDS   = new Set(["G3","P1","P2"]);
  const ALL_RELEVANT           = new Set([...FRICTION_QUESTION_IDS, ...PARENT_QUESTION_IDS, "G1","G2"]);

  for (const row of detailRows) {
    const family = targetFamilies.find(f => f.id === row.id)!;
    const answers = row.answers ?? {};

    let hdgNodes: { source_question: string; choice: string; trigger: string; actor: string }[] = [];
    let frictionSignalValue: string | null = null;
    let piSignalValue: string | null = null;

    try {
      const hdg = buildHdg(answers);
      const bg  = buildBehaviourGraph(hdg);

      hdgNodes = hdg.nodes.map(n => ({
        source_question: n.source_question,
        choice:  n.choice ?? "(no choice recorded)",
        trigger: n.trigger ?? "",
        actor:   n.actor ?? "child",
      }));

      frictionSignalValue = bg.signal_nodes.find(n => n.dimension === "friction_response")?.value ?? null;
      piSignalValue       = bg.signal_nodes.find(n => n.dimension === "parent_instinct")?.value ?? null;
    } catch {
      hdgNodes = [];
    }

    console.log(`─`.repeat(78));
    console.log(`Family: ${row.child_name ?? "(no name)"} | archetype=${row.archetype}`);
    console.log(`  BG signals: friction_response=${frictionSignalValue}  parent_instinct=${piSignalValue}`);
    console.log(`  Loop fired: ${family.fired} (mechanism: ${family.mechanism ?? "none"})\n`);

    // Parent instinct nodes
    console.log(`  PARENT NODES (G3 / P1 / P2):`);
    const parentNodes = hdgNodes.filter(n => PARENT_QUESTION_IDS.has(n.source_question));
    if (parentNodes.length === 0) {
      console.log(`    (none found in HDG)`);
    } else {
      for (const n of parentNodes) {
        console.log(`    [${n.source_question}] trigger="${n.trigger}"`);
        console.log(`          choice="${n.choice}"`);
      }
    }

    // Child friction nodes
    console.log(`\n  CHILD FRICTION NODES (D3.1 / D3.2 / D3.3 / D3.confirm):`);
    const frictionNodes = hdgNodes.filter(n => FRICTION_QUESTION_IDS.has(n.source_question));
    if (frictionNodes.length === 0) {
      console.log(`    (none found in HDG)`);
    } else {
      for (const n of frictionNodes) {
        console.log(`    [${n.source_question}] trigger="${n.trigger}"`);
        console.log(`          choice="${n.choice}"`);
      }
    }

    // Cross-reference: do G3 trigger and D3.x trigger describe the same moment?
    const g3 = parentNodes.find(n => n.source_question === "G3");
    const d3Main = frictionNodes.find(n => n.source_question === "D3.1" || n.source_question === "D3.2");
    if (g3 && d3Main) {
      const sameWindow = g3.trigger.toLowerCase().includes("stuck") || g3.trigger.toLowerCase().includes("struggling");
      const childSignals = d3Main.choice.toLowerCase().includes("help") || d3Main.choice.toLowerCase().includes("support") || d3Main.choice.toLowerCase().includes("someone");
      const parentPushes = g3.choice.toLowerCase().includes("push") || g3.choice.toLowerCase().includes("keep trying") || g3.choice.toLowerCase().includes("own");
      console.log(`\n  INTERACTION CHECK:`);
      console.log(`    Same trigger window (G3 fires when child stuck): ${sameWindow}`);
      console.log(`    Child signals for help at same moment:           ${childSignals}`);
      console.log(`    Parent response is to push to do-it-alone:      ${parentPushes}`);
      console.log(`    Direct conflict at decision level:               ${sameWindow && childSignals && parentPushes}`);
    }

    // Raw answer key-values for full transparency
    console.log(`\n  RAW ANSWERS (D3.x / G3 / P1 / P2):`);
    for (const [qId, val] of Object.entries(answers).sort()) {
      const base = qId.split(":")[0];
      if (ALL_RELEVANT.has(base) || ALL_RELEVANT.has(qId)) {
        console.log(`    ${qId.padEnd(20)} = "${val}"`);
      }
    }
    console.log();
  }

  // Summary: all 10 pusher families for completeness
  console.log(`${"═".repeat(78)}`);
  console.log(`ALL PUSHER FAMILIES — friction × reward × loop status`);
  const pusherFamilies = familyResults.filter(r => r.inst === "The Pusher");
  console.log(`n=${pusherFamilies.length}\n`);
  for (const f of pusherFamilies) {
    const row = rows.find(r => r.id === f.id)!;
    const reward = (row as any).reward ?? null; // not in this query — will show undefined
    console.log(`  ${f.arch.padEnd(18)} friction=${String(f.friction).padEnd(14)} fired=${f.fired} mechanism=${f.mechanism ?? "none"}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
