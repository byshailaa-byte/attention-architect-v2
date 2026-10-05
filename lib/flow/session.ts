// Unified session id + flow-arm resolution for the start → assessment funnel.
// Client-safe (no server imports): used by the v2 start and assessment screens.

export const FLOW_SID_KEY = "aa_flow_sid";
export type FlowVariant = "v1" | "v2";

// ONE session id per tab, minted on first touch and carried across routes via
// sessionStorage (which survives same-tab client navigations — /simplified/start → /assessment).
// This single id is used for every v2 funnel event, the flow_sessions row, the assessment
// row, and the report URL — fixing the v1 "two disjoint id spaces" measurement gap.
export function getFlowSid(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem(FLOW_SID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(FLOW_SID_KEY, sid);
    }
    return sid;
  } catch {
    // Private-mode / storage-disabled fallback — a fresh id (events still fire, just unjoined).
    return crypto.randomUUID();
  }
}

// The v2 flow is now the DEFAULT: no param and anything but ?flow=v1 resolve to v2.
// ?flow=v1 is the explicit opt-out back to the old/live flow.
export function resolveFlowVariant(flowParam: string | null | undefined): FlowVariant {
  return flowParam === "v1" ? "v1" : "v2";
}
