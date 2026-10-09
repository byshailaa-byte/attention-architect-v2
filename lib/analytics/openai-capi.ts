// OpenAI (ChatGPT) ads Conversions API. Server-to-server; shares the event_id with the browser
// pixel for dedup. Fire-and-forget with a 3s timeout — a failure NEVER blocks the lead or the
// WhatsApp send. The Authorization bearer (OPENAI_ADS_API_KEY) is never logged or printed.
// validate_only is controlled by OPENAI_ADS_VALIDATE_ONLY (set true on a preview deploy to test).

export type OpenAiConversion = {
  eventId: string;       // shared with the pixel, e.g. "lead:<sessionId>"
  openaiEvent: string;   // e.g. "lead_created"
  sourceUrl: string;     // the page URL of the lead
  timestampMs: number;
};

export async function sendOpenAiConversion(c: OpenAiConversion): Promise<{ status: number | null; detail: string }> {
  const pid = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID;
  const key = process.env.OPENAI_ADS_API_KEY;
  if (!pid || !key) {
    console.warn("[openai-capi] NEXT_PUBLIC_OPENAI_PIXEL_ID or OPENAI_ADS_API_KEY not set — skipping");
    return { status: null, detail: "missing pid/key" };
  }
  const validateOnly = process.env.OPENAI_ADS_VALIDATE_ONLY === "true";
  const body = {
    validate_only: validateOnly,
    events: [{
      id: c.eventId,
      type: c.openaiEvent,
      timestamp_ms: c.timestampMs,
      source_url: c.sourceUrl,
      action_source: "web",
      data: { type: "customer_action" },
    }],
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(`https://bzr.openai.com/v1/events?pid=${pid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => "");
    console.log(`[openai-capi] ${c.openaiEvent} status=${res.status}${validateOnly ? " (validate_only)" : ""}`);
    return { status: res.status, detail: text.slice(0, 500) };
  } catch (e) {
    console.warn(`[openai-capi] ${c.openaiEvent} failed: ${(e as Error).message}`);
    return { status: null, detail: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}
