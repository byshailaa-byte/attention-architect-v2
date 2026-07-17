// Send transactional email via Resend if RESEND_API_KEY is set.
// Falls back to console.log in dev so local testing works without credentials.
const FROM = "Attention Architect <noreply@thehumandecision.com>";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[auth/email] RESEND_API_KEY not set — dev fallback`);
    console.log(`[auth/email] Password reset link for ${to}:`);
    console.log(`[auth/email] ${resetUrl}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: "Reset your Attention Architect password",
      text: [
        "Hi,",
        "",
        "Click the link below to reset your password. This link expires in 1 hour.",
        "",
        resetUrl,
        "",
        "If you didn't request this, you can ignore this email.",
        "",
        "— The Attention Architect team",
      ].join("\n"),
      html: `<p>Hi,</p>
<p>Click the link below to reset your password. This link expires in 1 hour.</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>If you didn't request this, you can ignore this email.</p>
<p>— The Attention Architect team</p>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[auth/email] Resend error: ${res.status} ${body}`);
  }
}
