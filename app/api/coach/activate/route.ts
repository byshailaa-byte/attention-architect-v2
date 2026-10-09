import { NextRequest, NextResponse } from "next/server";
import { assertBootGuards } from "@/lib/boot-guard";
import { createSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth/session";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { getTrialById } from "@/lib/coach-trial/trial";
import { trialTokenId, verifyTrialToken } from "@/lib/coach-trial/link";

assertBootGuards();

// Signed trial link → sets the session cookie and opens /coach. Works for phone-only parents (no
// password). Valid only while the trial is active and before ends_at; Extend/End change the valid
// token (ends_at is bound into the signature). GET so it can be opened straight from a link.
export async function GET(req: NextRequest) {
  // Same-origin redirects (works on dev localhost and prod alike).
  const base = req.nextUrl.origin;
  const fail = (reason: string) => NextResponse.redirect(`${base}/coach/expired?why=${reason}`, { status: 302 });

  if (!coachTrialEnabled()) return NextResponse.redirect(`${base}/`, { status: 302 });
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const trialId = trialTokenId(token);
  if (!trialId) return fail("invalid");

  const trial = await getTrialById(trialId);
  if (!trial || !trial.user_id) return fail("invalid");
  if (!verifyTrialToken(token, trial.ends_at)) return fail("invalid");
  if (trial.status !== "active") return fail("ended");
  if (Date.now() >= new Date(trial.ends_at).getTime()) return fail("expired");

  const res = NextResponse.redirect(`${base}/coach`, { status: 302 });
  res.cookies.set(COOKIE_NAME, createSessionToken(trial.user_id), COOKIE_OPTIONS);
  return res;
}
