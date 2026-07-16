import { getSql } from "@/lib/db/client";
import ReportGate from "./ReportGate";
import ReportView from "./ReportView";
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
      concerns,
      tried,
      better
    FROM assessments
    WHERE session_id = ${sessionId}::uuid
    LIMIT 1
  `) as unknown as {
    session_id: string;
    child_name: string;
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
    concerns: string[];
    tried: string[] | null;
    better: string[] | null;
  }[];

  if (rows.length === 0) {
    return <NotFound />;
  }

  const row = rows[0];

  if (!row.parent_name) {
    return (
      <>
        <ReportGate sessionId={sessionId} />
        <SiteFooter />
      </>
    );
  }

  return (
    <>
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
