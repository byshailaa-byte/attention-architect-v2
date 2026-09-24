import { config } from 'dotenv';
config({ path: '.env.local' });
const { getSql } = await import('../lib/db/client');
const sql = getSql();

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'reports'` as {column_name: string}[];
console.log("Reports columns:", cols.map((c: {column_name: string}) => c.column_name).join(", "));

const [total] = await sql`SELECT COUNT(*) as n FROM reports` as {n: string}[];
console.log("Total reports:", total.n);

// Check if loop_detected stored anywhere
const sample = await sql`SELECT loop_detected, COUNT(*) as n FROM reports WHERE loop_detected IS NOT NULL GROUP BY loop_detected` as {loop_detected: boolean|null, n: string}[];
console.log("loop_detected distribution:", sample);
