// Loose sql type so this file needn't import the db client's concrete type.
type WaSqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

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
  // for ALL template variables — not Meta's typed body/button components. Names
  // match the approved WATI Utility template `send_assessment_new` exactly
  // (case-sensitive): body variable `name` = the parent's name, and button URL
  // variable "1" = the session id. This template has NO child_name variable, so
  // childName is accepted for signature compatibility but not sent.
  void childName;
  const body = {
    template_name: "send_assessment_new",
    broadcast_name: "send_assessment_new",
    parameters: [
      { name: "name", value: parentName },
      { name: "1",    value: sessionId }, // URL-button suffix = session id
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

// Upserts the WATI contact with lifecycle attributes — call this ONLY after a report
// send has succeeded and whatsapp_report_sent_at is stamped. WATI's addContact endpoint
// creates-or-updates, so the contact the send just created is updated in place.
//
// purchased="no" is a POSITIVE CONTROL: it is always written, so a contact is only ever
// enrolled in a drip with a known purchase state (never by absence of the field).
//
// This function NEVER throws — a failed attribute write must not fail the send — but it
// logs LOUDLY, because a contact that never received purchased=no must NOT be enrolled in
// any drip. Fetches archetype / parent_instinct / assessment date / utm source itself so
// the three send sites (claim, claim-phone, retry cron) call it identically.
export async function upsertWatiContactAfterSend(
  sql: WaSqlFn,
  sessionId: string,
  rawPhone: string,
  parentName: string,
): Promise<void> {
  const to = normalizePhone(rawPhone);
  if (!to) {
    console.error(`[wati] contact upsert SKIPPED — invalid phone, session ${sessionId} NOT stamped purchased=no (do not enrol)`);
    return;
  }
  const endpoint = process.env.WATI_API_ENDPOINT;
  const token = process.env.WATI_ACCESS_TOKEN;
  if (!endpoint || !token) {
    console.error(`[wati] contact upsert SKIPPED — WATI not configured, session ${sessionId} NOT stamped purchased=no (do not enrol)`);
    return;
  }
  try {
    const rows = (await sql`
      SELECT r.archetype, r.parent_instinct, a.created_at, a.utm->>'utm_source' AS utm_source
      FROM reports r
      JOIN assessments a ON a.id = r.assessment_id
      WHERE a.session_id = ${sessionId}::uuid AND r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT 1
    `) as { archetype: string | null; parent_instinct: string | null; created_at: string | Date | null; utm_source: string | null }[];
    const row = rows[0] ?? { archetype: null, parent_instinct: null, created_at: null, utm_source: null };

    const d = row.created_at ? new Date(row.created_at) : new Date();
    const assessmentDate = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    // First-touch UTM is not captured yet (utm is {} for every production session), so
    // source is "unknown" today; it flows through automatically once utm.source is populated.
    const source = row.utm_source ?? "unknown";

    const body = {
      name: parentName,
      customParams: [
        { name: "session_id", value: sessionId },
        { name: "purchased", value: "no" },
        { name: "consent", value: "report" },
        { name: "assessment_date", value: assessmentDate },
        { name: "source", value: source },
        { name: "archetype", value: row.archetype ?? "" },
        { name: "parent_instinct", value: row.parent_instinct ?? "" },
      ],
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(`${endpoint}/api/v1/addContact/${to}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || data.result === false) {
        console.error(`[wati] contact upsert FAILED — ****${to.slice(-4)} session ${sessionId} NOT stamped purchased=no (do not enrol): ${res.status} ${JSON.stringify(data)}`);
        return;
      }
      console.log(`[wati] contact upsert ok ****${to.slice(-4)} session ${sessionId} purchased=no source=${source}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error(`[wati] contact upsert TIMEOUT (8s) — ****${to.slice(-4)} session ${sessionId} NOT stamped purchased=no (do not enrol)`);
      } else {
        console.error(`[wati] contact upsert error — session ${sessionId} NOT stamped purchased=no (do not enrol):`, (err as Error).message);
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error(`[wati] contact upsert DB/error — session ${sessionId} NOT stamped purchased=no (do not enrol):`, (err as Error).message);
  }
}
