import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME_CONST = "lms_session";
const SESSION_DAYS = 30;

function secret(): string {
  const s = process.env.LMS_SESSION_SECRET;
  if (!s) throw new Error("[LMS] LMS_SESSION_SECRET is not set — cannot issue or verify sessions");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

// Token format: "{userId}.{expiresAt}.{hmac}"
// UUID has no dots; expiry (Unix ts) has no dots; hmac (base64url) has no dots.
// Splitting by "." yields exactly 3 parts.
export function createSessionToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, hmac] = parts;
  const payload = `${userId}.${expStr}`;

  const expected = sign(payload);
  try {
    const a = Buffer.from(hmac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;

  return userId;
}

export const COOKIE_NAME = COOKIE_NAME_CONST;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 86400,
  secure: process.env.NODE_ENV === "production",
};
