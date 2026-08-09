/**
 * HDG node-level investigation — Inventor × Quick Fixer non-firing families.
 * Deduplicates on answer fingerprint first (same check as support-seek pusher run).
 * Reports raw D3.x + G3/P1/P2 node values for each distinct non-firing family.
 */

import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { buildHdg }               from "../lib/graph/hdg";
import { buildBehaviourGraph }     from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";
import { buildFamilyAttentionLoop } from "../lib/graph/loop";

const sql = neon(process.env.DATABASE_URL!);

const FRICTION_QS = new Set(["D3.1","D3.2","D3.3","D3.confirm"]);
const PARENT_QS   = new Set(["G3","P1","P2"]);

async function main() {
  const rows = (await sql`
    SELECT id, child_name, parent_name, answers, archetype, parent_pattern,
           dimensions->'friction_response'->>'value'        AS friction_val,
           dimensions->'friction_response'->>'consistency'  AS friction_cons,
           dimensions->'friction_response'->>'evidence_tier' AS friction_tier
    FROM assessments
    WHERE archetype = 'The Inventor' AND parent_pattern = 'The Quick Fixer'
  `) as unknown as {
    id: string;
    child_name: string | null;
    parent_name: string;
    answers: Record<string, string>;
    archetype: string;
    parent_pattern: string;
    friction_val: string | null;
    friction_cons: string | null;
    friction_tier: string | null;
  }[];

  console.log(`Inventor × Quick Fixer total rows: ${rows.length}`);

  // ── Deduplication on answer fingerprint ──────────────────────────────────────
  const seen = new Map<string, typeof rows[0]>();
  for (const r of rows) {
    const fp = JSON.stringify(Object.entries(r.answers ?? {}).sort());
    if (!seen.has(fp)) seen.set(fp, r);
  }
  const distinct = [...seen.values()];
  console.log(`Distinct (by answer fingerprint): ${distinct.length}`);
  if (rows.length !== distinct.length) {
    console.log(`Duplicates removed: ${rows.length - distinct.length}\n`);
  }

  // ── Run loop detection on each distinct family ────────────────────────────────
  type Family = {
    row: typeof rows[0];
    fired: boolean;
    frictionBgValue: string | null;
    frictionSourceQIds: string[];
    hdgNodes: { qid: string; trigger: string; choice: string; actor: string }[];
  };

  const families: Family[] = [];
  for (const row of distinct) {
    const answers = row.answers ?? {};
    let fired = false;
    let frictionBgValue: string | null = null;
    let frictionSourceQIds: string[] = [];
    let hdgNodes: Family["hdgNodes"] = [];

    try {
      const hdg  = buildHdg(answers);
      const bg   = buildBehaviourGraph(hdg);
      const sig  = buildBehaviourSignature(hdg, bg);
      const loop = buildFamilyAttentionLoop(hdg, bg, sig);

      fired = loop.detected;

      const frSig = bg.signal_nodes.find(n => n.dimension === "friction_response");
      frictionBgValue    = frSig?.value ?? null;
      frictionSourceQIds = hdg.nodes
        .filter(n => frSig?.source_nodes.includes(n.id))
        .map(n => n.source_question);

      hdgNodes = hdg.nodes.map(n => ({
        qid:    n.source_question,
        trigger: n.trigger ?? "",
        choice:  n.choice  ?? "(none)",
        actor:   n.actor   ?? "child",
      }));
    } catch {
      // incomplete answers — skip
    }

    families.push({ row, fired, frictionBgValue, frictionSourceQIds, hdgNodes });
  }

  const firing    = families.filter(f => f.fired);
  const nonFiring = families.filter(f => !f.fired);

  console.log(`Loop fires:     ${firing.length}`);
  console.log(`Loop no-fires:  ${nonFiring.length}\n`);

  // ── Quick summary of the one firing family ────────────────────────────────────
  for (const f of firing) {
    console.log(`FIRES: ${f.row.child_name ?? "?"} | friction_bg=${f.frictionBgValue}`);
    const g3 = f.hdgNodes.find(n => n.qid === "G3");
    const d3s = f.hdgNodes.filter(n => FRICTION_QS.has(n.qid));
    if (g3) console.log(`  G3: "${g3.choice}"`);
    for (const d of d3s) console.log(`  ${d.qid}: "${d.choice}"`);
  }

  // ── Non-firing families — full node-level dump ────────────────────────────────
  console.log(`\n${"═".repeat(78)}`);
  console.log(`NON-FIRING INVENTOR × QUICK FIXER — HDG node-level (${nonFiring.length} distinct families)\n`);

  for (let i = 0; i < nonFiring.length; i++) {
    const f = nonFiring[i];
    const r = f.row;

    const parentNodes  = f.hdgNodes.filter(n => PARENT_QS.has(n.qid));
    const frictionNodes = f.hdgNodes.filter(n => FRICTION_QS.has(n.qid));
    const g3  = parentNodes.find(n => n.qid === "G3");
    const p1  = parentNodes.find(n => n.qid === "P1");
    const p2  = parentNodes.find(n => n.qid === "P2");

    // Rule 1 firing condition: friction evidence_tier=hypothesis OR friction=solo-push
    const wouldFireR1 = f.frictionBgValue === "solo-push" || r.friction_tier === "hypothesis";
    const frictionCons = parseFloat(r.friction_cons ?? "1");

    console.log(`── Family ${i + 1} ─────────────────────────────────────────────────────────────`);
    console.log(`   child=${r.child_name ?? "?"} | parent=${r.parent_name}`);
    console.log(`   friction_bg=${f.frictionBgValue}  cons=${r.friction_cons ?? "?"}  tier=${r.friction_tier ?? "?"}  source_qs=[${f.frictionSourceQIds.join(", ")}]`);
    console.log(`   Rule 1 would fire: ${wouldFireR1}\n`);

    console.log(`   PARENT [G3/P1/P2]:`);
    if (g3) console.log(`     G3  trigger="${g3.trigger}"\n         choice="${g3.choice}"`);
    if (p1) console.log(`     P1  trigger="${p1.trigger}"\n         choice="${p1.choice}"`);
    if (p2) console.log(`     P2  trigger="${p2.trigger}"\n         choice="${p2.choice}"`);

    console.log(`\n   CHILD FRICTION [D3.x]:`);
    if (frictionNodes.length === 0) {
      console.log(`     (no D3.x nodes in HDG)`);
    } else {
      for (const n of frictionNodes) {
        const isSrc = f.frictionSourceQIds.includes(n.qid);
        console.log(`     ${n.qid}${isSrc ? "*" : " "}  trigger="${n.trigger}"\n          choice="${n.choice}"`);
      }
      console.log(`     (* = source node for friction_response BG signal)`);
    }

    // Raw answers for D3.x / G3 / P1 / P2
    console.log(`\n   RAW ANSWERS:`);
    for (const [k, v] of Object.entries(r.answers ?? {}).sort()) {
      const base = k.split(":")[0];
      if (FRICTION_QS.has(base) || PARENT_QS.has(k) || PARENT_QS.has(base)) {
        console.log(`     ${k.padEnd(22)} = "${v}"`);
      }
    }
    console.log();
  }

  // ── Cross-family pattern summary ──────────────────────────────────────────────
  console.log(`${"═".repeat(78)}`);
  console.log(`CROSS-FAMILY SUMMARY — non-firing Inventor × Quick Fixer\n`);

  // friction_bg distribution
  const frDist: Record<string, number> = {};
  for (const f of nonFiring) {
    const v = f.frictionBgValue ?? "null";
    frDist[v] = (frDist[v] ?? 0) + 1;
  }
  console.log(`friction_bg distribution (n=${nonFiring.length}):`);
  for (const [k, v] of Object.entries(frDist).sort(([,a],[,b]) => b-a)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  // D3.1 distribution
  const d31Dist: Record<string, number> = {};
  for (const f of nonFiring) {
    const d31 = f.hdgNodes.find(n => n.qid === "D3.1");
    const v = d31 ? d31.choice.slice(0, 40) : "(absent)";
    d31Dist[v] = (d31Dist[v] ?? 0) + 1;
  }
  console.log(`\nD3.1 choice distribution:`);
  for (const [k, v] of Object.entries(d31Dist).sort(([,a],[,b]) => b-a)) {
    console.log(`  n=${v}  "${k}"`);
  }

  // D3.confirm distribution (for families without D3.1–3.3)
  const d3cDist: Record<string, number> = {};
  for (const f of nonFiring) {
    const d3c = f.hdgNodes.find(n => n.qid === "D3.confirm");
    if (d3c) {
      const v = d3c.choice.slice(0, 40);
      d3cDist[v] = (d3cDist[v] ?? 0) + 1;
    }
  }
  if (Object.keys(d3cDist).length > 0) {
    console.log(`\nD3.confirm choice distribution (families on confirm-branch):`);
    for (const [k, v] of Object.entries(d3cDist).sort(([,a],[,b]) => b-a)) {
      console.log(`  n=${v}  "${k}"`);
    }
  }

  // G3 distribution (should all be quick-fixer)
  const g3Dist: Record<string, number> = {};
  for (const f of nonFiring) {
    const g3 = f.hdgNodes.find(n => n.qid === "G3");
    const v = g3?.choice ?? "(absent)";
    g3Dist[v] = (g3Dist[v] ?? 0) + 1;
  }
  console.log(`\nG3 choice distribution:`);
  for (const [k, v] of Object.entries(g3Dist).sort(([,a],[,b]) => b-a)) {
    console.log(`  n=${v}  "${k}"`);
  }

  // P1 distribution
  const p1Dist: Record<string, number> = {};
  for (const f of nonFiring) {
    const p1 = f.hdgNodes.find(n => n.qid === "P1");
    const v = p1?.choice ?? "(absent)";
    p1Dist[v] = (p1Dist[v] ?? 0) + 1;
  }
  console.log(`\nP1 distribution (what parent does when quick-fix isn't working):`);
  for (const [k, v] of Object.entries(p1Dist).sort(([,a],[,b]) => b-a)) {
    console.log(`  n=${v}  "${k}"`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
