// Ingest one WATI inbound-message webhook payload into wa_contacts / wa_events.
// Extracted from the route so it is unit-testable with a fake sql. NEVER stores message text.
import { normalizePhone } from "@/lib/phone";
import { matchNeedsHuman } from "@/lib/leads/needs-human";

type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export type WatiPayload = Record<string, unknown>;

export async function processWatiEvent(sql: SqlFn, body: WatiPayload | null): Promise<void> {
  if (!body) return;

  const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
  const waId = str(body.waId);
  const owner = body.owner === true;                       // sent by us (outbound) — ignore
  const text = typeof body.text === "string" ? body.text : null;
  const watiMessageId = str(body.whatsappMessageId) ?? str(body.id);
  const sourceId = str(body.sourceId);
  const sourceUrl = str(body.sourceUrl);
  const sourceType = body.sourceType != null ? String(body.sourceType) : null;
  const senderName = str(body.senderName);

  if (owner) return;                                        // only inbound from the customer
  const phone = normalizePhone(waId);
  if (!phone) return;

  // Idempotency: skip if this message id was already ingested.
  if (watiMessageId) {
    const dup = (await sql`SELECT 1 FROM wa_events WHERE wati_message_id = ${watiMessageId} LIMIT 1`) as unknown[];
    if (dup.length > 0) return;
  }

  // Keyword safeguarding match — the matched word becomes the reason; the text is then discarded.
  const reason = matchNeedsHuman(text);

  const existing = (await sql`SELECT phone FROM wa_contacts WHERE phone = ${phone} LIMIT 1`) as unknown[];
  const isFirst = existing.length === 0;

  // Upsert contact. first_source_* are set ONLY on insert (not in the DO UPDATE set) so
  // the first ad referral is never overwritten.
  await sql`
    INSERT INTO wa_contacts (phone, name, first_source_id, first_source_url, first_source_type, first_seen_at, last_seen_at)
    VALUES (${phone}, ${senderName}, ${sourceId}, ${sourceUrl}, ${sourceType}, now(), now())
    ON CONFLICT (phone) DO UPDATE SET
      last_seen_at = now(),
      name = COALESCE(wa_contacts.name, EXCLUDED.name)
  `;

  // One event per message: ad_click when a source is present on the first message, else inbound.
  const eventType = isFirst && sourceId ? "ad_click" : "inbound";
  await sql`
    INSERT INTO wa_events (phone, event_type, wati_message_id, source_id)
    VALUES (${phone}, ${eventType}, ${watiMessageId}, ${sourceId})
    ON CONFLICT (wati_message_id) DO NOTHING
  `;

  // Safeguarding: flag needs_human (idempotently) and record a handoff event on first flag.
  if (reason) {
    const flagged = (await sql`
      UPDATE wa_contacts
      SET needs_human = true,
          needs_human_reason = COALESCE(needs_human_reason, ${reason}),
          needs_human_at = COALESCE(needs_human_at, now()),
          handled_at = NULL
      WHERE phone = ${phone} AND needs_human = false
      RETURNING phone
    `) as unknown[];
    if (flagged.length > 0) {
      await sql`INSERT INTO wa_events (phone, event_type, source_id) VALUES (${phone}, 'handoff', ${null})`;
    }
  }
  // text is intentionally never written to the database.
}
