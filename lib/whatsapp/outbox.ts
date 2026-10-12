// Provider-agnostic WhatsApp outbox. Every outbound message (report + handbook) is written here
// FIRST as 'queued', then sent via the active provider. With WHATSAPP_PROVIDER=none (or on any send
// failure) the row stays 'queued' with the error and is never lost — the on-screen report/handbook
// buttons cover delivery. Providers:
//   • wati  — send via the existing WATI senders (send_assessment_new / handbook_send).
//   • cloud — send via the Meta Cloud API (lib/whatsapp/cloud.ts). Committed but unused for now.
//   • none  — queue only.
import { getSql } from "@/lib/db/client";
import { normalizePhone, sendWhatsAppReport, sendWatiHandbook } from "@/lib/whatsapp";
import { sendTemplateCloud, reportComponents, handbookComponents } from "./cloud";

// Report template stored on the outbox row. WATI's sendWhatsAppReport uses send_assessment_new; the
// Cloud path uses report_ready. Default matches the active provider (WATI). Override via env.
export const REPORT_TEMPLATE = process.env.REPORT_WA_TEMPLATE || "send_assessment_new";

export type WaKind = "report" | "handbook";
export type WaProvider = "cloud" | "wati" | "none";

export function whatsappProvider(): WaProvider {
  const p = process.env.WHATSAPP_PROVIDER;
  return p === "cloud" ? "cloud" : p === "wati" ? "wati" : "none";
}

// A number that isn't on WhatsApp → add the parent to the Calls queue (call_log) so they get a
// call/SMS with their report link. Report rows only (handbook leads aren't in the Calls queue).
// Deduped per assessment. Exported so the one-off backfill can reuse it.
export async function routeNotOnWhatsApp(kind: WaKind, sessionId?: string): Promise<void> {
  if (kind !== "report" || !sessionId) return;
  const sql = getSql();
  const a = (await sql`SELECT id FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1`) as unknown as { id: string }[];
  if (!a[0]) return;
  // Dedup on the note (call_log.outcome is CHECK-constrained, so the tag lives in notes). Surfaced
  // as a 'callback' due now (segment A) so the parent appears in the Calls queue immediately.
  const note = "WhatsApp unreachable: share report link";
  const exists = (await sql`SELECT 1 FROM call_log WHERE assessment_id = ${a[0].id} AND notes = ${note} LIMIT 1`) as unknown as unknown[];
  if (exists.length) return;
  await sql`
    INSERT INTO call_log (assessment_id, segment, outcome, notes, follow_up_at, called_by)
    VALUES (${a[0].id}, 'A', 'callback', ${note}, now(), 'system')
  `;
}

const MAX_FAST_ATTEMPTS = 8;    // fast retries (~5-min spacing) before switching to hourly
const RETRY_WINDOW_HOURS = 24;  // keep retrying hourly until this long after the first attempt, then fail
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type EnqueueInput = {
  kind: WaKind;
  toPhone: string;              // normalised 91XXXXXXXXXX
  template: string;
  params: Record<string, string>;
  ref: string;                  // session_id (report) or handbook lead id — dedup key
};

// Write (or re-queue) one outbound message. Returns the row id + whether a send was attempted.
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
  // New messages send right away (report ~30s after generation via enqueueReportForSession; handbook
  // on sign-up). 'none' leaves it queued (never lost).
  if (whatsappProvider() !== "none" && row.status !== "sent") {
    attempted = true;
    await sendOutboxRow(row.id).catch(() => {}); // best-effort; stays 'queued' on failure
    // Opportunistic drain: each new send also clears up to 5 OLDER queued messages, so the backlog
    // shrinks between cron runs. Best-effort; respects the 1/sec WATI limit.
    await drainQueued(5).catch(() => {});
  }
  return { id: row.id, status: row.status, attempted };
}

