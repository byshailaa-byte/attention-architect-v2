import { getSql } from "@/lib/db/client";
import ReportGate from "./ReportGate";
import ReportView from "./ReportView";
import ScrollTracker from "./ScrollTracker";
import SiteFooter from "@/app/components/SiteFooter";
import type { AxisResult } from "@/lib/engine/scorer";

type Params = Promise<{ sessionId: string }>;

export default async function ReportPage({ params }: { params: Params }) {
  const { sessionId } = await params;

  // Validate UUID format before hitting the DB
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(sessionId)) {
    return <NotFound />;
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT
      session_id,
      child_name,
      age_band,
      child_gender,
      archetype,
      parent_pattern,
      axes,
      weakest_two,
      parent_name,
      email,
      phone,
      concerns,
      tried,
      better
    FROM assessments
    WHERE session_id = ${sessionId}::uuid
    LIMIT 1
  `) as unknown as {
    session_id: string;
    child_name: string | null;
    age_band: string;
    child_gender: string | null;
    archetype: string;
    parent_pattern: string;
    axes: {
      stability: AxisResult;
      resistance: AxisResult;
      recovery: AxisResult;
    };
    weakest_two: string[];
    parent_name: string | null;
    email: string | null;
    phone: string | null;
    concerns: string[];
    tried: string[] | null;
    better: string[] | null;
  }[];

  if (rows.length === 0) {
    return <NotFound />;
  }

  const row = rows[0];

  if (!row.parent_name) {
    // Fire report_gate_view when parent hasn't filled details yet
    sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('report_gate_view', ${sessionId}::uuid, '{}'::jsonb)
    `.catch((e: unknown) => console.warn("[funnel] report_gate_view:", (e as Error).message));

    return (
      <>
        <ReportGate sessionId={sessionId} />
        <SiteFooter />
      </>
    );
  }

  // Fire report_view once parent details are confirmed (fire-and-forget)
  sql`
    INSERT INTO funnel_events (event_type, session_id, metadata)
    VALUES ('report_view', ${sessionId}::uuid, ${JSON.stringify({ archetype: row.archetype })}::jsonb)
  `.catch((e: unknown) => console.warn("[funnel] report_view:", (e as Error).message));

  return (
    <>
      <ScrollTracker sessionId={sessionId} />
      <ReportView
        assessment={{
          ...row,
          parent_name: row.parent_name,
        }}
      />
      <SiteFooter />
    </>
  );
}

function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--paper)" }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--ink)" }}
        >
          Report not found
        </p>
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          This link may have expired or the session was not saved correctly.
        </p>
      </div>
    </main>
  );
}
