/**
 * Phase 4 — Flagged cell breakdown.
 * For each flagged (archetype × parent_instinct) cell, pulls D3.x answers and
 * computes friction_response BG tension objects to show the actual values in disagreement.
 *
 * Run:  ANALYTICS_DB_URL="..." npx tsx scripts/phase4-cells-breakdown.ts
 * Output: aggregate counts only — no IDs, no PII.
 */

import { neon } from "@neondatabase/serverless";
import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";

const DB_URL = process.env.ANALYTICS_DB_URL;
if (!DB_URL) { console.error("ANALYTICS_DB_URL required"); process.exit(1); }
const sql = neon(DB_URL);

interface DbRow {
  id: string;
  archetype: string;
  parent_pattern: string;
  answers: Record<string, string>;
}

// Flagged cells to analyse
const FLAGGED_CELLS: Array<{ archetype: string; parent_instinct: string; label: string }> = [
  { archetype: "The Explorer",  parent_instinct: "negotiator",  label: "Explorer×Negotiator (friction hypothesis 50%)" },
  { archetype: "The Inventor",  parent_instinct: "negotiator",  label: "Inventor×Negotiator (friction hypothesis 29%)" },
  { archetype: "The Live Wire", parent_instinct: "negotiator",  label: "Live Wire×Negotiator (friction tension 75%)" },
  { archetype: "The Storm",     parent_instinct: "steady-hand", label: "Storm×Steady-Hand (friction hypothesis 33%, attention_competition tension 67%)" },
];

