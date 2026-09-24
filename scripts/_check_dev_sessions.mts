import { getSql } from "@/lib/db/client";
const sql = getSql();
const counts = await sql`SELECT count(*) as n, count(worry_followup) as wf FROM assessments WHERE archetype IS NOT NULL` as unknown as {n: string; wf: string}[];
console.log("total/with_wf:", counts[0]);
const rows = await sql`SELECT session_id, archetype, concerns, worry_followup FROM assessments WHERE archetype IS NOT NULL ORDER BY created_at DESC LIMIT 5` as unknown as {session_id:string;archetype:string;concerns:string[];worry_followup:string|null}[];
console.log(rows.map(r => ({ session_id: r.session_id, archetype: r.archetype, concerns: r.concerns, wf: r.worry_followup })));
process.exit(0);
