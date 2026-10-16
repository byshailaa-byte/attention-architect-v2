import { notFound } from "next/navigation";
import { getSql } from "@/lib/db/client";
import { fillTokens } from "@/lib/report/pronouns";
import type { AgeBand } from "@/content/types";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolvePreviewAccess } from "@/lib/coach-trial/access";
import { resolveTrialDays } from "@/lib/coach-trial/content";
import { TRIAL_DAILY_LIMIT } from "@/lib/coach-trial/limits";
import {
  introBubble, HOW_IT_WORKS, baselineQuestion,
  COMMIT_QUESTION, COMMIT_CHIPS, COMMIT_DONE, STEP_CARD_EYEBROW, READ_FULL_STEP,
} from "@/lib/coach-trial/onboarding";
import CoachClient from "@/app/coach/CoachClient";
import { LockScreen } from "@/app/coach/LockScreen";
import { PreviewAdminBar } from "./PreviewAdminBar";

const CALENDLY = "https://calendly.com/attentionarchitect/attention-architect-discovery";

// Preview Coach — the REAL parent Coach UI (reused CoachClient) plus an admin bar. Admin-only via the
// /admin/* Basic-Auth middleware. Resolves a sandbox (is_preview) trial by id; the day switcher is a
// simulated clock (?day=0..4). Day 0 = the first-open onboarding; Days 1–4 = the returning-day view.
export const dynamic = "force-dynamic";

export default async function CoachPreviewPage({
  params, searchParams,
}: {
  params: Promise<{ trialId: string }>;
  searchParams: Promise<{ day?: string; tod?: string }>;
}) {
  if (!coachTrialEnabled()) notFound();
  const { trialId } = await params;
  const sp = await searchParams;
  const day = Math.min(Math.max(parseInt(sp.day ?? "1", 10) || 0, 0), 5); // 5 = ended/results (LockScreen)
  const tod = sp.tod === "evening" ? "evening" : "morning";

  const access = await resolvePreviewAccess(trialId);
  if (access.role !== "trial") notFound();
  const { trial, userCtx } = access;
  const fill = fillTokens(userCtx.childName, userCtx.childGender);

  const days = await resolveTrialDays({
    sessionId: trial.session_id ?? "",
    archetype: userCtx.archetype,
    ageBand: userCtx.ageBand as AgeBand,
    childName: userCtx.childName,
    gender: userCtx.childGender,
  });

  // messagesLeft for the cap indicator (real IST-today count for this sandbox trial).
  const sql = getSql();
  const used = (await sql`
    SELECT COUNT(*)::int c FROM coach_messages
    WHERE trial_id = ${trial.id}::uuid AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  const messagesLeft = Math.max(0, TRIAL_DAILY_LIMIT - (used[0]?.c ?? 0));

  // Day 0 = first-open onboarding; Days 1–4 = returning view at that day.
  const onboardingDone = day >= 1;
  const trialDay = Math.max(day, 1);
  const bq = baselineQuestion(trial.worry ?? "other");

  // Day 5 = the post-trial "results" screen (the real LockScreen), shown so the admin can preview
  // what the parent sees once the 4 days end.
  if (day >= 5) {
    return (
      <div style={{ minHeight: "100dvh", background: "#fff" }}>
        <PreviewAdminBar trialId={trialId} day={day} tod={tod} focusConcern={trial.focus_concern} />
        <LockScreen
          childName={userCtx.childName}
          reportHref={`/report/${trial.session_id}?report=v2`}
          calendlyUrl={CALENDLY}
          baseline={trial.baseline_value}
          days={days}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#fff" }}>
      <PreviewAdminBar trialId={trialId} day={day} tod={tod} focusConcern={trial.focus_concern} />
      <CoachClient
        key={`${day}-${tod}`}
        childName={userCtx.childName}
        trialDay={trialDay}
        endsAt={trial.ends_at}
        messagesLeft={messagesLeft}
        onboardingDone={onboardingDone}
        worry={trial.worry ?? "other"}
        intro={fill(introBubble(trial.worry ?? "other"))}
        howItWorks={HOW_IT_WORKS}
        baselineQuestion={fill(bq.question)}
        baselineChips={bq.chips}
        commitQuestion={COMMIT_QUESTION}
        commitChips={COMMIT_CHIPS}
        commitDone={COMMIT_DONE}
        stepEyebrow={STEP_CARD_EYEBROW}
        readFullLabel={READ_FULL_STEP}
        days={days}
        messageEndpoint="/api/admin/coach-preview/message"
        onboardingEndpoint="/api/admin/coach-preview/onboarding"
        flagEndpoint="/api/admin/coach-preview/flag"
        extraBody={{ trialId, day: trialDay }}
      />
    </div>
  );
}
