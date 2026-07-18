import { assertBootGuards } from "@/lib/boot-guard";
import { getSql } from "@/lib/db/client";

assertBootGuards();

const ALLOWED = new Set([
  "assessment_started",
  "assessment_dimension_complete",
  "report_gate_view",
  "view_item",
  "begin_checkout",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const eventType: unknown = body?.event_type;
  const sessionId: unknown = body?.session_id;
  const metadata: unknown = body?.metadata;

  if (
    typeof eventType !== "string" ||
    typeof sessionId !== "string" ||
    !ALLOWED.has(eventType) ||
    !UUID_RE.test(sessionId)
  ) {
    return new Response("bad request", { status: 400 });
  }

  const meta = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};

  const sql = getSql();
  try {
    await sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES (${eventType}, ${sessionId}::uuid, ${JSON.stringify(meta)}::jsonb)
    `;
  } catch (e) {
    console.warn("[funnel] insert failed:", (e as Error).message);
  }

  return new Response("ok");
}
