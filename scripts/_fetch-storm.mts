import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL_PROD!);
// Find recent Storm/Live Wire sessions that have been scored (have axes.attention field)
const rows = await sql`
  SELECT a.session_id, a.archetype, a.axes, a.weakest_two
  FROM assessments a
  WHERE a.archetype IN ('The Storm', 'The Live Wire')
    AND a.axes IS NOT NULL
    AND (a.axes->>'attention') IS NOT NULL
  ORDER BY a.created_at DESC
  LIMIT 5
` as Array<{ session_id: string; archetype: string; axes: Record<string, {value:number;norm:number;band:string;eligible?:boolean}>; weakest_two: string[] }>;

if (rows.length === 0) {
  // Fall back to any sensation-seeking archetype scored after deploy
  console.log("No Storm/LiveWire with attention axis yet — checking older sessions");
  const older = await sql`
    SELECT a.session_id, a.archetype, a.axes, a.weakest_two
    FROM assessments a
    WHERE a.archetype IN ('The Storm', 'The Live Wire')
    ORDER BY a.created_at DESC
    LIMIT 3
  ` as typeof rows;
  for (const r of older) {
    console.log(`${r.archetype} ${r.session_id}`);
    console.log(`  weakest_two: ${JSON.stringify(r.weakest_two)}`);
    console.log(`  attention: ${JSON.stringify(r.axes?.attention ?? 'absent')}`);
  }
} else {
  for (const r of rows) {
    const ax = r.axes;
    console.log(`${r.archetype} — ${r.session_id}`);
    console.log(`  weakest_two: ${JSON.stringify(r.weakest_two)}`);
    console.log(`  attention:  norm=${ax.attention?.norm?.toFixed(4)} band=${ax.attention?.band}`);
    console.log(`  stability:  norm=${ax.stability?.norm?.toFixed(4)} band=${ax.stability?.band}`);
    console.log(`  resistance: norm=${ax.resistance?.norm?.toFixed(4)} band=${ax.resistance?.band}`);
    console.log(`  recovery:   norm=${ax.recovery?.norm?.toFixed(4)} band=${ax.recovery?.band} eligible=${ax.recovery?.eligible}`);
  }
}