async function main() {
  const allRows = (await sql`
    SELECT id, archetype, parent_pattern, answers
    FROM assessments
    WHERE archetype IS NOT NULL
      AND answers IS NOT NULL
      AND answers::text != '{}'
    ORDER BY created_at
  `) as DbRow[];

  // Deduplicate by session_id (same as main aggregate)
  const raw = (await sql`
    SELECT DISTINCT ON (session_id) id, archetype, parent_pattern, answers
    FROM assessments
    WHERE archetype IS NOT NULL
      AND answers IS NOT NULL
      AND answers::text != '{}'
    ORDER BY session_id, created_at DESC
  `) as DbRow[];

  // Also include null session_id rows
  const noSession = allRows.filter(r => !(r as any).session_id);
  const dedupedIds = new Set(raw.map(r => r.id));
  const finalRows = [...raw, ...allRows.filter(r => !dedupedIds.has(r.id) && !(r as any).session_id)];

  console.log(`\nTotal rows for analysis: ${finalRows.length}\n`);

  for (const cell of FLAGGED_CELLS) {
    console.log("═".repeat(68));
    console.log(`  ${cell.label}`);
    console.log("═".repeat(68));

    // Filter to this cell
    const cellRows = finalRows.filter(r => {
      if (r.archetype !== cell.archetype) return false;
      const hdg = buildHdg(r.answers);
      const bg = buildBehaviourGraph(hdg);
      const piNode = bg.signal_nodes.find(n => n.dimension === "parent_instinct");
      return piNode?.value === cell.parent_instinct;
    });

    console.log(`  n = ${cellRows.length}\n`);

    // For each row, compute friction BG + Signature details
    const frictionBreakdown = {
      hypothesis: [] as string[],
      tension: [] as string[],
      clean: [] as string[],
    };

    let attnCompTensionCount = 0;

    for (const r of cellRows) {
      const hdg = buildHdg(r.answers);
      const bg = buildBehaviourGraph(hdg);
      const sig = buildBehaviourSignature(hdg, bg);

      const frBg = bg.signal_nodes.find(n => n.dimension === "friction_response");
      const frSig = sig.dimensions.find(d => d.dimension === "friction_response");
      const acSig = sig.dimensions.find(d => d.dimension === "attention_competition");

      const tier = frBg?.evidence_tier ?? "insufficient";
      const value = frBg?.value ?? "(none)";
      const hasContradiction = frSig?.contradiction_flag ?? false;
      const tension = frSig?.expression.tension;

      // D3.x answers present
      const d31 = r.answers["D3.1"] ?? null;
      const d32 = r.answers["D3.2"] ?? null;
      const d33 = r.answers["D3.3"] ?? null;
      const d3c = r.answers["D3.confirm"] ?? null;

      const frLine = [
        `tier=${tier}`,
        `value=${value}`,
        `D3.1=${d31 ?? "-"}`,
        `D3.2=${d32 ?? "-"}`,
        `D3.3=${d33 ?? "-"}`,
        d3c ? `D3.confirm=${d3c}` : null,
        tension ? `tension_a="${tension.value_a.slice(0,45)}…" vs b="${tension.value_b.slice(0,45)}…"` : null,
        hasContradiction && !tension ? "contradiction_flag=true (BG level)" : null,
      ].filter(Boolean).join("  |  ");

      if (tier === "hypothesis") frictionBreakdown.hypothesis.push(frLine);
      else if (hasContradiction) frictionBreakdown.tension.push(frLine);
      else frictionBreakdown.clean.push(frLine);

      if (acSig?.contradiction_flag) attnCompTensionCount++;
    }

    // Print per-category
    if (frictionBreakdown.hypothesis.length > 0) {
      console.log(`  HYPOTHESIS rows (${frictionBreakdown.hypothesis.length}):`);
      frictionBreakdown.hypothesis.forEach(line => console.log(`    ${line}`));
      console.log();
    }
    if (frictionBreakdown.tension.length > 0) {
      console.log(`  TENSION rows (${frictionBreakdown.tension.length}):`);
      frictionBreakdown.tension.forEach(line => console.log(`    ${line}`));
      console.log();
    }
    if (frictionBreakdown.clean.length > 0) {
      console.log(`  Clean rows (${frictionBreakdown.clean.length}):`);
      frictionBreakdown.clean.forEach(line => console.log(`    ${line}`));
      console.log();
    }

    // D3.x answer pattern summary
    const d3Patterns: Record<string, number> = {};
    for (const r of cellRows) {
      const d31 = r.answers["D3.1"] ?? "-";
      const d32 = r.answers["D3.2"] ?? "-";
      const d33 = r.answers["D3.3"] ?? "-";
      const d3c = r.answers["D3.confirm"] ?? "-";
      const key = `D3.1=${d31} D3.2=${d32} D3.3=${d33} D3.conf=${d3c}`;
      d3Patterns[key] = (d3Patterns[key] ?? 0) + 1;
    }
    console.log(`  D3.x answer patterns (${cellRows.length} rows):`);
    Object.entries(d3Patterns).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
      console.log(`    n=${n}  ${k}`);
    });

    if (attnCompTensionCount > 0) {
      console.log(`\n  attention_competition contradiction_flag=true: ${attnCompTensionCount}/${cellRows.length} rows`);
      // Show AC patterns
      const acPatterns: Record<string, number> = {};
      for (const r of cellRows) {
        const hdg = buildHdg(r.answers);
        const bg = buildBehaviourGraph(hdg);
        const sig = buildBehaviourSignature(hdg, bg);
        const acBg = bg.signal_nodes.find(n => n.dimension === "attention_competition");
        const acSig = sig.dimensions.find(d => d.dimension === "attention_competition");
        if (acSig?.contradiction_flag) {
          const tension = acSig.expression.tension;
          const key = tension
            ? `value=${acBg?.value}  a="${tension.value_a.slice(0,45)}…" vs b="${tension.value_b.slice(0,45)}…"`
            : `value=${acBg?.value}  contradiction_flag=true`;
          acPatterns[key] = (acPatterns[key] ?? 0) + 1;
        }
      }
      Object.entries(acPatterns).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
        console.log(`    n=${n}  ${k}`);
      });
    }

    console.log();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
