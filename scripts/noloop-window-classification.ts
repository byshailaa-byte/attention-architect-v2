/**
 * Classifies every noLoop family in production by friction_response trigger-window pattern.
 * Question: is "diffuse coping" (multi-window friction sources) a structural gap across the
 * uncovered corpus, or a contained artifact of the QF × emotional-derail population?
 *
 * Window classification for friction_response source nodes:
 *   same-window   — D3.1 and/or D3.2 only (no D3.3): friction at first contact, same moment as G3
 *   later-window  — D3.3 only (no D3.1/D3.2): friction after failure, later than G3
 *   multi-window  — D3.1/D3.2 AND D3.3 both present: diffuse, spans both moments
 *   confirm-only  — D3.confirm only: general disposition, timing indeterminate
 *   unknown       — no friction source nodes identifiable in HDG
 *
 * Dedup: session_id → content-fingerprint, same as loop-coverage-production.ts.
 * Production branch read-only via ANALYTICS_DB_URL.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildHdg }                from "../lib/graph/hdg";
import { buildBehaviourGraph }      from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature }  from "../lib/graph/signature";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";

const ANALYTICS_DB_URL = process.env.ANALYTICS_DB_URL;
if (!ANALYTICS_DB_URL) { console.error("ANALYTICS_DB_URL required"); process.exit(1); }
const sql = neon(ANALYTICS_DB_URL);

type WindowClass = "same-window" | "later-window" | "multi-window" | "confirm-only" | "unknown";

function classifyWindow(sourceQIds: string[]): WindowClass {
  const hasSame  = sourceQIds.some(q => q === "D3.1" || q === "D3.2");
  const hasLater = sourceQIds.some(q => q === "D3.3");
  const hasConf  = sourceQIds.some(q => q === "D3.confirm");
  if (hasSame && hasLater) return "multi-window";
  if (hasSame)             return "same-window";
  if (hasLater)            return "later-window";
  if (hasConf)             return "confirm-only";
  return "unknown";
}

function pct(n: number, d: number) {
  return d === 0 ? "n/a" : `${(n / d * 100).toFixed(0)}%`;
}

async function main() {
  // ── Pull all production rows ───────────────────────────────────────────────
  const raw = (await sql`
    SELECT id, session_id, child_name, parent_name, archetype, parent_pattern, answers
    FROM assessments
    WHERE archetype IS NOT NULL AND parent_pattern IS NOT NULL
    ORDER BY created_at
  `) as unknown as {
    id: string; session_id: string;
    child_name: string|null; parent_name: string;
    archetype: string; parent_pattern: string;
    answers: Record<string, string>;
  }[];

  console.log(`Raw production rows: ${raw.length}`);

  // ── Stage 1: session_id dedupe ─────────────────────────────────────────────
  const bySession = new Map<string, typeof raw[0]>();
  for (const r of raw) if (!bySession.has(r.session_id)) bySession.set(r.session_id, r);
  const afterS1 = [...bySession.values()];
  console.log(`After session_id dedupe: ${afterS1.length} (−${raw.length - afterS1.length})`);

  // ── Stage 2: content-fingerprint dedupe ───────────────────────────────────
  const byFp = new Map<string, typeof raw[0]>();
  for (const r of afterS1) {
    const fp = JSON.stringify(Object.entries(r.answers ?? {}).sort());
    if (!byFp.has(fp)) byFp.set(fp, r);
  }
  const distinct = [...byFp.values()];
  console.log(`After content-fp dedupe: ${distinct.length} (−${afterS1.length - distinct.length})`);
  console.log(`Dedup method: session_id → answer-fingerprint (same as loop-coverage-production.ts)\n`);

  // ── Run loop detection + classify every family ─────────────────────────────
  type Family = {
    row: typeof raw[0];
    loopFired: boolean;
    frictionBg: string|null;
    frictionSourceQIds: string[];
    windowClass: WindowClass;
  };

  const families: Family[] = [];

  for (const row of distinct) {
    let loopFired = false;
    let frictionBg: string|null = null;
    let frictionSourceQIds: string[] = [];

    try {
      const hdg  = buildHdg(row.answers ?? {});
      const bg   = buildBehaviourGraph(hdg);
      const sig  = buildBehaviourSignature(hdg, bg);
      const loop = buildFamilyAttentionLoop(hdg, bg, sig);

      const frSig = bg.signal_nodes.find(n => n.dimension === "friction_response");
      loopFired          = loop.detected;
      frictionBg         = frSig?.value ?? null;
      frictionSourceQIds = hdg.nodes
        .filter(n => frSig?.source_nodes.includes(n.id))
        .map(n => n.source_question);
    } catch { /* skip */ }

    families.push({
      row, loopFired, frictionBg, frictionSourceQIds,
      windowClass: classifyWindow(frictionSourceQIds),
    });
  }

  const loop   = families.filter(f => f.loopFired);
  const noLoop = families.filter(f => !f.loopFired);

  console.log(`Distinct families: ${distinct.length}`);
  console.log(`  Loop fired: ${loop.length}`);
  console.log(`  NoLoop:     ${noLoop.length}\n`);

  // ── Window classification for ALL noLoop families ─────────────────────────
  const winCounts: Record<WindowClass, number> = {
    "same-window": 0, "later-window": 0, "multi-window": 0,
    "confirm-only": 0, "unknown": 0,
  };
  for (const f of noLoop) winCounts[f.windowClass]++;

  console.log("═".repeat(78));
  console.log(`NOLOOP WINDOW CLASSIFICATION (n=${noLoop.length})\n`);
  const order: WindowClass[] = ["same-window","later-window","multi-window","confirm-only","unknown"];
  for (const cls of order) {
    const n = winCounts[cls];
    if (n === 0) continue;
    const desc =
      cls === "same-window"   ? "friction at first contact (D3.1/D3.2 only)  — same window as G3"
    : cls === "later-window"  ? "friction post-failure only (D3.3 only)       — later than G3"
    : cls === "multi-window"  ? "friction spans both windows (D3.1/D3.2+D3.3) — diffuse"
    : cls === "confirm-only"  ? "friction from D3.confirm only               — timing ambiguous"
    :                           "no friction source nodes identified";
    console.log(`  ${cls.padEnd(14)}  n=${String(n).padStart(3)}/${noLoop.length} (${pct(n, noLoop.length).padStart(4)})  — ${desc}`);
  }

  // ── multi-window: breakdown by archetype × parent_instinct ────────────────
  const multi = noLoop.filter(f => f.windowClass === "multi-window");
  console.log(`\n${"─".repeat(78)}`);
  console.log(`MULTI-WINDOW NOLOOP FAMILIES — cell breakdown (n=${multi.length})\n`);

  const cellCounts = new Map<string, number>();
  const cellFricCounts = new Map<string, Map<string, number>>();
  for (const f of multi) {
    const key = `${f.row.archetype} × ${f.row.parent_pattern}`;
    cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    if (!cellFricCounts.has(key)) cellFricCounts.set(key, new Map());
    const fb = f.frictionBg ?? "null";
    cellFricCounts.get(key)!.set(fb, (cellFricCounts.get(key)!.get(fb) ?? 0) + 1);
  }

  const sortedCells = [...cellCounts.entries()].sort(([,a],[,b]) => b-a);
  for (const [cell, n] of sortedCells) {
    const fricMap = cellFricCounts.get(cell)!;
    const fricStr = [...fricMap.entries()].sort(([,a],[,b])=>b-a).map(([k,v])=>`${k}:${v}`).join(", ");
    console.log(`  n=${n}  ${cell}  [${fricStr}]`);
  }

  // ── same-window: breakdown (these are the "clean" noLoop — right window, no rule)
  const sameWin = noLoop.filter(f => f.windowClass === "same-window");
  console.log(`\n${"─".repeat(78)}`);
  console.log(`SAME-WINDOW NOLOOP FAMILIES — cell breakdown (n=${sameWin.length})`);
  console.log(`(friction at first contact — same window as G3 — no matching rule)\n`);

  const swCellCounts = new Map<string, number>();
  const swFricCounts = new Map<string, Map<string, number>>();
  for (const f of sameWin) {
    const key = `${f.row.archetype} × ${f.row.parent_pattern}`;
    swCellCounts.set(key, (swCellCounts.get(key) ?? 0) + 1);
    if (!swFricCounts.has(key)) swFricCounts.set(key, new Map());
    const fb = f.frictionBg ?? "null";
    swFricCounts.get(key)!.set(fb, (swFricCounts.get(key)!.get(fb) ?? 0) + 1);
  }
  for (const [cell, n] of [...swCellCounts.entries()].sort(([,a],[,b])=>b-a)) {
    const fricMap = swFricCounts.get(cell)!;
    const fricStr = [...fricMap.entries()].sort(([,a],[,b])=>b-a).map(([k,v])=>`${k}:${v}`).join(", ");
    console.log(`  n=${n}  ${cell}  [${fricStr}]`);
  }

  // ── later-window: breakdown ───────────────────────────────────────────────
  const laterWin = noLoop.filter(f => f.windowClass === "later-window");
  if (laterWin.length > 0) {
    console.log(`\n${"─".repeat(78)}`);
    console.log(`LATER-WINDOW NOLOOP FAMILIES — cell breakdown (n=${laterWin.length})`);
    console.log(`(D3.3 only — parent G3 fires before derail, no real-time conflict)\n`);
    const lwCellCounts = new Map<string, number>();
    for (const f of laterWin) {
      const key = `${f.row.archetype} × ${f.row.parent_pattern}`;
      lwCellCounts.set(key, (lwCellCounts.get(key) ?? 0) + 1);
    }
    for (const [cell, n] of [...lwCellCounts.entries()].sort(([,a],[,b])=>b-a)) {
      console.log(`  n=${n}  ${cell}`);
    }
  }

  // ── confirm-only: breakdown ───────────────────────────────────────────────
  const confirmOnly = noLoop.filter(f => f.windowClass === "confirm-only");
  if (confirmOnly.length > 0) {
    console.log(`\n${"─".repeat(78)}`);
    console.log(`CONFIRM-ONLY NOLOOP FAMILIES (n=${confirmOnly.length})`);
    console.log(`(D3.confirm branch — timing ambiguous, no moment-specific conflict)\n`);
    const coCellCounts = new Map<string, number>();
    const coFricCounts = new Map<string, Map<string, number>>();
    for (const f of confirmOnly) {
      const key = `${f.row.archetype} × ${f.row.parent_pattern}`;
      coCellCounts.set(key, (coCellCounts.get(key) ?? 0) + 1);
      if (!coFricCounts.has(key)) coFricCounts.set(key, new Map());
      const fb = f.frictionBg ?? "null";
      coFricCounts.get(key)!.set(fb, (coFricCounts.get(key)!.get(fb) ?? 0) + 1);
    }
    for (const [cell, n] of [...coCellCounts.entries()].sort(([,a],[,b])=>b-a)) {
      const fricMap = coFricCounts.get(cell)!;
      const fricStr = [...fricMap.entries()].sort(([,a],[,b])=>b-a).map(([k,v])=>`${k}:${v}`).join(", ");
      console.log(`  n=${n}  ${cell}  [${fricStr}]`);
    }
  }

  // ── Cross-cut: friction_bg distribution by window class ───────────────────
  console.log(`\n${"═".repeat(78)}`);
  console.log(`FRICTION_BG × WINDOW CLASS CROSS-CUT (noLoop only, n=${noLoop.length})\n`);

  const fbByWindow: Record<WindowClass, Map<string, number>> = {
    "same-window": new Map(), "later-window": new Map(), "multi-window": new Map(),
    "confirm-only": new Map(), "unknown": new Map(),
  };
  for (const f of noLoop) {
    const fb = f.frictionBg ?? "null";
    const m = fbByWindow[f.windowClass];
    m.set(fb, (m.get(fb) ?? 0) + 1);
  }

  for (const cls of order) {
    const m = fbByWindow[cls];
    if (m.size === 0) continue;
    console.log(`  ${cls}:`);
    for (const [fb, n] of [...m.entries()].sort(([,a],[,b])=>b-a)) {
      console.log(`    ${fb.padEnd(22)} n=${n}`);
    }
  }

  // ── Parent instinct × window class ───────────────────────────────────────
  console.log(`\n${"═".repeat(78)}`);
  console.log(`PARENT INSTINCT × WINDOW CLASS (noLoop, n=${noLoop.length})\n`);

  const INSTINCTS = ["The Quick Fixer","The Pusher","The Negotiator","The Steady Hand"];
  for (const inst of INSTINCTS) {
    const pop = noLoop.filter(f => f.row.parent_pattern === inst);
    if (pop.length === 0) continue;
    const counts: Record<string, number> = {};
    for (const f of pop) counts[f.windowClass] = (counts[f.windowClass] ?? 0) + 1;
    const parts = order.filter(c => counts[c]).map(c => `${c}:${counts[c]}`).join("  ");
    console.log(`  ${inst.padEnd(20)} n=${pop.length}  [${parts}]`);
  }

  // ── Summary for the structural question ──────────────────────────────────
  console.log(`\n${"═".repeat(78)}`);
  console.log(`STRUCTURAL SUMMARY\n`);
  console.log(`  Total noLoop families:      ${noLoop.length}`);
  console.log(`  same-window (clean gap):    ${winCounts["same-window"]}  (${pct(winCounts["same-window"], noLoop.length)})  — G3 trigger overlaps friction window; no rule exists`);
  console.log(`  later-window:               ${winCounts["later-window"]}  (${pct(winCounts["later-window"], noLoop.length)})  — G3 fires before friction moment; structural absence of conflict`);
  console.log(`  multi-window (diffuse):     ${winCounts["multi-window"]}  (${pct(winCounts["multi-window"], noLoop.length)})  — friction spans both; same pattern as QF×ED population`);
  console.log(`  confirm-only (ambiguous):   ${winCounts["confirm-only"]}  (${pct(winCounts["confirm-only"], noLoop.length)})  — D3.confirm branch, moment indeterminate`);
  console.log(`  unknown:                    ${winCounts["unknown"]}  (${pct(winCounts["unknown"], noLoop.length)})`);
  const structural = winCounts["same-window"];
  const diffuse    = winCounts["multi-window"];
  console.log(`\n  same-window gap : diffuse ratio = ${structural} : ${diffuse}`);
  console.log(`  Multi-window is ${diffuse > structural ? "LARGER" : diffuse === structural ? "EQUAL TO" : "SMALLER THAN"} the clean same-window gap.`);
}

main().catch(e => { console.error(e); process.exit(1); });
