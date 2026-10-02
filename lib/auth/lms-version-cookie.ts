// Non-authoritative hint cookie telling middleware which LMS experience a user
// belongs to, so it can route /lms ⇄ /lms-v2 without a DB call on the edge.
// Set at login / set-password alongside the session cookie. The /lms-v2 layout
// still does the authoritative users.lms_version check; this is only a fast path.
// Absent (legacy sessions) → middleware does nothing, so /lms is never disturbed.
const SESSION_DAYS = 30;

export const LMS_VER_COOKIE = "lms_ver";

export const LMS_VER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 86400,
  secure: process.env.NODE_ENV === "production",
};

export function lmsVerFor(v: string | null | undefined): "v1" | "v2" {
  return v === "v1" ? "v1" : "v2";
}
