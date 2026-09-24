import { config } from 'dotenv';
config({ path: '.env.local' });
const { getSql } = await import('../lib/db/client');
const sql = getSql();

// Break down by parent_instinct and loop detection
const rows = await sql`
  SELECT 
    r.parent_instinct,
    (r.family_attention_loop->>'detected')::boolean as loop_detected,
    COUNT(*) as n
  FROM reports r
  WHERE r.family_attention_loop IS NOT NULL
  GROUP BY r.parent_instinct, (r.family_attention_loop->>'detected')::boolean
  ORDER BY r.parent_instinct, loop_detected
` as {parent_instinct: string, loop_detected: boolean, n: string}[];
console.log("Loop by parent instinct:");
for (const r of rows) {
  console.log(`  ${(r.parent_instinct ?? 'null').padEnd(20)} loop=${r.loop_detected} n=${r.n}`);
}

// Also get loop mechanism breakdown
const mech = await sql`
  SELECT 
    family_attention_loop->'loop_tension_point'->>'mechanism' as mechanism,
    COUNT(*) as n
  FROM reports
  WHERE family_attention_loop IS NOT NULL
    AND (family_attention_loop->>'detected')::boolean = true
  GROUP BY family_attention_loop->'loop_tension_point'->>'mechanism'
  ORDER BY n DESC
` as {mechanism: string|null, n: string}[];
console.log("\nLoop mechanisms (detected=true only):");
for (const r of mech) {
  console.log(`  ${(r.mechanism ?? 'null').padEnd(30)} n=${r.n}`);
}
