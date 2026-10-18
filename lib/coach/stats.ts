// "What worked for similar children" — anonymised, aggregated outcome signal by archetype × worry ×
// age band. Fed into the Coach's context so it can prefer adjustments that tend to work for children
// like this one. CROSS-PARENT STATS ARE OFF BY DEFAULT and stay off in prod until explicitly approved
// (env COACH_CROSS_PARENT_STATS=1) and a privacy-policy line is live. Counts only — never names, ids,
// phone numbers or any free-text notes leave this function.
import { getSql } from "@/lib/db/client";

const MIN_COHORT = 5; // never surface a stat computed from fewer than this many children

export function crossParentStatsEnabled(): boolean {
  return process.env.COACH_CROSS_PARENT_STATS === "1";
}

export type WorksStat = { worked: number; partly: number; didnt: number; total: number } | null;

// Outcome distribution for children of the same archetype × worry × age band (anonymised counts).
// Returns null when disabled or the cohort is too small to be meaningful/safe.
export async function whatWorksFor(archetype: string, worry: string | null, ageBand: string): Promise<WorksStat> {
  if (!crossParentStatsEnabled()) return null;
  const sql = getSql();
  // Join normalised outcomes to the child's archetype/age via assessments + trials/purchases.
  // Counts only; grouped; no identifiers selected.
  const rows = (await sql`
    WITH subj AS (
      SELECT 'trial' AS kind, t.id::text AS subject_id, t.archetype, t.age_band, t.worry
      FROM coach_trials t WHERE t.is_preview = false
      UNION ALL
      SELECT 'paid' AS kind, p.user_id::text AS subject_id, a.archetype, a.age_band, (a.concerns->>0) AS worry
      FROM purchases p JOIN assessments a ON a.id = p.assessment_id WHERE p.status = 'paid'
    )
    SELECT o.outcome, count(*)::int AS n, count(DISTINCT o.subject_id)::int AS kids
    FROM coach_day_outcome_v o
    JOIN subj s ON s.kind = o.kind AND s.subject_id = o.subject_id
    WHERE s.archetype = ${archetype} AND s.age_band = ${ageBand}
      AND (${worry}::text IS NULL OR s.worry = ${worry})
    GROUP BY o.outcome
  `) as unknown as { outcome: string; n: number; kids: number }[];
  const kids = Math.max(0, ...rows.map((r) => r.kids));
  if (kids < MIN_COHORT) return null;
  const by = (o: string) => rows.filter((r) => r.outcome === o).reduce((a, r) => a + r.n, 0);
  const worked = by("tried_worked"), partly = by("tried_partly"), didnt = by("tried_didnt_work");
  const total = worked + partly + didnt;
  if (total === 0) return null;
  return { worked, partly, didnt, total };
}

export function formatWorksStat(stat: WorksStat, child: string): string {
  if (!stat) return "";
  const pct = (n: number) => Math.round((n / stat.total) * 100);
  return `\n\nWhat tends to work for children like ${child} (anonymised, ${stat.total} tries): the choice-based steps were reported as working or partly working ${pct(stat.worked + stat.partly)}% of the time. Prefer those, but adapt to what this parent tells you.`;
}
