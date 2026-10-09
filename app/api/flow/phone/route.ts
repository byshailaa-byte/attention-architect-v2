import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { trackServer } from "@/lib/analytics/track.server";
import { normalizePhone } from "@/lib/phone";

// Step 4 of the v2 flow: save the WhatsApp number against the flow session IMMEDIATELY
// (before the assessment row exists) and upsert the wa_contacts record. This is why the
// number survives even if the parent drops before finishing — it's captured at step 4,
// not step 7. The phone key is the normalised "+91" + 10 form (matches wa_contacts + lib/phone).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function internalPhones(): Set<string> {
  const raw = process.env.INTERNAL_PHONES ?? "";
  const out = new Set<string>();
  for (const part of raw.split(",")) {
    const n = normalizePhone(part.trim());
    if (n) out.add(n);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId: unknown = body?.session_id;
  const rawPhone: unknown = body?.phone;

  if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: "bad session" }, { status: 400 });
  }
  const phone = normalizePhone(typeof rawPhone === "string" ? rawPhone : "");
  if (!phone) {
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });
  }

  // is_internal: the operator's own test number (local-only INTERNAL_PHONES) OR the admin
  // cookie set in middleware on a valid /admin request (the production signal).
  const cookieInternal = req.cookies.get("aa_internal")?.value === "1";
  const isInternal = cookieInternal || internalPhones().has(phone);

  const sql = getSql();
  try {
    // flow_sessions should already exist (created on the start-screen mount); upsert to be safe.
    await sql`
      INSERT INTO flow_sessions (session_id, flow, is_internal, phone, phone_at)
      VALUES (${sessionId}::uuid, 'v2', ${isInternal}, ${phone}, now())
      ON CONFLICT (session_id) DO UPDATE SET
        phone       = EXCLUDED.phone,
        phone_at    = now(),
        is_internal = flow_sessions.is_internal OR EXCLUDED.is_internal
    `;
    // First-touch WhatsApp contact (first_source_type='assessment'); name/attributes are
    // filled later by upsertWatiContactAfterSend once the report is sent.
    await sql`
      INSERT INTO wa_contacts (phone, first_source_type)
      VALUES (${phone}, 'assessment')
      ON CONFLICT (phone) DO UPDATE SET last_seen_at = now()
    `;
    // phone_captured fires when the contact step (step 6) is submitted.
    await trackServer("phone_captured", {}, { sessionId });
    // The assessment row already exists by step 6 — propagate the internal flag so an
    // operator's test completion is excluded from the main funnels too.
    if (isInternal) {
      await sql`UPDATE assessments SET is_internal = true WHERE session_id = ${sessionId}::uuid`;
    }
  } catch (e) {
    console.error("[flow/phone] save failed:", (e as Error).message);
    return NextResponse.json({ error: "Could not save your number, please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
