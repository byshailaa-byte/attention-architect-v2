import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import { getSql } from "@/lib/db/client";
import { fillTokens } from "@/lib/report/pronouns";
import type { AgeBand } from "@/content/types";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolveCoachAccess } from "@/lib/coach-trial/access";
import { resolveTrialDays } from "@/lib/coach-trial/content";
import { TRIAL_DAILY_LIMIT } from "@/lib/coach-trial/limits";
import {
  introBubble, HOW_IT_WORKS, baselineQuestion,
  COMMIT_QUESTION, COMMIT_CHIPS, COMMIT_DONE, STEP_CARD_EYEBROW, READ_FULL_STEP,
} from "@/lib/coach-trial/onboarding";
import CoachClient from "./CoachClient";
import { LockScreen } from "./LockScreen";

export const dynamic = "force-dynamic";
const CALENDLY = "https://calendly.com/attentionarchitect/attention-architect-discovery";

export default async function CoachPage() {
  const jar = await cookies();
  const userId = verifySessionToken(jar.get(COOKIE_NAME)?.value ?? "");
  if (!userId) redirect("/lms/login");

  const access = await resolveCoachAccess(userId);

  // Flag off: /coach is 404 for a trial parent (paid parents keep /lms).
  if (!coachTrialEnabled()) {
    if (access.role === "trial") notFound();
    if (access.role === "paid") redirect("/lms");
    redirect("/");
  }

  if (access.role === "paid") redirect("/lms");
  if (access.role === "none") redirect("/");

  const { trial, userCtx, locked, day } = access;
  const fill = fillTokens(userCtx.childName, userCtx.childGender);

  const days = await resolveTrialDays({
    sessionId: trial.session_id ?? "",
    archetype: userCtx.archetype,
    ageBand: userCtx.ageBand as AgeBand,
    childName: userCtx.childName,
    gender: userCtx.childGender,
  });

  if (locked) {
    return (
      <LockScreen
        childName={userCtx.childName}
        reportHref={`/report/${trial.session_id}?report=v2`}
        calendlyUrl={CALENDLY}
        baseline={trial.baseline_value}
        days={days}
      />
    );
  }

  const bq = baselineQuestion(trial.worry ?? "other");
  const sql = getSql();
  const used = (await sql`
    SELECT COUNT(*)::int c FROM coach_messages
    WHERE trial_id = ${trial.id}::uuid AND role = 'parent'
      AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
  `) as unknown as { c: number }[];
  const messagesLeft = Math.max(0, TRIAL_DAILY_LIMIT - (used[0]?.c ?? 0));

  return (
    <CoachClient
      childName={userCtx.childName}
      trialDay={day}
      endsAt={trial.ends_at}
      messagesLeft={messagesLeft}
      onboardingDone={!!trial.baseline_value}
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
    />
  );
}