// Send one queued row via the active provider. Atomically claims the row (status + 5-min guard) so
// concurrent drains never double-send. On failure the row stays 'queued' with the error; claimed_at
// is left set so the 5-minute guard backs the retry off.
export async function sendOutboxRow(id: string): Promise<{ ok: boolean; error?: string }> {
  const sql = getSql();
  const provider = whatsappProvider();
  if (provider === "none") return { ok: false, error: "provider is none" };
  // Short claim guard (2 min) prevents two concurrent drains double-claiming the same row during a
  // send; the retry backoff itself (5 min fast / 1 h hourly) is enforced by drainQueued's SELECT.
  const claimed = (await sql`
    UPDATE whatsapp_outbox
    SET claimed_at = now(), attempts = attempts + 1, first_attempt_at = COALESCE(first_attempt_at, now()), updated_at = now()
    WHERE id = ${id}::uuid AND status = 'queued' AND (claimed_at IS NULL OR claimed_at < now() - interval '2 minutes')
    RETURNING id, kind, to_phone, template, params
  `) as unknown as { id: string; kind: WaKind; to_phone: string; template: string; params: Record<string, string> }[];
  if (claimed.length === 0) return { ok: false, error: "not claimable" };
  const r = claimed[0];
  const p = r.params;

  let res: { ok: boolean; error?: string; messageId?: string };
  if (provider === "wati") {
    res = r.kind === "report"
      ? await sendWhatsAppReport({ parentName: p.parentName ?? "Parent", childName: p.childName ?? "your child", sessionId: p.sessionId ?? "", rawPhone: r.to_phone })
      : await sendWatiHandbook({ firstName: p.name ?? "there", contactName: p.name ?? "there", rawPhone: r.to_phone });
  } else {
    const components = r.kind === "report"
      ? reportComponents({ parentName: p.parentName ?? "", childName: p.childName ?? "", sessionId: p.sessionId ?? "" })
      : handbookComponents({ name: p.name ?? "" });
    res = await sendTemplateCloud({ to: r.to_phone, template: r.template, components });
  }

  if (res.ok) {
    await sql`UPDATE whatsapp_outbox SET status='sent', provider=${provider}, wa_message_id=${res.messageId ?? null}, sent_at=now(), last_error=NULL, updated_at=now() WHERE id=${id}::uuid`;
    return { ok: true };
  }
  // A number that isn't on WhatsApp can never be delivered → mark failed (not_on_whatsapp) and route
  // the parent to the Calls queue for a call/SMS with their report link. Other errors stay queued.
  if (/"validWhatsAppNumber"\s*:\s*false/i.test(res.error ?? "")) {
    await sql`UPDATE whatsapp_outbox SET status='failed', last_error=${`not_on_whatsapp: ${res.error ?? ""}`}, updated_at=now() WHERE id=${id}::uuid`;
    await routeNotOnWhatsApp(r.kind, p.sessionId).catch((e) => console.warn("[outbox] route to calls:", (e as Error).message));
  } else {
    await sql`UPDATE whatsapp_outbox SET status='queued', last_error=${res.error ?? "send failed"}, updated_at=now() WHERE id=${id}::uuid`;
  }
  return { ok: false, error: res.error };
}

