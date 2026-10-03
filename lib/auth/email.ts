import { ENTITY } from "@/lib/entity";

// RESEND_FROM must be a verified sender on the Resend account.
// Verified domain: attentionarchitect.thehumandecision.in (unchanged — domain migration is separate).
// All links inside emails must point to attentionparents.thehumandecision.in (v2 domain).
const FROM_ADDRESS =
  process.env.RESEND_FROM ?? "no-reply@attentionarchitect.thehumandecision.in";
// Display name improves deliverability + trust (F2). Same address, named sender.
const FROM = `Attention Architect <${FROM_ADDRESS}>`;

// Shared footer (F3): legal name, support email, phone, physical address — the
// CAN-SPAM identity block, on both the receipt and the password-reset email.
function footerHtml(note: string): string {
  return `
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #eeeeee">
            <p style="margin:0 0 6px;font-size:12px;color:#aaa">Attention Architect &mdash; ${note}</p>
            <p style="margin:0;font-size:12px;color:#aaa">${ENTITY.legalName} &middot; ${ENTITY.address} &middot; <a href="mailto:${ENTITY.supportEmail}" style="color:#aaa">${ENTITY.supportEmail}</a> &middot; ${ENTITY.phoneDisplay}</p>
          </td>
        </tr>`;
}
function footerText(note: string): string {
  return ["", "—", `Attention Architect — ${note}`, `${ENTITY.legalName} · ${ENTITY.address} · ${ENTITY.supportEmail} · ${ENTITY.phoneDisplay}`].join("\n");
}

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
    // from carries the display name; reply_to routes replies to a monitored inbox (F2).
    body: JSON.stringify({ ...payload, from: FROM, reply_to: ENTITY.supportEmail }),
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

        ${footerHtml("this is a security email sent in response to a password reset request.")}

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
      footerText("this is a security email sent in response to a password reset request."),
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

export type ReceiptParams = {
  to: string;
  paymentId: string;
  amount: number;
  tier: string;
  paidAt: string;
  childName: string | null;
  setPasswordUrl: string;
  hasPassword?: boolean; // F4: returning buyer who already has a password
  loginUrl?: string;     // where "Log in" points
};

// F4: a returning buyer logs in; a new buyer sets a password.
export function receiptCta(params: ReceiptParams): { url: string; label: string } {
  return params.hasPassword
    ? { url: params.loginUrl ?? params.setPasswordUrl, label: "Log in to the programme" }
    : { url: params.setPasswordUrl, label: "Set your password and open the programme" };
}

