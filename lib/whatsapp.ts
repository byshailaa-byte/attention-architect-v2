function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  console.warn(`[whatsapp] invalid phone skipped: "${raw}" → digits="${digits}" len=${digits.length}`);
  return null;
}

export async function sendWhatsAppReport({
  parentName,
  childName,
  sessionId,
  rawPhone,
}: {
  parentName: string;
  childName: string;
  sessionId: string;
  rawPhone: string;
}): Promise<void> {
  try {
    const to = normalizePhone(rawPhone);
    if (!to) return;

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not set — skipping send");
      return;
    }

    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: "report_ready",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: parentName },
              { type: "text", text: childName },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              { type: "text", text: sessionId },
            ],
          },
        ],
      },
    };

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[whatsapp] API error", res.status, JSON.stringify(data));
    } else {
      console.log("[whatsapp] sent to", to, "session", sessionId, JSON.stringify(data));
    }
  } catch (e) {
    console.error("[whatsapp] unexpected error:", e);
  }
}
