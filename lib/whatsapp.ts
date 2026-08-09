export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  console.warn(`[whatsapp] invalid phone skipped: "${raw}" → digits="${digits}" len=${digits.length}`);
  return null;
}

// Returns true if the message was actually sent, false if skipped (template not yet approved).
// Set HANDBOOK_WA_TEMPLATE to the Meta-approved template name to enable sends.
export async function sendWhatsAppHandbook({
  name,
  rawPhone,
  handbookUrl,
}: {
  name: string;
  rawPhone: string;
  handbookUrl: string;
}): Promise<boolean> {
  const templateName = process.env.HANDBOOK_WA_TEMPLATE ?? "";
  if (!templateName) {
    console.log("[whatsapp] HANDBOOK_WA_TEMPLATE not set — handbook lead saved, WhatsApp skipped until template approved");
    return false;
  }

  try {
    const to = normalizePhone(rawPhone);
    if (!to) return false;

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn("[whatsapp] credentials not set — skipping handbook send");
      return false;
    }

    // Template parameters depend on the approved template structure.
    // Assumed: one body text variable (parent name) + one URL button variable (url suffix).
    // Update component list to match the approved template when available.
    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", parameter_name: "parent_name", text: name },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              { type: "text", text: "handbook" },
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
      console.error("[whatsapp] handbook API error", res.status, JSON.stringify(data));
      return false;
    }
    console.log("[whatsapp] handbook sent to", to, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("[whatsapp] handbook unexpected error:", e);
    return false;
  }
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
              { type: "text", parameter_name: "parent_name", text: parentName },
              { type: "text", parameter_name: "child_name", text: childName },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              { type: "text", text: `report/${sessionId}` },
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
