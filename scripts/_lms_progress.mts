import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require");

// lms_progress uses week+day, not week_number. Key columns: user_id, week, day.
console.log("── Real customers with lms_progress (non-internal, paid) ──");
const progress = await sql`
  SELECT a.session_id, a.child_name, a.email, a.archetype, u.id AS user_id,
    lp.week, lp.day, lp.completed_at
  FROM lms_progress lp
  JOIN users u ON u.id = lp.user_id
  JOIN purchases p ON p.user_id = u.id AND p.status = 'paid'
  JOIN assessments a ON a.id = p.assessment_id
  WHERE a.is_internal = false
  ORDER BY a.session_id, lp.week, lp.day
` as unknown as { session_id: string; child_name: string | null; email: string | null; archetype: string | null; user_id: string; week: number; day: number; completed_at: Date }[];

const bySession = new Map<string, typeof progress>();
for (const r of progress) {
  if (!bySession.has(r.session_id)) bySession.set(r.session_id, []);
  bySession.get(r.session_id)!.push(r);
}
console.log(`Distinct paying customers with progress: ${bySession.size}`);
for (const [sid, rows] of bySession) {
  const r = rows[0];
  // Summarise: what weeks have been touched, what days within each
  const weekMap = new Map<number, number[]>();
  for (const row of rows) {
    if (!weekMap.has(row.week)) weekMap.set(row.week, []);
    weekMap.get(row.week)!.push(row.day);
  }
  const summary = [...weekMap.entries()].sort((a,b) => a[0]-b[0])
    .map(([w, days]) => `W${w}[${days.sort((a,b)=>a-b).join(",")}]`).join(" ");
  console.log(`  ${sid.substring(0,8)}… ${(r.child_name ?? "null").padEnd(14)} archetype=${r.archetype ?? "null"}  ${summary}`);
}

console.log("\n── Sample lms_reflections ──");
const refs = await sql`SELECT * FROM lms_reflections LIMIT 3` as unknown as Record<string,unknown>[];
for (const r of refs) console.log(JSON.stringify(r));

console.log("\n── lms_surveys count ──");
const [sc] = await sql`SELECT COUNT(*)::int AS n FROM lms_surveys` as unknown as {n:number}[];
console.log(`Total: ${sc.n}`);
