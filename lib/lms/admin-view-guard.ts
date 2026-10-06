// Server-side read-only guard for the admin "view as user" feature.
//
// Admin view is now decided ONLY by a request header (x-aa-admin-view: 1) that the admin-view
// client (AdminLmsView) attaches to its own /api/lms/* calls. It is strictly request-scoped — it
// cannot leak into a later request or a different browser. (The old cookie approach was sticky:
// a path=/ cookie set during view-as-user kept 403'ing the SAME browser's later normal-parent
// session; see the Coach bug.) Forging the header only blocks the forger.
import { NextResponse, type NextRequest } from "next/server";

export const ADMIN_VIEW_HEADER = "x-aa-admin-view";
export const ADMIN_VIEW_COOKIE = "aa_lms_view"; // legacy — only expired now, never read

export function isAdminLmsView(req: NextRequest): boolean {
  return req.headers?.get?.(ADMIN_VIEW_HEADER) === "1";
}

// Returns a 403 Response when the request is from the admin view, else null.
export function blockIfAdminView(req: NextRequest): NextResponse | null {
  if (isAdminLmsView(req)) {
    return NextResponse.json({ error: "Admin view — read only" }, { status: 403 });
  }
  return null;
}
