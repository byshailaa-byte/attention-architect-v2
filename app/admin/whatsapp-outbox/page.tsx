import { outboxCounts, whatsappProvider } from "@/lib/whatsapp/outbox";
import { DrainButton } from "./DrainButton";
import { RetryFailedButton } from "./RetryFailedButton";

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
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
        <DrainButton enabled={provider !== "none"} />
        <RetryFailedButton failed={c.failed} />
      </div>
      {c.errors.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", color: "#9a927c", marginBottom: 8 }}>Latest error codes</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {c.errors.map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #ece8da" }}>
                  {/* Truncated display; full error on hover (title). */}
                  <td title={e.error} style={{ padding: "6px 6px", color: "#6b6756", maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "help" }}>{e.error}</td>
                  <td style={{ padding: "6px 6px", textAlign: "right", fontWeight: 700 }}>{e.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