// Drain queued rows, OLDEST FIRST (so messages queued since the 2b deploy go out first). No-op on
// provider=none. WATI is rate-limited to ≤ 1 message/second. Retry schedule: the first
// MAX_FAST_ATTEMPTS tries are spaced ~5 min; after that it keeps retrying hourly until
// RETRY_WINDOW_HOURS since the first attempt, then the row is marked 'failed'. No double-send
// (atomic claim + dedup by ref).
export async function drainQueued(limit = 200): Promise<{ provider: WaProvider; attempted: number; sent: number; failed: number }> {
  const provider = whatsappProvider();
  if (provider === "none") return { provider, attempted: 0, sent: 0, failed: 0 };
  const sql = getSql();
  // Give up: still queued MAX_FAST_ATTEMPTS+ tries in and past the 24h window → mark failed.
  await sql`
    UPDATE whatsapp_outbox SET status='failed', updated_at=now()
    WHERE status='queued' AND attempts >= ${MAX_FAST_ATTEMPTS}
      AND first_attempt_at IS NOT NULL AND first_attempt_at < now() - ${`${RETRY_WINDOW_HOURS} hours`}::interval
  `;
  // Due for a retry: fast phase (5-min spacing) for the first attempts, then hourly within the window.
  const ids = (await sql`
    SELECT id FROM whatsapp_outbox
    WHERE status='queued' AND (
      (attempts < ${MAX_FAST_ATTEMPTS} AND (claimed_at IS NULL OR claimed_at < now() - interval '5 minutes'))
      OR (attempts >= ${MAX_FAST_ATTEMPTS}
          AND (first_attempt_at IS NULL OR first_attempt_at > now() - ${`${RETRY_WINDOW_HOURS} hours`}::interval)
          AND (claimed_at IS NULL OR claimed_at < now() - interval '1 hour'))
    )
    ORDER BY created_at LIMIT ${limit}
  `) as unknown as { id: string }[];
  let sent = 0, failed = 0;
  for (const { id } of ids) {
    const r = await sendOutboxRow(id).catch(() => ({ ok: false as const }));
    if (r.ok) sent++; else failed++;
    if (provider === "wati") await sleep(1000); // ≤ 1 message/second
  }
  return { provider, attempted: ids.length, sent, failed };
}

// "Retry failed" — put failed rows back in the queue with a fresh retry window.
export async function retryFailed(): Promise<{ requeued: number }> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE whatsapp_outbox
    SET status='queued', attempts=0, first_attempt_at=NULL, claimed_at=NULL, updated_at=now()
    WHERE status='failed'
    RETURNING id
  `) as unknown as { id: string }[];
  return { requeued: rows.length };
}

// Mark one queued row as sent BY HAND (operator sent it another way). provider='manual' records that
// it wasn't sent by WATI/Cloud, so the drain never re-sends it. Only acts on a queued row.
export async function markSentManual(id: string): Promise<{ ok: boolean }> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE whatsapp_outbox
    SET status='sent', provider='manual', sent_at=now(), last_error=NULL, updated_at=now()
    WHERE id = ${id}::uuid AND status = 'queued'
    RETURNING id
  `) as unknown as { id: string }[];
  return { ok: rows.length > 0 };
}

// The "not yet sent" (queued) rows for the admin delivery table. report rows carry the session id in
// `ref` (→ report link); handbook rows don't. No raw phone leaves here (admin masks it).
export async function listQueued(limit = 100): Promise<{ id: string; kind: WaKind; ref: string; attempts: number; last_error: string | null; created_at: string; to_phone: string }[]> {
  const sql = getSql();
  return (await sql`
    SELECT id::text, kind, ref, attempts, last_error, created_at, to_phone
    FROM whatsapp_outbox WHERE status = 'queued'
    ORDER BY created_at ASC LIMIT ${limit}
  `) as unknown as { id: string; kind: WaKind; ref: string; attempts: number; last_error: string | null; created_at: string; to_phone: string }[];
}

// Enqueue the report the moment its content is generated (called from the generation service). No-op
// if the phone isn't captured yet or the report was already sent. Sends right away on wati/cloud.
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

export async function outboxCounts(): Promise<{ queued: number; sent: number; failed: number; errors: { error: string; n: number }[] }> {
  const sql = getSql();
  const rows = (await sql`SELECT status, count(*)::int n FROM whatsapp_outbox GROUP BY status`) as unknown as { status: string; n: number }[];
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n]));
  // Latest error codes (across queued + failed), most common first. Full text (shown on hover in the
  // admin UI). This is the operator's own tool, so a recipient number inside a WATI error is fine here.
  const errs = (await sql`
    SELECT last_error AS error, count(*)::int n
    FROM whatsapp_outbox WHERE last_error IS NOT NULL GROUP BY last_error ORDER BY n DESC LIMIT 8
  `) as unknown as { error: string; n: number }[];
  return { queued: by.queued ?? 0, sent: by.sent ?? 0, failed: by.failed ?? 0, errors: errs };
}