function buildReceiptHtml(params: ReceiptParams): string {
  const amountStr = formatAmount(params.amount);
  const dateStr = formatDate(params.paidAt);
  const tierLabel = TIER_LABEL[params.tier] ?? params.tier;
  const cta = receiptCta(params);
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
                  <a href="${cta.url}"
                    style="color:#23242c;font-size:15px;font-family:Georgia,serif;text-decoration:none;font-weight:bold">
                    ${cta.label} &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;color:#555;font-size:13px">Questions? Email <a href="mailto:${ENTITY.supportEmail}" style="color:#555">${ENTITY.supportEmail}</a> or call <a href="tel:${ENTITY.phone}" style="color:#555">${ENTITY.phone}</a>.</p>
          </td>
        </tr>

        ${footerHtml("this is a transaction confirmation, not a request for payment.")}

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// F1: plain-text part mirroring the receipt HTML.
export function buildReceiptText(params: ReceiptParams): string {
  const cta = receiptCta(params);
  const tierLabel = TIER_LABEL[params.tier] ?? params.tier;
  const lines = [
    "Payment received — Attention Architect",
    "",
    "Thank you — your payment has been confirmed and your access is now active.",
    "",
    `Programme: ${tierLabel}`,
    `Amount paid: ${formatAmount(params.amount)}`,
    `Date: ${formatDate(params.paidAt)}`,
    `Payment ID: ${params.paymentId}`,
  ];
  if (params.childName) lines.push(`Child: ${params.childName}`);
  lines.push(
    "",
    params.childName ? `${params.childName}'s programme is ready whenever you are.` : "Your programme is ready whenever you are.",
    "",
    `${cta.label}: ${cta.url}`,
    "",
    `Questions? Email ${ENTITY.supportEmail} or call ${ENTITY.phoneDisplay}.`,
    footerText("this is a transaction confirmation, not a request for payment."),
  );
  return lines.join("\n");
}

// ── Report-ready email (v2 flow, step 7) ─────────────────────────────────────
// Sent when the parent finishes the v2 assessment. Same named sender, reply_to and
// CAN-SPAM footer as the receipt; a plain-text part mirrors the HTML; the single CTA
// points at the live /report/{uuid} link on the v2 domain.

export type ReportReadyParams = {
  to: string;
  parentName: string;
  childName: string | null;
  reportUrl: string;
};

function reportReadyChild(childName: string | null): string {
  return childName && childName.trim() ? childName.trim() : "your child";
}

function buildReportReadyHtml(p: ReportReadyParams): string {
  const kid = reportReadyChild(p.childName);
  const greeting = p.parentName ? `Hi ${p.parentName},` : "Hi,";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${kid}'s report is ready</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <tr>
          <td style="background:#23242c;padding:28px 40px">
            <p style="margin:0;font-size:13px;color:#a0a09a;letter-spacing:0.1em;text-transform:uppercase">Attention Architect</p>
            <h1 style="margin:6px 0 0;font-size:22px;font-weight:normal;color:#ffffff">${kid}&rsquo;s report is ready</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;color:#1a1a1a;font-size:15px;line-height:1.6">
            <p style="margin:0 0 20px">${greeting}</p>
            <p style="margin:0 0 24px">${kid}&rsquo;s attention report is ready. It&rsquo;s built entirely from your answers — the pattern underneath the behaviour, how your instinct meets it, and where to start.</p>

            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
              <tr>
                <td style="background:#F6C63D;border-radius:6px;padding:14px 28px">
                  <a href="${p.reportUrl}"
                    style="color:#23242c;font-size:15px;font-family:Georgia,serif;text-decoration:none;font-weight:bold">
                    Open ${kid}&rsquo;s report &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#555">Or paste this link into your browser:</p>
            <p style="margin:0;font-size:13px;color:#555"><a href="${p.reportUrl}" style="color:#555">${p.reportUrl}</a></p>
          </td>
        </tr>

        ${footerHtml("you&rsquo;re receiving this because you completed the free attention assessment.")}

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildReportReadyText(p: ReportReadyParams): string {
  const kid = reportReadyChild(p.childName);
  return [
    `${kid}'s report is ready — Attention Architect`,
    "",
    p.parentName ? `Hi ${p.parentName},` : "Hi,",
    "",
    `${kid}'s attention report is ready. It's built entirely from your answers — the pattern underneath the behaviour, how your instinct meets it, and where to start.`,
    "",
    `Open ${kid}'s report:`,
    p.reportUrl,
    footerText("you're receiving this because you completed the free attention assessment."),
  ].join("\n");
}

// Throws on a real send failure so the caller can decide whether to retry; the caller
// guarantees one send per assessment via a DB dedup stamp.
export async function sendReportReadyEmail(p: ReportReadyParams): Promise<void> {
  const kid = reportReadyChild(p.childName);
  await resendSend({
    from: FROM,
    to: [p.to],
    subject: `${kid}'s attention report is ready`,
    html: buildReportReadyHtml(p),
    text: buildReportReadyText(p),
  });
  console.log(`[email] report-ready sent`, { to: p.to });
}

export async function sendPurchaseReceipt(params: ReceiptParams): Promise<void> {
  try {
    await resendSend({
      from: FROM,
      to: [params.to],
      subject: "Payment received — Attention Architect",
      html: buildReceiptHtml(params),
      text: buildReceiptText(params),
    });
    console.log(`[email] receipt sent`, { paymentId: params.paymentId, to: params.to });
  } catch (err) {
    // Never let an email error block a webhook response or throw to the caller.
    console.error(`[email] receipt failed`, { paymentId: params.paymentId, to: params.to, err });
  }
}
