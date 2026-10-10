// Meta WhatsApp Cloud API sender — reuses the pre-WATI setup (commit a42b29a):
//   POST https://graph.facebook.com/<ver>/{WHATSAPP_PHONE_NUMBER_ID}/messages
// Env (names only; set in Vercel, never printed): WHATSAPP_ACCESS_TOKEN (system-user token),
// WHATSAPP_PHONE_NUMBER_ID. Only exercised when WHATSAPP_PROVIDER=cloud.
const GRAPH = "https://graph.facebook.com/v22.0";

function creds(): { token: string; phoneId: string } | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return token && phoneId ? { token, phoneId } : null;
}

export type CloudSendResult = { ok: boolean; messageId?: string; error?: string };

export async function sendTemplateCloud(opts: {
  to: string;
  template: string;
  components: unknown[];
  lang?: string;
}): Promise<CloudSendResult> {
  const c = creds();
  if (!c) return { ok: false, error: "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set" };
  try {
    const res = await fetch(`${GRAPH}/${c.phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "template",
        template: { name: opts.template, language: { code: opts.lang ?? "en" }, components: opts.components },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[] };
    if (!res.ok) return { ok: false, error: `${res.status} ${JSON.stringify(data).slice(0, 200)}` };
    return { ok: true, messageId: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Template components built from the stored outbox params.
export function reportComponents(p: { parentName: string; childName: string; sessionId: string }): unknown[] {
  return [
    { type: "body", parameters: [{ type: "text", text: p.parentName }, { type: "text", text: p.childName }] },
    { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: p.sessionId }] },
  ];
}
export function handbookComponents(p: { name: string }): unknown[] {
  return [{ type: "body", parameters: [{ type: "text", text: p.name }] }];
}
