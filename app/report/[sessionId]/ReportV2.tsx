// Report v2 (?report=v2) — the 7-card experience (Part 2), with the Plan page reached from
// the cards (Part 3). Default report stays v1; this is opt-in via ?report=v2 or a ?flow=v2
// session. Content is served from cache if warm, else an instant static fallback (no spinner)
// with a background generate for next time.
import { after } from "next/server";
import { getSql } from "@/lib/db/client";
import { viewReportV2, generateAndStoreReportV2 } from "@/lib/report-v2/service";
import { allGoals, CONCERN_GOAL, CONCERN_ALIAS, canonicalConcern, goalForConcern } from "@/lib/report-v2/goal-mapping";
import { strengthsFor } from "@/content/report-v2/archetype-extras";
import type { Gender } from "@/lib/report/pronouns";
import ReportV2Cards from "./ReportV2Cards";
import PlanV2 from "./PlanV2";

const CALENDLY = "https://calendly.com/attentionarchitect/attention-architect-discovery";
const CHECKIN_ENABLED = false; // next-day WhatsApp check-in (Phase 3) is not built yet.

export default async function ReportV2({ session, card, plan }: { session: string; card?: number; plan?: boolean }) {
  const content = await viewReportV2(session);
  if (!content) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
        <p>Report not found for this session.</p>
      </main>
    );
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT child_name, child_gender, age_band, report_v2_goal, parent_name, email, phone
    FROM assessments WHERE session_id = ${session}::uuid LIMIT 1
  `) as unknown as { child_name: string | null; child_gender: string | null; age_band: string | null; report_v2_goal: string | null; parent_name: string | null; email: string | null; phone: string | null }[];
  const r = rows[0] ?? { child_name: null, child_gender: null, age_band: null, report_v2_goal: null, parent_name: null, email: null, phone: null };
  const gender = (r.child_gender ?? null) as Gender;
  const goalOptions = allGoals(r.child_name ?? "", gender);
  const strengths = strengthsFor(content.archetype);

  // The parent's chosen goal (assessments.report_v2_goal) is the source of truth. It's read
  // LIVE here (not from the cached report_v2_content, whose goal is frozen at generation time),
  // so the cards' goal, the plan hero, and the week-by-week rows all follow a goal change —
  // even after a reload. Fall back to the recommended goal only when no choice is saved. The
  // chosen goal's concern key drives the plan's week outcomes.
  //
  // New rows store the canonical concern KEY; we rebuild the sentence from the mapping.
  // Legacy rows store the full sentence — fall back to reverse-matching it to a key.
  const savedGoal = r.report_v2_goal?.trim() ?? "";
  let effGoal: string;
  let effGoalKey: string;
  if (!savedGoal) {
    effGoal = content.goal;
    effGoalKey = content.concern;
  } else if (savedGoal in CONCERN_GOAL || savedGoal in CONCERN_ALIAS) {
    effGoalKey = canonicalConcern(savedGoal);
    effGoal = goalForConcern(savedGoal, r.child_name ?? "", gender);
  } else {
    effGoalKey = goalOptions.find((o) => o.text === savedGoal)?.key ?? content.concern;
    effGoal = savedGoal;
  }
  const effContent = { ...content, goal: effGoal };

  after(async () => {
    await generateAndStoreReportV2(session).catch((e: unknown) => console.warn("[report-v2] bg generate:", (e as Error).message));
    await sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('report_v2_view', ${session}::uuid, ${JSON.stringify({ archetype: content.archetype, source: content.source })}::jsonb)
    `.catch((e: unknown) => console.warn("[funnel] report_v2_view:", (e as Error).message));
  });

  if (plan) {
    return <PlanV2 sessionId={session} content={effContent} goalKey={effGoalKey} ageBand={r.age_band ?? "10-11"} childName={r.child_name} gender={gender} goalOptions={goalOptions} calendlyUrl={CALENDLY} checkinEnabled={CHECKIN_ENABLED} parentName={r.parent_name ?? ""} email={r.email ?? ""} phone={r.phone ?? ""} />;
  }

  return (
    <ReportV2Cards
      sessionId={session}
      content={effContent}
      strengths={strengths}
      ageBand={r.age_band ?? "10-11"}
      goalOptions={goalOptions}
      initialCard={card ?? 1}
      planHref={`?report=v2&plan=1`}
      calendlyUrl={CALENDLY}
      checkinEnabled={CHECKIN_ENABLED}
    />
  );
}
