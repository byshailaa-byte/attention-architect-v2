// Read-only damage estimate: how identifiable are past admin opens of report/plan among funnel_events?
import * as dotenv from "dotenv";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const sql = neon(process.env.DATABASE_URL_PROD);

const EVENTS = ["report_view", "report_v2_view", "plan_v2_view"];
const tot = await sql`SELECT event_type, count(*)::int c FROM funnel_events WHERE event_type = ANY(${EVENTS}) GROUP BY 1 ORDER BY 2 DESC`;
console.log("TOTALS:", JSON.stringify(tot));

const avl = await sql`SELECT count(*)::int c, left(path, 16) p FROM admin_view_log GROUP BY 2 ORDER BY 1 DESC`;
console.log("admin_view_log by path prefix:", JSON.stringify(avl));

// (a) the user's requested match: report/plan events whose session matches an admin_view_log open ±120s
const bySession = await sql`
  SELECT count(*)::int c FROM funnel_events f
  WHERE f.event_type = ANY(${EVENTS})
    AND EXISTS (SELECT 1 FROM admin_view_log v WHERE v.session_id = f.session_id
                AND abs(extract(epoch FROM (v.viewed_at - f.created_at))) < 120)`;
console.log("match by admin_view_log.session_id ±120s:", JSON.stringify(bySession));

// (b) match via the user the admin was viewing: admin_view_log.viewed_user_id -> that user's assessment
//     session, report/plan event on it within ±120s of the admin open.
const byUser = await sql`
  SELECT count(*)::int c FROM funnel_events f
  JOIN assessments a ON a.session_id = f.session_id
  JOIN purchases p ON p.assessment_id = a.id
  WHERE f.event_type = ANY(${EVENTS})
    AND EXISTS (SELECT 1 FROM admin_view_log v WHERE v.viewed_user_id = p.user_id
                AND abs(extract(epoch FROM (v.viewed_at - f.created_at))) < 120)`.catch((e) => ({ err: e.message }));
console.log("match by admin_view_log.viewed_user_id→assessment ±120s:", JSON.stringify(byUser));

// (c) lower-bound proxy: events whose session is flagged internal (UNDER-counts — operator-on-parent is NOT internal)
const internal = await sql`
  SELECT f.event_type, count(*)::int c,
    count(*) FILTER (WHERE COALESCE(fs.is_internal, a.is_internal, false))::int internal_c
  FROM funnel_events f
  LEFT JOIN flow_sessions fs ON fs.session_id = f.session_id
  LEFT JOIN assessments a ON a.session_id = f.session_id
  WHERE f.event_type = ANY(${EVENTS}) GROUP BY 1`;
console.log("on-internal-session (lower bound):", JSON.stringify(internal));
process.exit(0);
