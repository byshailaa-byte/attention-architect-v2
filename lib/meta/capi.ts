import { createHash } from "crypto";

const API_VERSION = "v19.0";

function sha256(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Indian numbers are stored as 10 digits — Meta requires country code prefix
  if (digits.length === 10) return "91" + digits;
  return digits;
}

export type CapiUserData = {
  email?: string | null;
  phone?: string | null;
  // Sent plain-text per Meta spec (not hashed)
  clientIp?: string | null;
  clientUserAgent?: string | null;
};

export type CapiEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: "website";
  userData: CapiUserData;
  custom_data?: Record<string, unknown>;
};

function buildUserData(ud: CapiUserData): Record<string, string> {
  const out: Record<string, string> = {};
  if (ud.email) out.em = sha256(ud.email);
  if (ud.phone) out.ph = sha256(normalizePhone(ud.phone));
  if (ud.clientIp) out.client_ip_address = ud.clientIp;
  if (ud.clientUserAgent) out.client_user_agent = ud.clientUserAgent;
  return out;
}

export async function sendCapiEvents(events: CapiEvent[]): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.warn("[capi] META_CAPI_ACCESS_TOKEN or NEXT_PUBLIC_META_PIXEL_ID not set — skipping");
    return;
  }

  const data = events.map(({ userData, ...ev }) => ({
    ...ev,
    user_data: buildUserData(userData),
  }));

  const body: Record<string, unknown> = {
    data,
    access_token: accessToken,
  };

  // test_event_code ONLY comes from env — never hardcoded, never present in production
  const testCode = process.env.META_CAPI_TEST_EVENT_CODE;
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[capi] POST ${res.status}: ${text.slice(0, 300)}`);
    } else {
      const json = await res.json().catch(() => ({})) as { events_received?: number };
      console.log(`[capi] events_received=${json.events_received}`);
    }
  } catch (e: unknown) {
    console.warn("[capi] fetch error:", (e as Error).message);
  }
}
