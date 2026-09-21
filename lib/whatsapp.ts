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
              { type: "text", parameter_name: "customer_name", text: name },
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

// Throws on any failure so the caller's try/catch can release the claim and skip sent_at.
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
  const to = normalizePhone(rawPhone); // 91XXXXXXXXXX — WATI wants the country code
  if (!to) throw new Error(`invalid phone: "${rawPhone}"`);

  // Transport moved from the Meta Cloud API to WATI (the number 9993374923 now
  // lives on WATI). Everything around this call — the claim, dedup flags, retry
  // cron, MAX_WA_ATTEMPTS — is unchanged; only the HTTP call differs, and the
  // function still THROWS on any failure so callers retry / release the claim.
  const endpoint = process.env.WATI_API_ENDPOINT;
  const token    = process.env.WATI_ACCESS_TOKEN;
  if (!endpoint || !token) {
    throw new Error("WATI_API_ENDPOINT or WATI_ACCESS_TOKEN not set");
  }

  // WATI's sendTemplateMessage takes a FLAT `parameters` array of {name, value}
  // for ALL template variables — body vars AND the URL-button suffix — not Meta's
  // typed body/button components. Names match the approved WATI Utility template
  // `report_new_users` exactly (case-sensitive): body vars parent_name / child_name,
  // and button URL variable "1" whose value is the session id suffix.
  const body = {
    template_name: "report_new_users",
    broadcast_name: "report_new_users",
    parameters: [
      { name: "parent_name", value: parentName },
      { name: "child_name",  value: childName },
      { name: "1",           value: sessionId }, // URL-button suffix = session id
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(
      `${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${to}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    // WATI can return HTTP 200 with { result: false } (e.g. invalid number,
    // template not approved) — treat that as a failure too, so the caller retries.
    if (!res.ok || data.result === false) {
      throw new Error(`WATI sendTemplateMessage ${res.status}: ${JSON.stringify(data)}`);
    }
    console.log("[whatsapp] WATI sent to", to, "session", sessionId, JSON.stringify(data));
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("WATI sendTemplateMessage timed out after 8s");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
