import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { deviceFromUA } from "@/lib/flow/device";

// Upsert ONE flow_sessions row per unified session id, at first touch of the v2 flow.
// Tags the arm (v1|v2), is_internal (admin/operator cookie), device class (from UA — raw
// UA never stored), and first-touch UTM. Called once on the v2 start screen mount.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: unknown = body?.session_id;
  const flow: unknown = body?.flow;
  const utm: unknown = body?.utm;

  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return new NextResponse("bad request", { status: 400 });
  }
  const flowArm = flow === "v2" ? "v2" : "v1";

  const utmValue: Record<string, string> = {};
  if (utm && typeof utm === "object" && !Array.isArray(utm)) {
    for (const k of ALLOWED_UTM) {
      const v = (utm as Record<string, unknown>)[k];
      if (typeof v === "string") utmValue[k] = v.slice(0, 256);
    }
  }

  const device = deviceFromUA(req.headers.get("user-agent"));
  // In production the operator testing ?flow=v2 is marked internal by the admin cookie
  // (set in middleware on a valid /admin Basic-Auth request). Locally, phone-based internal
  // marking (INTERNAL_PHONES) kicks in at step 4.
  const isInternal = req.cookies.get("aa_internal")?.value === "1";

  const sql = getSql();
  try {
    await sql`
      INSERT INTO flow_sessions (session_id, flow, is_internal, device, utm)
      VALUES (${sessionId}::uuid, ${flowArm}, ${isInternal}, ${device}, ${JSON.stringify(utmValue)}::jsonb)
      ON CONFLICT (session_id) DO UPDATE SET
        is_internal = flow_sessions.is_internal OR EXCLUDED.is_internal,
        device      = COALESCE(flow_sessions.device, EXCLUDED.device),
        utm         = CASE WHEN flow_sessions.utm = '{}'::jsonb THEN EXCLUDED.utm ELSE flow_sessions.utm END
    `;
  } catch (e) {
    console.warn("[flow/session] upsert failed:", (e as Error).message);
  }
  return NextResponse.json({ ok: true, device, is_internal: isInternal });
}
