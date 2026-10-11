// Provider-agnostic WhatsApp outbox. Every outbound message (report + handbook) is written here
// FIRST as 'queued'. With WHATSAPP_PROVIDER=none (or on any send failure) it stays 'queued' and is
// never lost — the on-screen report/handbook buttons cover delivery. With =cloud, it sends via the
// Meta Cloud API and moves to 'sent'/'failed', and the queue drains automatically.
import { getSql } from "@/lib/db/client";
import { normalizePhone } from "@/lib/whatsapp";
import { sendTemplateCloud, reportComponents, handbookComponents } from "./cloud";

// Report template on the Cloud API — body params (parentName, childName) + URL button (sessionId),
// matching reportComponents(). Set REPORT_WA_TEMPLATE to the approved name if it differs.
export const REPORT_TEMPLATE = process.env.REPORT_WA_TEMPLATE || "report_ready";

export type WaKind = "report" | "handbook";
export type WaProvider = "cloud" | "none";

export function whatsappProvider(): WaProvider {
  return process.env.WHATSAPP_PROVIDER === "cloud" ? "cloud" : "none";
}

type EnqueueInput = {
  kind: WaKind;
  toPhone: string;              // normalised 91XXXXXXXXXX
  template: string;
  params: Record<string, string>;
  ref: string;                  // session_id (report) or handbook lead id — dedup key
};

// Write (or re-queue) one outbound message. Returns the row id + whether a cloud send was attempted.
export async function enqueueWhatsApp(input: EnqueueInput): Promise<{ id: string; status: string; attempted: boolean }> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO whatsapp_outbox (kind, to_phone, template, params, ref, status)
    VALUES (${input.kind}, ${input.toPhone}, ${input.template}, ${JSON.stringify(input.params)}::jsonb, ${input.ref}, 'queued')
    ON CONFLICT (kind, ref) WHERE ref IS NOT NULL
      DO UPDATE SET status   = CASE WHEN whatsapp_outbox.status = 'sent' THEN 'sent' ELSE 'queued' END,
                    to_phone = EXCLUDED.to_phone, template = EXCLUDED.template, params = EXCLUDED.params,
                    updated_at = now()
    RETURNING id, status
  `) as unknown as { id: string; status: string }[];
  const row = rows[0];
  let attempted = false;
  if (whatsappProvider() === "cloud" && row.status !== "sent") {
    attempted = true;
    await sendOutboxRow(row.id).catch(() => {}); // best-effort; stays 'queued' on failure
  }
  return { id: row.id, status: row.status, attempted };
}

// Send one queued row via the Cloud API (only runs when provider=cloud). Atomically claims the row
// so concurrent drains don't double-send.
export async function sendOutboxRow(id: string): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();
  const claimed = (await sql`
    UPDATE whatsapp_outbox SET claimed_at = now(), attempts = attempts + 1, updated_at = now()
    WHERE id = ${id}::uuid AND status = 'queued' AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes')
    RETURNING id, kind, to_phone, template, params, ref
  `) as unknown as { id: string; kind: WaKind; to_phone: string; template: string; params: Record<string, string> }[];
  if (claimed.length === 0) return { ok: false, error: "not claimable" };
  const r = claimed[0];
  const components = r.kind === "report"
    ? reportComponents({ parentName: r.params.parentName ?? "", childName: r.params.childName ?? "", sessionId: r.params.sessionId ?? "" })
    : handbookComponents({ name: r.params.name ?? "" });
  const res = await sendTemplateCloud({ to: r.to_phone, template: r.template, components });
  if (res.ok) {
    await sql`UPDATE whatsapp_outbox SET status='sent', provider='cloud', wa_message_id=${res.messageId ?? null}, sent_at=now(), last_error=NULL, updated_at=now() WHERE id=${id}::uuid`;
    return { ok: true };
  }
  // Keep it queued (never lost); record the error for the admin view.
  await sql`UPDATE whatsapp_outbox SET status='queued', last_error=${res.error ?? "send failed"}, claimed_at=NULL, updated_at=now() WHERE id=${id}::uuid`;
  return { ok: false, error: res.error };
}

// Drain up to `limit` queued rows (used by the cron and the admin "Send queued" button). No-op
// unless provider=cloud.
export async function drainQueued(limit = 25): Promise<{ provider: WaProvider; attempted: number; sent: number }> {
  if (whatsappProvider() !== "cloud") return { provider: "none", attempted: 0, sent: 0 };
  const sql = getSql();
  const ids = (await sql`SELECT id FROM whatsapp_outbox WHERE status='queued' ORDER BY created_at LIMIT ${limit}`) as unknown as { id: string }[];
  let sent = 0;
  for (const { id } of ids) { const r = await sendOutboxRow(id).catch(() => ({ ok: false })); if (r.ok) sent++; }
  return { provider: "cloud", attempted: ids.length, sent };
}

// Enqueue the report the moment its content is generated (called from the generation service). No-op
// if the phone isn't captured yet or the report was already sent. Once provider=cloud this sends
// within seconds of generation — not at the next daily cron run.
export async function enqueueReportForSession(sessionId: string): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    SELECT parent_name, child_name, phone, whatsapp_report_sent_at
    FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1
  `) as unknown as { parent_name: string | null; child_name: string | null; phone: string | null; whatsapp_report_sent_at: Date | null }[];
  const a = rows[0];
  if (!a || !a.phone || a.whatsapp_report_sent_at) return;
  const toPhone = normalizePhone(a.phone);
  if (!toPhone) return;
  const q = await enqueueWhatsApp({
    kind: "report", toPhone, template: REPORT_TEMPLATE,
    params: { parentName: a.parent_name ?? "Parent", childName: a.child_name ?? "your child", sessionId },
    ref: sessionId,
  });
  if (q.status === "sent") await sql`UPDATE assessments SET whatsapp_report_sent_at = NOW() WHERE session_id = ${sessionId}::uuid`;
}

export async function outboxCounts(): Promise<{ queued: number; sent: number; failed: number }> {
  const sql = getSql();
  const rows = (await sql`SELECT status, count(*)::int n FROM whatsapp_outbox GROUP BY status`) as unknown as { status: string; n: number }[];
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  return { queued: by.queued ?? 0, sent: by.sent ?? 0, failed: by.failed ?? 0 };
}
