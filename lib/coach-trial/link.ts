// Signed trial link: a token tied to a trial that sets the session and opens /coach. The token
// binds the trial id to its ends_at, so Extend/End (which change ends_at / status) invalidate the
// old link and the admin card shows the new one. No DB row — pure HMAC over (trialId, endsAtMs).
import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.LMS_SESSION_SECRET;
  if (!s) throw new Error("[coach-trial] LMS_SESSION_SECRET not set");
  return s;
}

function sig(trialId: string, endsAtISO: string): string {
  const payload = `coach-trial:${trialId}:${new Date(endsAtISO).getTime()}`;
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Token format: "{trialId}.{hmac}". trialId is a uuid (no dots); hmac is base64url (no dots).
export function makeTrialToken(trialId: string, endsAtISO: string): string {
  return `${trialId}.${sig(trialId, endsAtISO)}`;
}

export function trialTokenId(token: string): string | null {
  const parts = token.split(".");
  return parts.length === 2 && parts[0] ? parts[0] : null;
}

// Verify the token against the trial's CURRENT ends_at (loaded by the caller).
export function verifyTrialToken(token: string, endsAtISO: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = sig(parts[0], endsAtISO);
  try {
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function trialLinkFor(baseUrl: string, trialId: string, endsAtISO: string): string {
  return `${baseUrl}/api/coach/activate?token=${makeTrialToken(trialId, endsAtISO)}`;
}
