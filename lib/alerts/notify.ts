// Ops alerting via Resend — same raw-fetch pattern as lib/auth/email.ts (no SDK).
// sendOpsAlert MUST NEVER THROW: it is called from failure paths (report generation,
// cron) where a thrown alert would mask or worsen the original error. On any problem
// — missing config, Resend non-2xx, network/abort — it logs loudly and returns.
//
// Recipient is env ALERT_EMAIL. Sender reuses RESEND_FROM (a verified Resend sender).

const FROM = process.env.RESEND_FROM ?? "no-reply@attentionarchitect.thehumandecision.in";

/**
 * Format an ops-alert body from a fixed, PII-free field set. Callers must route all
 * alert content through here so parent/child names, phones, and emails never leak into
 * an alert. The error is truncated to 500 chars.
 */
export function opsAlertBody(fields: {
  sessionId?: string | null;
  stage: string;
  error?: string | null;
  attempts?: number | null;
}): string {
  const err = (fields.error ?? "").slice(0, 500);
  return [
    `stage: ${fields.stage}`,
    `session_id: ${fields.sessionId ?? "(unknown)"}`,
    `generation_attempts: ${fields.attempts ?? "(n/a)"}`,
    `error: ${err || "(none)"}`,
    `timestamp: ${new Date().toISOString()}`,
  ].join("\n");
}

export async function sendOpsAlert(subject: string, body: string): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.ALERT_EMAIL;
    if (!apiKey || !to) {
      const missing = !apiKey ? "RESEND_API_KEY" : "ALERT_EMAIL";
      console.error(`OPS ALERT NOT DELIVERED: ${subject} — ${missing} not set\n${body}`);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject: `[ops] ${subject}`, text: body }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`OPS ALERT NOT DELIVERED: ${subject} — Resend ${res.status} ${errBody}`);
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.error(`OPS ALERT NOT DELIVERED: ${subject} — ${(e as Error).message}`);
  }
}
