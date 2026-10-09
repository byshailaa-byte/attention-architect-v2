// ════════════════════════════════════════════════════════════════════════════════
// SERVER TRACKER — the ONE place server routes emit analytics. Writes the funnel_events
// row (with app-level dedup for lead/purchase) and sends the Meta Conversions API event
// for conversions. The browser half (GA4, Meta Pixel) lives in track.ts.
//
// Dedup is enforced two ways: app-level here (NOT EXISTS guard, works even before the DB
// index ships) AND by the phase_54 partial unique indexes (belt and braces). The Pixel and
// CAPI events share a deterministic event_id (catalog.metaEventId) so Meta counts each once.
// ════════════════════════════════════════════════════════════════════════════════
import { getSql } from "@/lib/db/client";
import { sendCapiEvents, type CapiUserData } from "@/lib/meta/capi";
import { CATALOG, pickAdParams, consentAllowsAds, metaEventId } from "./catalog";

export type ServerTrackOpts = {
  sessionId?: string | null;
  // true when the request is internal test traffic (isInternalRequest || assessments.is_internal).
  internal?: boolean;
  // Skip the funnel_events insert (use when the client already wrote the row and the server
  // only needs to fire CAPI — e.g. begin_checkout).
  dbInsert?: boolean;
  // Skip the CAPI send even for a capi:true event (use to write the DB row synchronously before
  // the response, then fire CAPI separately inside after()). Default: send when catalog says so.
  sendCapi?: boolean;
  // App-level dedup strategy for the DB write.
  dedup?: "lead-session" | "purchase-pid";
  // CAPI (only used for events whose catalog spec has capi:true).
  capiUserData?: CapiUserData;
  eventSourceUrl?: string;
  // Override the deterministic event_id (e.g. begin_checkout uses an explicit client-supplied id).
  eventId?: string;
};

export async function trackServer(
  name: string,
  params: Record<string, unknown> = {},
  opts: ServerTrackOpts = {},
): Promise<void> {
  const sql = getSql();
  const spec = CATALOG[name];

  // 1) funnel_events row (dedup-aware), unless the client already wrote it.
  if (opts.dbInsert !== false && opts.sessionId) {
    const sid = opts.sessionId;
    const meta = JSON.stringify(params);
    try {
      if (opts.dedup === "lead-session") {
        // at most one generate_lead per session
        await sql`
          INSERT INTO funnel_events (event_type, session_id, metadata)
          SELECT ${name}, ${sid}::uuid, ${meta}::jsonb
          WHERE NOT EXISTS (
            SELECT 1 FROM funnel_events WHERE event_type = ${name} AND session_id = ${sid}::uuid
          )`;
      } else if (opts.dedup === "purchase-pid") {
        // at most one purchase per razorpay payment id
        const pid = typeof params.razorpay_payment_id === "string" ? params.razorpay_payment_id : null;
        await sql`
          INSERT INTO funnel_events (event_type, session_id, metadata)
          SELECT ${name}, ${sid}::uuid, ${meta}::jsonb
          WHERE ${pid}::text IS NULL OR NOT EXISTS (
            SELECT 1 FROM funnel_events WHERE event_type = ${name} AND metadata->>'razorpay_payment_id' = ${pid}
          )`;
      } else {
        await sql`
          INSERT INTO funnel_events (event_type, session_id, metadata)
          VALUES (${name}, ${sid}::uuid, ${meta}::jsonb)`;
      }
    } catch (e) {
      console.warn(`[track.server] funnel insert failed (${name}):`, (e as Error).message);
    }
  }

  // 2) Meta CAPI standard event, for conversions only. Never for internal traffic / no consent.
  if (opts.sendCapi !== false && spec?.capi && spec.metaStandard && !opts.internal && consentAllowsAds()) {
    try {
      await sendCapiEvents([{
        event_name: spec.metaStandard,
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId ?? metaEventId(name, { sessionId: opts.sessionId, params }) ?? `${name}:${opts.sessionId ?? ""}`,
        event_source_url: opts.eventSourceUrl,
        action_source: "website",
        userData: opts.capiUserData ?? {},
        custom_data: pickAdParams(params),
      }]);
    } catch (e) {
      console.warn(`[track.server] CAPI failed (${name}):`, (e as Error).message);
    }
  }
}
