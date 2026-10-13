import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { assertBootGuards } from "@/lib/boot-guard";
import { recordDeliveryStatus } from "@/lib/whatsapp/outbox";

assertBootGuards();

// Meta WhatsApp Cloud API webhook. Scope (per decision): DELIVERY STATUSES ONLY — no inbound
// message storage, no admin inbox, no opt-in. GET verifies the subscription; POST verifies the
// X-Hub-Signature-256 HMAC and records sent/delivered/read/failed onto the outbox row.
//
// Env (names only): WA_VERIFY_TOKEN (GET verify), WA_APP_SECRET (POST signature).

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret || !header || !header.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("invalid signature", { status: 401 });
  }
  try {
    const body = JSON.parse(raw) as {
      entry?: { changes?: { value?: { statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[] } }[] }[];
    };
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const s of change.value?.statuses ?? []) {
          const reason = s.errors?.[0]?.title || s.errors?.[0]?.message;
          await recordDeliveryStatus(s.id, s.status, reason).catch((e) => console.warn("[wa-webhook] status update:", (e as Error).message));
        }
        // Inbound messages (change.value.messages) are intentionally ignored — statuses only.
      }
    }
  } catch (e) {
    console.error("[wa-webhook] parse:", (e as Error).message);
  }
  return NextResponse.json({ ok: true }); // always 200 after a valid signature (no retry storms)
}
