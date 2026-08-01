// Admin-only — protected by middleware HTTP Basic Auth on /admin/*
// Renders a single preview report for manual review.
// Read-only: no promotions, no emails, not visible to the parent.
//
// confidence_vector is never fetched or rendered here.
// honest_flag and honest_trigger are never fetched — Gate 3.

import { getSql } from "@/lib/db/client";
import { notFound } from "next/navigation";
import NarrativeReportView from "@/app/report/[sessionId]/NarrativeReportView";
import { resolveChildPronoun } from "@/lib/report/pronouns";
import type { Gender } from "@/lib/report/pronouns";
import type { AttentionMoment } from "@/lib/narrative/types";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import type { CheckFailure } from "@/lib/quality/types";

type Params = Promise<{ reportId: string }>;

type PreviewReportRow = {
  id: string;
  status: string;
  archetype: string;
  archetype_fit_tier: string | null;
  parent_instinct: string;
  family_attention_loop: FamilyAttentionLoop | null;
  narrative_moments: AttentionMoment[];
  generated_at: string;
  quality_passed: boolean | null;
  quality_failures: CheckFailure[];
  assessment_id: string;
  session_id: string;
  child_name: string | null;
  parent_name: string;
  child_gender: string | null;
  concerns: string[] | null;
};

export default async function ReportPreviewDetailPage({ params }: { params: Params }) {
  const { reportId } = await params;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(reportId)) notFound();

  const sql = getSql();

  const rows = (await sql`
    SELECT
      r.id,
      r.status,
      r.archetype,
      r.archetype_fit_tier,
      r.parent_instinct,
      r.family_attention_loop,
      r.narrative_moments,
      r.generated_at,
      (r.quality_check_results->>'passed')::boolean AS quality_passed,
      COALESCE(r.quality_check_results->'failures', '[]'::jsonb) AS quality_failures,
      r.assessment_id,
      a.session_id,
      a.child_name,
      a.parent_name,
      a.child_gender,
      a.concerns
    FROM reports r
    JOIN assessments a ON a.id = r.assessment_id
    WHERE r.id = ${reportId}::uuid
      AND r.status IN ('draft', 'preview', 'published')
    LIMIT 1
  `) as unknown as PreviewReportRow[];

  if (rows.length === 0) notFound();

  const row = rows[0];

  const gender = (row.child_gender ?? "neutral") as Gender;
  const pronouns = {
    subj:      resolveChildPronoun(gender, "subj"),
    obj:       resolveChildPronoun(gender, "obj"),
    poss:      resolveChildPronoun(gender, "poss"),
    reflexive: resolveChildPronoun(gender, "reflexive"),
  };

  const failures = Array.isArray(row.quality_failures) ? row.quality_failures : [];

  return (
    <div>
      {/* Admin banner — not visible to parents */}
      <div style={{
        background: "#1a1a2e",
        color: "#e0e0e0",
        padding: "12px 24px",
        fontSize: "13px",
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: "24px",
        flexWrap: "wrap",
      }}>
        <span style={{ fontWeight: 700, color: "#ffd700", letterSpacing: ".05em" }}>
          ⚠ ADMIN PREVIEW — NOT VISIBLE TO PARENT
        </span>
        <span style={{ color: row.status === "draft" ? "#ff9f40" : "#7fff7f", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" }}>
          {row.status}
        </span>
        <span>
          Quality:{" "}
          <strong style={{ color: row.quality_passed ? "#7fff7f" : "#ff7f7f" }}>
            {row.quality_passed ? "✓ PASSED" : `✗ FAILED (${failures.length} checks)`}
          </strong>
        </span>
        <span style={{ color: "#aaa" }}>
          Archetype: <strong style={{ color: "#fff" }}>{row.archetype}</strong>
          {row.archetype_fit_tier && (
            <span style={{ marginLeft: "6px", color: "#bbb" }}>({row.archetype_fit_tier})</span>
          )}
        </span>
        <span style={{ color: "#aaa" }}>
          Parent instinct: <strong style={{ color: "#fff" }}>{row.parent_instinct}</strong>
        </span>
        <span style={{ color: "#666", fontSize: "11px", marginLeft: "auto" }}>
          {new Date(row.generated_at).toLocaleString()}
        </span>
      </div>

      {/* Quality failures panel — shown only if failures exist */}
      {failures.length > 0 && (
        <div style={{
          background: "#fff3cd",
          borderBottom: "1px solid #ffc107",
          padding: "16px 24px",
        }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "14px", color: "#856404" }}>
            Quality check failures ({failures.length})
          </p>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#856404" }}>
            {failures.map((f, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                <strong>{f.check}</strong>
                {f.moment_id && <span style={{ color: "#a07000" }}> [{f.moment_id}]</span>}
                {" — "}{f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full narrative report — same component used by the parent-facing page */}
      <NarrativeReportView
        moments={row.narrative_moments}
        archetype={row.archetype}
        archetypeFitTier={row.archetype_fit_tier ?? "primary"}
        parentInstinct={row.parent_instinct}
        familyLoop={row.family_attention_loop}
        childName={row.child_name ?? ""}
        parentName={row.parent_name}
        concerns={row.concerns ?? []}
        sessionId={row.session_id}
        pronouns={pronouns}
      />
    </div>
  );
}
