import { assertBootGuards } from "@/lib/boot-guard";
import { getSql } from "@/lib/db/client";
import { CATALOG } from "@/lib/analytics/catalog";

assertBootGuards();

// The accepted event names ARE the analytics catalog keys — one source of truth. Adding an
// event to lib/analytics/catalog.ts allows it here; removing it (e.g. the retired
// founder_call_requested / report_section_view / pricing_variant_assigned) rejects it.
// Must stay a subset of the funnel_events_event_type_check DB CHECK (see migrations/phase_54).
const ALLOWED = new Set(Object.keys(CATALOG));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const eventType: unknown = body?.event_type;
  const sessionId: unknown = body?.session_id;
  const metadata: unknown = body?.metadata;

  if (typeof eventType !== "string") {
    return new Response("bad request", { status: 400 });
  }

  if (!ALLOWED.has(eventType)) {
    console.warn(`[funnel/event] rejected unknown event_type: "${eventType}" — add to ALLOWED and to the DB CHECK constraint if intentional`);
    return new Response("bad request", { status: 400 });
  }

  const hasSession = typeof sessionId === "string" && UUID_RE.test(sessionId);
  // whatsapp_click may be fired from a page with no resolvable session; every other
  // event requires a valid session UUID.
  if (!hasSession && eventType !== "whatsapp_click") {
    return new Response("bad request", { status: 400 });
  }

  const meta = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const sql = getSql();
  // funnel_events.session_id is NOT NULL, so a session-less whatsapp_click cannot be
  // stored — accept the request but skip the insert. (The widget already skips firing
  // when it can't resolve a session; this is the route-level contract.)
  if (hasSession) {
    try {
      await sql`
        INSERT INTO funnel_events (event_type, session_id, metadata)
        VALUES (${eventType}, ${sessionId as string}::uuid, ${JSON.stringify(meta)}::jsonb)
      `;
    } catch (e) {
      console.warn("[funnel] insert failed:", (e as Error).message);
    }
  }

  return new Response("ok");
}
