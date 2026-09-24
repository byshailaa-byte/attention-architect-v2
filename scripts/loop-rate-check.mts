import { config } from 'dotenv';
config({ path: '.env.local' });
const { getSql } = await import('../lib/db/client');
const sql = getSql();

// Total sessions with a report
const [total] = await sql`SELECT COUNT(*) as n FROM assessments WHERE archetype IS NOT NULL` as {n: string}[];
// Sessions where loop_detected = true (if column exists)
// Check column names first
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'assessments'` as {column_name: string}[];
console.log("Assessment columns:", cols.map((c: {column_name: string}) => c.column_name).join(", "));
console.log("Total sessions with archetype:", total.n);
