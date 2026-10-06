// Server-side read-only guard for the admin "view as user" feature.
//
// While an operator is viewing a customer's LMS (admin route .../view/...), the middleware sets a
// short-lived, non-session marker cookie `aa_lms_view=1` (path=/). Every LMS mutation API checks
// for it first and returns 403 — so even if a disabled button were bypassed, no write happens.
// This cookie is NOT the customer's session; it only marks "this browser is mid-admin-view".
import { NextResponse, type NextRequest } from "next/server";

export const ADMIN_VIEW_COOKIE = "aa_lms_view";

export function isAdminLmsView(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_VIEW_COOKIE)?.value === "1";
}

// Returns a 403 Response when in admin view, else null. Use at the top of every LMS mutation.
export function blockIfAdminView(req: NextRequest): NextResponse | null {
  if (isAdminLmsView(req)) {
    return NextResponse.json({ error: "Admin view — read only" }, { status: 403 });
  }
  return null;
}
