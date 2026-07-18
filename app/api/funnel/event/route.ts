import { assertBootGuards } from "@/lib/boot-guard";
import { getSql } from "@/lib/db/client";

assertBootGuards();

const ALLOWED = new Set(["assessment_started", "report_viewed"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const eventType: unknown = body?.event_type;
  const sessionId: unknown = body?.session_id;

  if (
    typeof eventType !== "string" ||
    typeof sessionId !== "string" ||
    !ALLOWED.has(eventType) ||
    !UUID_RE.test(sessionId)
  ) {
    return new Response("bad request", { status: 400 });
  }

  const sql = getSql();
  try {
    await sql`
      INSERT INTO funnel_events (event_type, session_id)
      VALUES (${eventType}, ${sessionId}::uuid)
      ON CONFLICT (session_id, event_type) DO NOTHING
    `;
  } catch (e) {
    // Table may not exist until migration runs — swallow gracefully
    console.warn("[funnel] insert failed:", (e as Error).message);
  }

  return new Response("ok");
}
