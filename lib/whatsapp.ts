// Loose sql type so this file needn't import the db client's concrete type.
type WaSqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  console.warn(`[whatsapp] invalid phone skipped: "${raw}" → digits="${digits}" len=${digits.length}`);
  return null;
}

// Handbook WhatsApp delivery moved from the Meta Cloud API to WATI when the
// number 9993374923 moved to WATI — see sendWatiHandbook at the bottom of this
// file. The old Meta Cloud sender (and HANDBOOK_WA_TEMPLATE) was removed.

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

// Normalises a child's name for the WATI `child_name` attribute. Single source of truth,
// shared by the report-send upsert and the one-off backfill. Behaviour: trim; empty →
// literal "your child" (never omitted, so the payload can't be rejected and templates read
// "…for your child"); entirely lowercase → Title-Case each word; otherwise exactly as
// entered. This casing is for the WATI sync only — the report's own rendering is untouched.
export function normalizeChildName(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return "your child";
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed.replace(/(^|\s)(\S)/g, (_m, sp, ch) => sp + ch.toUpperCase());
  }
  return trimmed;
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
      SELECT r.archetype, r.parent_instinct, a.created_at, a.utm->>'utm_source' AS utm_source, a.child_name
      FROM reports r
      JOIN assessments a ON a.id = r.assessment_id
      WHERE a.session_id = ${sessionId}::uuid AND r.status = 'published'
      ORDER BY r.created_at DESC
      LIMIT 1
    `) as { archetype: string | null; parent_instinct: string | null; created_at: string | Date | null; utm_source: string | null; child_name: string | null }[];
    const row = rows[0] ?? { archetype: null, parent_instinct: null, created_at: null, utm_source: null, child_name: null };

    const d = row.created_at ? new Date(row.created_at) : new Date();
    const assessmentDate = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
    // First-touch UTM is not captured yet (utm is {} for every production session), so
    // source is "unknown" today; it flows through automatically once utm.source is populated.
    const source = row.utm_source ?? "unknown";

    const childName = normalizeChildName(row.child_name);

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
        { name: "child_name", value: childName },
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
      console.log(`[wati] contact upsert ok ****${to.slice(-4)} session ${sessionId} purchased=no source=${source} child_name_source=${childName === "your child" ? "fallback" : "entered"}`);
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

// Handbook delivery over WATI. Same call shape as sendWhatsAppReport.
//
// 1. addContact sets name + source=handbook. We NEVER set the "consent"
//    attribute: a WATI automation rule triggers on it and would double-send.
//    This step is best-effort (logged, non-fatal) — WATI auto-creates the
//    contact on template send, so a failed attribute write must not block it.
// 2. sendTemplateMessage("handbook_send") with ONE body param `name` (the
//    parent's first name, "there" when empty). The template's button is a
//    STATIC URL, so NO button parameter is sent.
//
// Returns { ok: true } on a confirmed send, else { ok: false, error } with
// WATI's error (no phone number in the message, for the caller's ops alert).
export async function sendWatiHandbook({
  firstName,
  contactName,
  rawPhone,
}: {
  firstName: string;
  contactName: string;
  rawPhone: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = normalizePhone(rawPhone);
  if (!to) return { ok: false, error: `invalid phone` };

  const endpoint = process.env.WATI_API_ENDPOINT;
  const token = process.env.WATI_ACCESS_TOKEN;
  if (!endpoint || !token) return { ok: false, error: "WATI_API_ENDPOINT or WATI_ACCESS_TOKEN not set" };

  const headers = {
    Authorization: `Bearer ${token.replace(/^Bearer\s+/i, "")}`,
    "Content-Type": "application/json",
  };

  // 1. addContact — source=handbook. NO "consent" attribute (double-send rule).
  try {
    const cRes = await fetch(`${endpoint}/api/v1/addContact/${to}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: contactName, customParams: [{ name: "source", value: "handbook" }] }),
    });
    const cData = (await cRes.json().catch(() => ({}))) as Record<string, unknown>;
    if (!cRes.ok || cData.result === false) {
      console.error(`[whatsapp] handbook addContact non-fatal fail ****${to.slice(-4)}: ${cRes.status} ${JSON.stringify(cData)}`);
    }
  } catch (e) {
    console.error(`[whatsapp] handbook addContact error ****${to.slice(-4)}:`, (e as Error).message);
  }

  // 2. sendTemplateMessage — handbook_send, one body param `name`; static-URL button → no button param.
  const body = {
    template_name: "handbook_send",
    broadcast_name: "handbook_send",
    parameters: [{ name: "name", value: firstName || "there" }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(`${endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${to}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || data.result === false) {
      return { ok: false, error: `WATI sendTemplateMessage ${res.status}: ${JSON.stringify(data)}` };
    }
    console.log("[whatsapp] WATI handbook sent to", to, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "WATI sendTemplateMessage timed out after 8s" };
    }
    return { ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}
