// WhatsApp chat widget + "Chat on WhatsApp" links sit behind this flag so they can be turned back
// on later WITHOUT a code change (set NEXT_PUBLIC_WA_WIDGET_ENABLED=true and redeploy). NEXT_PUBLIC
// so it is readable client-side (inlined at build). Off when unset.
export function waWidgetEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_WA_WIDGET_ENABLED;
  return v === "true" || v === "1";
}
