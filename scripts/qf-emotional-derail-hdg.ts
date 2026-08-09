/**
 * Node-level investigation: quick-fixer × emotional-derail families.
 * Production branch (ANALYTICS_DB_URL), read-only.
 *
 * Deduplication: same two-stage method as loop-coverage-production.ts —
 *   Stage 1: session_id uniqueness (one row per session)
 *   Stage 2: content fingerprint = JSON.stringify(sorted answer entries)
 *            — removes families who resubmitted with identical answers
 * The n=19 target is verified against this clean set, not assumed from a stale query.
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

const FRICTION_QS = new Set(["D3.1", "D3.2", "D3.3", "D3.confirm"]);
const PARENT_QS   = new Set(["G3", "P1", "P2"]);

// HDG node text from hdg.ts — reproduced here for trigger-window labelling
const TRIGGER_WINDOW: Record<string, string> = {
  "D3.1":       "at the moment of hitting something really hard",
  "D3.2":       "when facing hard tasks (general)",
  "D3.3":       "after a frustrating failure",
  "D3.confirm": "general hard-task disposition (confirm-branch)",
  "G3":         "when child is stuck or struggling",
  "P1":         "when their approach is not working",
  "P2":         "in a difficult parenting moment (hardest thing)",
};

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
  console.log(`Dedup method: session_id uniqueness → then answer-fingerprint; same as loop-coverage-production.ts\n`);

  // ── Filter to quick-fixer, run loop detection, compute friction_bg ─────────
  type Family = {
    row: typeof raw[0];
    frictionBg: string|null;
    loopFired: boolean;
    hdgNodes: { qid: string; trigger: string; choice: string; actor: string; isSource: boolean }[];
    frictionSourceQIds: string[];
    piSourceQIds: string[];
  };

  const qfFamilies: Family[] = [];

  for (const row of distinct) {
    if (row.parent_pattern !== "The Quick Fixer") continue;
    let frictionBg: string|null = null;
    let loopFired = false;
    let hdgNodes: Family["hdgNodes"] = [];
    let frictionSourceQIds: string[] = [];
    let piSourceQIds: string[] = [];

    try {
      const hdg  = buildHdg(row.answers ?? {});
      const bg   = buildBehaviourGraph(hdg);
      const sig  = buildBehaviourSignature(hdg, bg);
      const loop = buildFamilyAttentionLoop(hdg, bg, sig);

      const frSig = bg.signal_nodes.find(n => n.dimension === "friction_response");
      const piSig = bg.signal_nodes.find(n => n.dimension === "parent_instinct");

      frictionBg          = frSig?.value ?? null;
      loopFired           = loop.detected;
      frictionSourceQIds  = hdg.nodes.filter(n => frSig?.source_nodes.includes(n.id)).map(n => n.source_question);
      piSourceQIds        = hdg.nodes.filter(n => piSig?.source_nodes.includes(n.id)).map(n => n.source_question);

      hdgNodes = hdg.nodes.map(n => ({
        qid:      n.source_question,
        trigger:  n.trigger  ?? "",
        choice:   n.choice   ?? "(none)",
        actor:    n.actor    ?? "child",
        isSource: !!(frSig?.source_nodes.includes(n.id) || piSig?.source_nodes.includes(n.id)),
      }));
    } catch { /* skip */ }

    qfFamilies.push({ row, frictionBg, loopFired, hdgNodes, frictionSourceQIds, piSourceQIds });
  }

  const edFamilies = qfFamilies.filter(f => f.frictionBg === "emotional-derail");

  console.log(`Quick-fixer families (deduped): ${qfFamilies.length}`);
  console.log(`  emotional-derail: ${edFamilies.length}  (this is the verified n — not from a separate query)`);
  console.log(`  loop fired within ED population: ${edFamilies.filter(f => f.loopFired).length}`);
  console.log(`  loop NOT fired:                  ${edFamilies.filter(f => !f.loopFired).length}\n`);

  // ── Trigger-window classification ──────────────────────────────────────────
  // The key question: does G3 (parent arrives "when stuck") overlap with the
  // child's emotional-derail source node's own trigger?
  //
  // D3.1 trigger: "when hitting something really hard" — SAME WINDOW as G3
  // D3.2 trigger: "when facing hard tasks (general)"  — SAME WINDOW as G3
  // D3.3 trigger: "after a frustrating failure"        — LATER than G3
  // D3.confirm:   general disposition                  — ambiguous
  //
  // If friction_response source is only D3.3: parent arrives before the
  // emotional-derail moment (at "stuck" moment); the derail happens after
  // failure, not at first contact — so the parent arrives FIRST, not into
  // an active derail.

  type WindowClassification = "same-window" | "later-window" | "mixed" | "ambiguous";

  function classifyWindow(frictionSourceQIds: string[]): WindowClassification {
    const hasSameWindow  = frictionSourceQIds.some(q => q === "D3.1" || q === "D3.2");
    const hasLaterWindow = frictionSourceQIds.some(q => q === "D3.3");
    const hasConfirm     = frictionSourceQIds.some(q => q === "D3.confirm");

    if (hasSameWindow && hasLaterWindow) return "mixed";
    if (hasSameWindow) return "same-window";
    if (hasLaterWindow) return "later-window";
    if (hasConfirm)     return "ambiguous";
    return "ambiguous";
  }

  // ── Per-family node dump ───────────────────────────────────────────────────
  console.log("═".repeat(78));
  console.log(`QUICK-FIXER × EMOTIONAL-DERAIL — HDG node values (n=${edFamilies.length})\n`);

  const windowCounts: Record<WindowClassification, number> = {
    "same-window": 0, "later-window": 0, "mixed": 0, "ambiguous": 0,
  };

  for (let i = 0; i < edFamilies.length; i++) {
    const f   = edFamilies[i];
    const row = f.row;
    const win = classifyWindow(f.frictionSourceQIds);
    windowCounts[win]++;

    const g3  = f.hdgNodes.find(n => n.qid === "G3");
    const p1  = f.hdgNodes.find(n => n.qid === "P1");
    const p2  = f.hdgNodes.find(n => n.qid === "P2");
    const frNodes = f.hdgNodes.filter(n => FRICTION_QS.has(n.qid));

    // Determine which D3 node(s) are source of emotional-derail signal
    const edSourceNodes = frNodes.filter(n => f.frictionSourceQIds.includes(n.qid));

    console.log(`── Family ${i + 1} ─────────────────────────────────────────────────────────────`);
    console.log(`   ${row.child_name ?? "?"} / ${row.parent_name} — ${row.archetype}`);
    console.log(`   friction_bg=emotional-derail  source_qs=[${f.frictionSourceQIds.join(", ")}]`);
    console.log(`   trigger-window: ${win.toUpperCase()}  loop_fired: ${f.loopFired}`);

    console.log(`\n   PARENT NODES:`);
    if (g3) {
      console.log(`     [G3]  window="${TRIGGER_WINDOW["G3"]}"`);
      console.log(`           choice="${g3.choice}"`);
    }
    if (p1) {
      console.log(`     [P1]  window="${TRIGGER_WINDOW["P1"]}"`);
      console.log(`           choice="${p1.choice}"`);
    }
    if (p2) {
      console.log(`     [P2]  window="${TRIGGER_WINDOW["P2"]}"`);
      console.log(`           choice="${p2.choice}"`);
    }

    console.log(`\n   CHILD FRICTION NODES:`);
    if (frNodes.length === 0) {
      console.log(`     (none resolved)`);
    } else {
      for (const n of frNodes) {
        const isSrc = f.frictionSourceQIds.includes(n.qid);
        const srcMark = isSrc ? " [ED SOURCE]" : "";
        console.log(`     [${n.qid}]${srcMark}  window="${TRIGGER_WINDOW[n.qid] ?? n.qid}"`);
        console.log(`           choice="${n.choice}"`);
      }
    }

    // Conflict assessment
    console.log(`\n   CONFLICT ASSESSMENT:`);
    if (win === "same-window") {
      const edSrc = edSourceNodes[0];
      console.log(`     G3 trigger: child is stuck or struggling`);
      console.log(`     ${edSrc?.qid} trigger: ${TRIGGER_WINDOW[edSrc?.qid ?? ""] ?? "?"}`);
      console.log(`     → Parent arrives INTO active emotional-derail (same moment)`);
      console.log(`     → Quick-fix "steps in and helps get it done" meets "${edSrc?.choice}"`);
    } else if (win === "later-window") {
      console.log(`     G3 trigger: child is stuck or struggling (initial contact)`);
      console.log(`     D3.3 trigger: after a frustrating failure`);
      console.log(`     → Parent arrives BEFORE the derail moment`);
      console.log(`     → Emotional-derail is the child's post-failure state, not first-contact`);
      console.log(`     → Quick-fix at "stuck" moment does not meet active derail`);
    } else if (win === "mixed") {
      console.log(`     Sources span same-window (D3.1/D3.2) AND later-window (D3.3)`);
      console.log(`     → Child derails both at first contact AND after failure`);
      console.log(`     → Parent may arrive into an early derail`);
    } else {
      console.log(`     D3.confirm branch — trigger window is general, not moment-specific`);
    }
    console.log();
  }

  // ── Aggregate window classification ───────────────────────────────────────
  console.log("═".repeat(78));
  console.log(`TRIGGER-WINDOW CLASSIFICATION SUMMARY (n=${edFamilies.length})\n`);
  for (const [cls, ct] of Object.entries(windowCounts)) {
    if (ct === 0) continue;
    const pct = ((ct / edFamilies.length) * 100).toFixed(0);
    const desc = cls === "same-window"   ? "parent arrives into active derail (D3.1 or D3.2 is source)"
               : cls === "later-window"  ? "parent arrives before derail moment (D3.3 only is source)"
               : cls === "mixed"         ? "derail at both first-contact AND post-failure (D3.1+D3.3)"
               :                           "D3.confirm branch — timing indeterminate";
    console.log(`  ${cls.padEnd(14)}  n=${ct}/${edFamilies.length} (${pct}%)  — ${desc}`);
  }

  // ── P1 distribution for ED families ──────────────────────────────────────
  console.log(`\nP1 distribution within QF × emotional-derail (n=${edFamilies.length}):`);
  const p1Dist: Record<string, number> = {};
  for (const f of edFamilies) {
    const p1 = f.hdgNodes.find(n => n.qid === "P1");
    const v  = p1?.choice ?? "(absent)";
    p1Dist[v] = (p1Dist[v] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(p1Dist).sort(([,a],[,b]) => b-a)) {
    console.log(`  n=${v}  "${k}"`);
  }

  // ── Archetype distribution ────────────────────────────────────────────────
  console.log(`\nArchetype distribution within QF × emotional-derail (n=${edFamilies.length}):`);
  const archDist: Record<string, number> = {};
  for (const f of edFamilies) {
    archDist[f.row.archetype] = (archDist[f.row.archetype] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(archDist).sort(([,a],[,b]) => b-a)) {
    console.log(`  n=${v}  ${k}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
