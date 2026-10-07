// Report-generation health from report_generation_log (phase 52): the 7-day LLM-vs-fallback split
// + fallback reasons for the admin Overview tile, and a yesterday-only check for the daily alert.
import { getSql } from "@/lib/db/client";

type Sql = ReturnType<typeof getSql>;

export type ReportHealth = {
  total: number; llm: number; fallback: number; llmPct: number; fallbackPct: number;
  reasons: { reason: string; count: number }[];
};

// Last 7 days, all sessions (internal included — this is an ops/quality view, not a funnel metric).
export async function reportHealth7d(sql: Sql): Promise<ReportHealth> {
  try {
    const [agg] = (await sql`
      SELECT COUNT(*)::int total,
             COUNT(*) FILTER (WHERE outcome='llm')::int llm,
             COUNT(*) FILTER (WHERE outcome='fallback')::int fallback
      FROM report_generation_log WHERE created_at > now() - interval '7 days'
    `) as unknown as { total: number; llm: number; fallback: number }[];
    const reasons = (await sql`
      SELECT reason, COUNT(*)::int count FROM report_generation_log
      WHERE created_at > now() - interval '7 days' AND outcome='fallback' AND reason IS NOT NULL
      GROUP BY reason ORDER BY count DESC
    `) as unknown as { reason: string; count: number }[];
    const total = agg?.total ?? 0, fallback = agg?.fallback ?? 0, llm = agg?.llm ?? 0;
    return {
      total, llm, fallback,
      llmPct: total ? Math.round((llm / total) * 100) : 0,
      fallbackPct: total ? Math.round((fallback / total) * 100) : 0,
      reasons,
    };
  } catch {
    return { total: 0, llm: 0, fallback: 0, llmPct: 0, fallbackPct: 0, reasons: [] }; // table absent pre-migration
  }
}

// Yesterday (IST) — for the daily alert. breach = ≥5 reports AND >15% fallback.
export async function yesterdayFallback(sql: Sql): Promise<{ date: string; total: number; fallback: number; pct: number; breach: boolean }> {
  const [r] = (await sql`
    SELECT ((now() AT TIME ZONE 'Asia/Kolkata')::date - 1)::text AS date,
           COUNT(*)::int total,
           COUNT(*) FILTER (WHERE outcome='fallback')::int fallback
    FROM report_generation_log
    WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date - 1
  `) as unknown as { date: string; total: number; fallback: number }[];
  const total = r?.total ?? 0, fallback = r?.fallback ?? 0;
  const pct = total ? Math.round((fallback / total) * 100) : 0;
  return { date: r?.date ?? "", total, fallback, pct, breach: total >= 5 && pct > 15 };
}
