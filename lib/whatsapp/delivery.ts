// Parent-facing report-delivery copy switches on the WhatsApp provider: "on screen & WhatsApp"
// when a provider is live (wati/cloud), "on screen" when none. Read client-side via the
// NEXT_PUBLIC mirror of the provider (the start/assessment/thank-you pages are client components).
// IMPORTANT: NEXT_PUBLIC_WHATSAPP_PROVIDER moves TOGETHER with WHATSAPP_PROVIDER — set both when
// switching providers (no code change needed, just the two env values + a redeploy).
export function waDeliveryActive(): boolean {
  const p = process.env.NEXT_PUBLIC_WHATSAPP_PROVIDER;
  return p === "wati" || p === "cloud";
}
