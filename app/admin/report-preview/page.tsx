// Admin-only — protected by middleware HTTP Basic Auth on /admin/*
// Lists all status='preview' report rows for Phase 7 review.
// Read-only: no actions, no promotions, no emails.

import { getSql } from "@/lib/db/client";
import Link from "next/link";

type PreviewRow = {
  id: string;
  assessment_id: string;
  archetype: string | null;
  archetype_fit_tier: string | null;
  parent_instinct: string | null;
  generated_at: string;
  quality_passed: boolean | null;
  quality_failure_count: number;
};

export default async function ReportPreviewListPage() {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      r.id,
      r.assessment_id,
      r.archetype,
      r.archetype_fit_tier,
      r.parent_instinct,
      r.generated_at,
      (r.quality_check_results->>'passed')::boolean AS quality_passed,
      jsonb_array_length(COALESCE(r.quality_check_results->'failures', '[]'::jsonb)) AS quality_failure_count
    FROM reports r
    WHERE r.status = 'preview'
    ORDER BY r.generated_at DESC
  `) as unknown as PreviewRow[];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "900px", margin: "40px auto", padding: "0 24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#888", margin: "0 0 8px" }}>
          Phase 7 — Admin Review Only
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 8px", color: "#111" }}>
          Preview Reports
        </h1>
        <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
          {rows.length} preview{rows.length !== 1 ? "s" : ""} · status=&apos;preview&apos; · not visible to parents · not promoted
        </p>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: "32px", background: "#f5f5f5", borderRadius: "8px", color: "#666", fontSize: "14px" }}>
          No preview reports yet. Run the batch script to generate them.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e5e5", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>Archetype</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>Fit Tier</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>Parent Instinct</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>Quality</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>Generated</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>Report ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <td style={{ padding: "10px 12px" }}>
                  <Link
                    href={`/admin/report-preview/${row.id}`}
                    style={{ color: "#34503F", fontWeight: 600, textDecoration: "none" }}
                  >
                    {row.archetype ?? "—"}
                  </Link>
                </td>
                <td style={{ padding: "10px 12px", color: "#555" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: row.archetype_fit_tier === "primary" ? "#d4edda"
                      : row.archetype_fit_tier === "secondary" ? "#d1ecf1"
                      : row.archetype_fit_tier === "weak" ? "#fff3cd"
                      : "#f8d7da",
                    color: row.archetype_fit_tier === "primary" ? "#155724"
                      : row.archetype_fit_tier === "secondary" ? "#0c5460"
                      : row.archetype_fit_tier === "weak" ? "#856404"
                      : "#721c24",
                  }}>
                    {row.archetype_fit_tier ?? "unknown"}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#555" }}>{row.parent_instinct ?? "—"}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: row.quality_passed ? "#155724" : "#721c24",
                  }}>
                    {row.quality_passed ? "✓ passed" : `✗ ${row.quality_failure_count} failures`}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#888", fontSize: "12px" }}>
                  {new Date(row.generated_at).toLocaleString()}
                </td>
                <td style={{ padding: "10px 12px", color: "#aaa", fontSize: "11px", fontFamily: "monospace" }}>
                  {row.id.slice(0, 8)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
