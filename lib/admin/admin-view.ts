import "server-only";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db/client";
import { isOperatorCookieValue } from "@/lib/analytics/operator";

// True when the current request comes from an operator/admin browser (aa_internal=1, set by middleware
// on any /admin visit). Report/plan/roadmap pages use this to SKIP funnel_events + analytics and log
// the view to admin_view_log instead — so an operator opening a parent's report never pollutes the
// parent's funnel. next/headers cookies() is request-scoped; safe in RSC / route handlers.
export async function isOperatorRequest(): Promise<boolean> {
  try {
    const c = await cookies();
    return isOperatorCookieValue(c.get("aa_internal")?.value);
  } catch {
    return false; // non-request scope → treat as public (fail open to normal tracking)
  }
}

// Record an operator's view of a parent-facing page (report / plan / roadmap) in admin_view_log instead
// of the funnel. Best-effort, never throws. Requires phase_78 (session_id + kind columns).
export async function logAdminView(kind: string, sessionId: string, path: string): Promise<void> {
  try {
    await getSql()`INSERT INTO admin_view_log (session_id, kind, path) VALUES (${sessionId}::uuid, ${kind}, ${path})`;
  } catch (e) {
    console.warn("[admin_view_log] insert failed:", (e as Error).message);
  }
}
