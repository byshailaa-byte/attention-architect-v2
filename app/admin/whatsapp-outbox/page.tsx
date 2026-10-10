import { outboxCounts, whatsappProvider } from "@/lib/whatsapp/outbox";
import { DrainButton } from "./DrainButton";

// Admin WhatsApp outbox dashboard — queued / sent / failed, and a "Send queued" button that's
// disabled until the provider is cloud. Protected by the /admin Basic-Auth middleware.
export const dynamic = "force-dynamic";

export default async function WhatsAppOutboxPage() {
  const provider = whatsappProvider();
  const c = await outboxCounts();
  const card = (label: string, n: number, color: string) => (
    <div style={{ flex: "1 1 120px", background: "#fff", border: "1px solid #e7e0d2", borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "#9a927c", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{n}</div>
    </div>
  );
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif", color: "#14284D" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>WhatsApp outbox</h1>
      <p style={{ fontSize: 13.5, color: "#6b6756", marginBottom: 20 }}>
        Provider: <strong>{provider}</strong>. Every report + handbook message is written here first; with
        <code> none</code> it stays queued (nothing lost) and the on-screen buttons cover delivery.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {card("Queued", c.queued, "#B8860B")}
        {card("Sent", c.sent, "#2F7D4F")}
        {card("Failed", c.failed, "#C2543B")}
      </div>
      <DrainButton enabled={provider === "cloud"} />
    </div>
  );
}
