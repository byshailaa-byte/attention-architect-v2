// One-time backfill: deliver the queued handbook_leads (wa_sent = false) over
// WATI. Pure-ish and dependency-injected so it's unit-testable: the caller
// passes `sql` and the `send` function (the route passes the real
// sendWatiHandbook; tests pass a fake). PII-safe — no phone numbers in the
// return value or any log line.
//
// Idempotent: it only ever selects wa_sent = false rows and only marks a
// phone's rows true after a confirmed send, so a second run touches nothing
// that already went out.

import { normalizePhone } from "@/lib/phone";

type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export type HandbookSend = (args: {
  firstName: string;
  contactName: string;
  rawPhone: string;
}) => Promise<{ ok: boolean; error?: string }>;

export type BackfillResult = {
  sent: number;
  failed: number;
  invalid: number;
  skipped_duplicates: number;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function backfillQueuedHandbooks(
  sql: SqlFn,
  send: HandbookSend,
  delayMs = 1000,
): Promise<BackfillResult> {
  const rows = (await sql`
    SELECT id, name, phone FROM handbook_leads
    WHERE wa_sent = false
    ORDER BY created_at ASC
  `) as unknown as { id: number; name: string | null; phone: string }[];

  // Group still-queued rows by normalized phone; count unsendable rows as invalid.
  const groups = new Map<string, { ids: number[]; name: string }>();
  let invalid = 0;
  for (const r of rows) {
    const norm = normalizePhone(r.phone);
    if (!norm) { invalid++; continue; }
    const g = groups.get(norm);
    if (g) g.ids.push(r.id);
    else groups.set(norm, { ids: [r.id], name: (r.name ?? "").trim() });
  }

  let sent = 0;
  let failed = 0;
  let skipped_duplicates = 0;
  let first = true;

  for (const [norm, g] of groups) {
    skipped_duplicates += g.ids.length - 1; // extra rows collapsed into this one send
    if (!first) await sleep(delayMs);        // ~1s between sends; none before the first
    first = false;

    const firstName = g.name.split(/\s+/)[0] ?? "";
    const result = await send({ firstName, contactName: g.name, rawPhone: norm });

    if (result.ok) {
      // Mark EVERY queued row for this phone as sent — one send covers them all.
      await sql`UPDATE handbook_leads SET wa_sent = true WHERE id = ANY(${g.ids}::int[])`;
      sent++;
    } else {
      failed++; // leave wa_sent = false and continue; no phone in the log
      console.error(`[handbook/send-queued] send failed for one phone (${g.ids.length} row(s))`);
    }
  }

  return { sent, failed, invalid, skipped_duplicates };
}
