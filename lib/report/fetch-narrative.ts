import type { AttentionMoment } from "@/lib/narrative/types";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import type { getSql } from "@/lib/db/client";

export interface NarrativeReportRow {
  narrative_moments: AttentionMoment[];
  archetype: string;
  archetype_fit_tier: string | null;
  parent_instinct: string;
  parent_instinct_fit_tier: string | null;
  family_attention_loop: FamilyAttentionLoop | null;
}

type SqlClient = ReturnType<typeof getSql>;

// Customer-safety gate: only returns a report if status = 'published' AND superseded_by IS NULL.
// Draft reports (inserted by /api/report/generate) are invisible to this function.
// confidence_vector is intentionally excluded from the SELECT — it is an internal-only column.
export async function fetchPublishedNarrativeReport(
  sql: SqlClient,
  assessmentId: string,
): Promise<NarrativeReportRow | null> {
  const rows = (await sql`
    SELECT narrative_moments, archetype, archetype_fit_tier, parent_instinct, parent_instinct_fit_tier, family_attention_loop
    FROM reports
    WHERE assessment_id = ${assessmentId}::uuid
      AND status = 'published'
      AND superseded_by IS NULL
    ORDER BY generated_at DESC
    LIMIT 1
  `) as unknown as NarrativeReportRow[];
  return rows[0] ?? null;
}
