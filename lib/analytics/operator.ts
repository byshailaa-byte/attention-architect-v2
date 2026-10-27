// Operator/admin browser detection for analytics gating. `aa_internal=1` is set by middleware on any
// /admin visit (30-day cookie; it already drives flow_sessions.is_internal). An operator opening a
// parent's /report, /plan or /roadmap writes events on the PARENT's session — so is_internal filtering
// does NOT catch them. These views must therefore never write funnel_events or reach an ad platform;
// they are recorded in admin_view_log instead. Pure + framework-free so both client and server share it.
export function isOperatorCookieValue(v: string | undefined | null): boolean {
  return v === "1";
}
export function cookieHeaderHasOperator(cookieString: string | undefined | null): boolean {
  return !!cookieString && /(?:^|;\s*)aa_internal=1(?:;|$)/.test(cookieString);
}
