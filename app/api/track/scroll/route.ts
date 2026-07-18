import { assertBootGuards } from "@/lib/boot-guard";
import { getSql } from "@/lib/db/client";

assertBootGuards();

const VALID_PAGES = new Set(["landing", "report"]);
const VALID_DEPTHS = new Set([25, 50, 75, 100]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { session_id, page, depth } = body ?? {};

  if (
    typeof session_id !== "string" || !UUID_RE.test(session_id) ||
    typeof page !== "string" || !VALID_PAGES.has(page) ||
    !VALID_DEPTHS.has(Number(depth))
  ) {
    return new Response("bad request", { status: 400 });
  }

  const sql = getSql();
  try {
    await sql`
      INSERT INTO funnel_events (event_type, session_id, metadata)
      VALUES ('scroll_milestone', ${session_id}::uuid, ${JSON.stringify({ page, depth })}::jsonb)
      ON CONFLICT (session_id, (metadata->>'page'), (metadata->>'depth'))
      WHERE event_type = 'scroll_milestone'
      DO NOTHING
    `;
  } catch (e) {
    console.warn("[track/scroll]", (e as Error).message);
  }

  return new Response("ok");
}
