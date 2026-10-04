// Report v2 timing: content is generated at ASSESSMENT COMPLETION (background, off the
// response path) and cached in report_v2_content. A parent must never wait on a spinner:
// on view, if the cache is warm we use it; if not, we render the static fallback INSTANTLY
// (no LLM) and kick a background generate so the next view is the full LLM version.
import "server-only";
import { getSql } from "@/lib/db/client";
import { generateReportV2, fallbackContentFor, type AssessmentInput } from "./generate";
import type { ReportV2Content } from "./types";

type Sql = ReturnType<typeof getSql>;

export async function readCachedReportV2(sql: Sql, sessionId: string): Promise<ReportV2Content | null> {
  try {
    const rows = (await sql`
      SELECT content FROM report_v2_content WHERE session_id = ${sessionId}::uuid LIMIT 1
    `) as unknown as { content: ReportV2Content }[];
    return rows[0]?.content ?? null;
  } catch {
    return null; // table missing pre-migration
  }
}

export async function loadAssessmentInput(sql: Sql, sessionId: string): Promise<AssessmentInput | null> {
  const rows = (await sql`
    SELECT child_name, child_gender, age_band, archetype, concerns, answers, dimensions, report_v2_goal
    FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
  `) as unknown as {
    child_name: string | null; child_gender: string | null; age_band: string | null;
    archetype: string | null; concerns: string[] | null; answers: Record<string, string>;
    dimensions: AssessmentInput["dimensions"]; report_v2_goal: string | null;
  }[];
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    childName: r.child_name, childGender: r.child_gender, ageBand: r.age_band,
    archetype: r.archetype, concerns: r.concerns, answers: r.answers ?? {},
    dimensions: r.dimensions ?? {}, v2Goal: r.report_v2_goal,
  };
}

// Generate (LLM → validate → judge → fallback) and store in the cache. Idempotent: if the
// cache is already warm it does nothing (no wasted LLM call). Safe to fire-and-forget.
export async function generateAndStoreReportV2(sessionId: string): Promise<void> {
  const sql = getSql();
  if (await readCachedReportV2(sql, sessionId)) return;
  const input = await loadAssessmentInput(sql, sessionId);
  if (!input) return;
  const { content } = await generateReportV2(input);
  try {
    await sql`
      INSERT INTO report_v2_content (session_id, content, source)
      VALUES (${sessionId}::uuid, ${JSON.stringify(content)}::jsonb, ${content.source})
      ON CONFLICT (session_id) DO NOTHING
    `;
  } catch (e) {
    console.warn("[report-v2] store content:", (e as Error).message);
  }
}

// What the view path renders: the cache if warm, else the instant fallback (no LLM).
export async function viewReportV2(sessionId: string): Promise<ReportV2Content | null> {
  const sql = getSql();
  const cached = await readCachedReportV2(sql, sessionId);
  if (cached) return cached;
  const input = await loadAssessmentInput(sql, sessionId);
  if (!input) return null;
  return fallbackContentFor(input); // instant, no spinner
}

// Expose the fallback builder for callers that already hold the input.
export { fallbackContentFor };
