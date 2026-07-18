// RESEND_FROM must be a verified sender on the Resend account.
// Verified domain: attentionarchitect.thehumandecision.in
// All links inside emails must point to attentionparents.thehumandecision.in (v2 domain).
const FROM =
  process.env.RESEND_FROM ?? "no-reply@attentionarchitect.thehumandecision.in";

async function resendSend(payload: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[email] RESEND_API_KEY not set — would have sent:");
    console.log(`[email]   to=${payload.to.join(",")} subject="${payload.subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, from: FROM }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[email] Resend error: ${res.status} ${body}`);
  }
}

// ── Password reset ───────────────────────────────────────────────────────────

function buildPasswordResetHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <tr>
          <td style="background:#23242c;padding:28px 40px">
            <p style="margin:0;font-size:13px;color:#a0a09a;letter-spacing:0.1em;text-transform:uppercase">Attention Architect</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:normal;color:#ffffff">Reset your password</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;color:#1a1a1a;font-size:15px;line-height:1.6">
            <p style="margin:0 0 24px">We received a request to reset your Attention Architect password. Click the button below to choose a new one.</p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
              <tr>
                <td style="background:#23242c;border-radius:6px;padding:14px 28px">
                  <a href="${resetUrl}"
                    style="color:#F6C63D;font-size:15px;font-family:Georgia,serif;text-decoration:none;font-weight:bold">
                    Reset my password &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#555">This link expires in <strong>1 hour</strong> and can only be used once.</p>
            <p style="margin:0;font-size:13px;color:#555">If you didn&rsquo;t request this, you can ignore this email — your password won&rsquo;t change.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px;border-top:1px solid #eeeeee">
            <p style="margin:0;font-size:12px;color:#aaa">Attention Architect &mdash; this is a security email sent in response to a password reset request.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await resendSend({
    from: FROM,
    to: [to],
    subject: "Reset your Attention Architect password",
    html: buildPasswordResetHtml(resetUrl),
    text: [
      "We received a request to reset your Attention Architect password.",
      "",
      "Reset link (expires in 1 hour):",
      resetUrl,
      "",
      "If you didn't request this, you can ignore this email.",
    ].join("\n"),
  });
}

// ── Purchase receipt ─────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  module1: "Module 1 — Resistance",
  full: "Full 6-Module Roadmap",
  topup: "Upgrade to Full Roadmap",
};

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function buildReceiptHtml(params: {
  paymentId: string;
  amount: number;
  tier: string;
  paidAt: string;
  childName: string | null;
  setPasswordUrl: string;
}): string {
  const amountStr = formatAmount(params.amount);
  const dateStr = formatDate(params.paidAt);
  const tierLabel = TIER_LABEL[params.tier] ?? params.tier;
  const childLine = params.childName
    ? `<p style="margin:0 0 8px"><strong>Child:</strong> ${params.childName}</p>`
    : "";
  const readyLine = params.childName
    ? `${params.childName}&rsquo;s programme is ready whenever you are.`
    : "Your programme is ready whenever you are.";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Payment received</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <tr>
          <td style="background:#23242c;padding:28px 40px">
            <p style="margin:0;font-size:13px;color:#a0a09a;letter-spacing:0.1em;text-transform:uppercase">Attention Architect</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:normal;color:#ffffff">Payment received</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;color:#1a1a1a;font-size:15px;line-height:1.6">
            <p style="margin:0 0 24px">Thank you — your payment has been confirmed and your access is now active.</p>

            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f9f9f9;border-radius:6px;padding:20px 24px;margin-bottom:28px">
              <tr><td style="padding:0 0 16px">
                <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.08em">Receipt details</p>
              </td></tr>
              <tr><td>
                <p style="margin:0 0 8px"><strong>Programme:</strong> ${tierLabel}</p>
                <p style="margin:0 0 8px"><strong>Amount paid:</strong> ${amountStr}</p>
                <p style="margin:0 0 8px"><strong>Date:</strong> ${dateStr}</p>
                <p style="margin:0 0 8px"><strong>Payment ID:</strong> <span style="font-family:monospace;font-size:13px;color:#555">${params.paymentId}</span></p>
                ${childLine}
              </td></tr>
            </table>

            <p style="margin:0 0 20px">${readyLine}</p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
              <tr>
                <td style="background:#F6C63D;border-radius:6px;padding:14px 28px">
                  <a href="${params.setPasswordUrl}"
                    style="color:#23242c;font-size:15px;font-family:Georgia,serif;text-decoration:none;font-weight:bold">
                    Set your password and open the programme &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#555;font-size:13px">Questions? Email us at <a href="mailto:support@thehumandecision.in" style="color:#555">support@thehumandecision.in</a>.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px;border-top:1px solid #eeeeee">
            <p style="margin:0 0 6px;font-size:12px;color:#aaa">Attention Architect &mdash; this is a transaction confirmation, not a request for payment.</p>
            <p style="margin:0;font-size:12px;color:#aaa">The Human Decision &middot; support@thehumandecision.in</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPurchaseReceipt(params: {
  to: string;
  paymentId: string;
  amount: number;
  tier: string;
  paidAt: string;
  childName: string | null;
  setPasswordUrl: string;
}): Promise<void> {
  try {
    await resendSend({
      from: FROM,
      to: [params.to],
      subject: "Payment received — Attention Architect",
      html: buildReceiptHtml(params),
    });
    console.log(`[email] receipt sent`, { paymentId: params.paymentId, to: params.to });
  } catch (err) {
    // Never let an email error block a webhook response or throw to the caller.
    console.error(`[email] receipt failed`, { paymentId: params.paymentId, to: params.to, err });
  }
}
