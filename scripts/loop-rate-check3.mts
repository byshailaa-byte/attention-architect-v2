import { config } from 'dotenv';
config({ path: '.env.local' });
const { getSql } = await import('../lib/db/client');
const sql = getSql();

// family_attention_loop is a JSON/JSONB column — extract loop.detected
const rows = await sql`
  SELECT 
    (family_attention_loop->>'detected')::boolean as loop_detected,
    COUNT(*) as n
  FROM reports
  WHERE family_attention_loop IS NOT NULL
  GROUP BY (family_attention_loop->>'detected')::boolean
` as {loop_detected: boolean|null, n: string}[];
console.log("Loop detection distribution:", rows);

const [total] = await sql`SELECT COUNT(*) as n FROM reports WHERE family_attention_loop IS NOT NULL` as {n: string}[];
console.log("Reports with loop data:", total.n);
