/**
 * Investigate The Inventor reward_driver tension — pull raw D2.x values
 * and compute the Signature tension object for up to 8 rows.
 *
 * Run: npx tsx scripts/inventor-tension.ts
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import path from "path";
import { buildHdg } from "../lib/graph/hdg";
import { buildBehaviourGraph } from "../lib/graph/behaviour-graph";
import { buildBehaviourSignature } from "../lib/graph/signature";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  const rows = await sql`
    SELECT id,
           answers->>'G1' as g1,
           answers->>'G2' as g2,
           answers->>'G3' as g3,
           answers->>'D2.1' as d21,
           answers->>'D2.2' as d22,
           answers->>'D2.3' as d23
    FROM assessments
    WHERE archetype = 'The Inventor'
      AND answers IS NOT NULL
    LIMIT 10
  ` as Array<{ id: string; g1: string; g2: string; g3: string; d21: string; d22: string; d23: string }>;

  console.log(`\nInventor rows sampled: ${rows.length}\n`);
  console.log("─".repeat(72));

  for (const r of rows) {
    const answers: Record<string, string> = { G1: r.g1, G2: r.g2 };
    if (r.g3) answers["G3"] = r.g3;
    if (r.d21) answers["D2.1"] = r.d21;
    if (r.d22) answers["D2.2"] = r.d22;
    if (r.d23) answers["D2.3"] = r.d23;

    const hdg = buildHdg(answers);
    const bg  = buildBehaviourGraph(hdg);
    const sig = buildBehaviourSignature(hdg, bg);

    const rd   = sig.dimensions.find(d => d.dimension === "reward_driver");
    const bgRd = bg.signal_nodes.find(n => n.dimension === "reward_driver");

    const d21Raw = r.d21 ?? "(null)";
    const d22Raw = r.d22 ?? "(null)";
    const d23Raw = r.d23 ?? "(null)";

    const signalValue = bgRd?.value ?? "—";
    const tier = rd?.evidence_tier ?? "—";
    const hasTension = rd?.contradiction_flag ?? false;
    const tension = rd?.expression.tension;

    console.log(`id=${r.id.slice(0,8)}  G1=${r.g1} G2=${r.g2}`);
    console.log(`  raw D2 answers:  D2.1=${d21Raw}  D2.2=${d22Raw}  D2.3=${d23Raw}`);
    console.log(`  BG signal value: ${signalValue}   tier: ${tier}   tension: ${hasTension}`);
    if (tension) {
      const trunc = (s: string) => s.length > 64 ? s.slice(0, 61) + "…" : s;
      console.log(`  tension.value_a: "${trunc(tension.value_a)}"`);
      console.log(`  tension.value_b: "${trunc(tension.value_b)}"`);
    }
    console.log();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
