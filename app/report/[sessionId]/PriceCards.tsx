"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

type Props = {
  sessionId: string;
  childName: string;
  weakestFirst: string;
};

export default function PriceCards({ sessionId, childName, weakestFirst }: Props) {
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { document.head.contains(s) && document.head.removeChild(s); };
  }, []);

  async function openModal(tier: "module1" | "full") {
    const res = await fetch("/api/checkout/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert((d as { error?: string }).error ?? "Could not create order. Please try again.");
      return;
    }
    const { orderId, amount, currency, keyId } = await res.json();
    if (typeof window.Razorpay === "undefined") {
      alert("Payment system still loading. Please try again in a moment.");
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "Attention Architect",
      description: tier === "module1" ? "Module 1 — Resistance" : "Full 6-Module Roadmap",
      theme: { color: "#F6C63D" },
    });
    rzp.open();
  }

  return (
    <div className="price-row" style={{ display: "flex", gap: "16px", maxWidth: "640px", margin: "0 auto" }}>
      {/* Module 1 */}
      <div style={{ flex: 1, background: "var(--card)", borderRadius: "16px", padding: "28px 24px", textAlign: "left" }}>
        <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "28px", color: "var(--ink)" }}>
          ₹499
        </div>
        <div style={{ fontSize: "13px", color: "#5C5950", margin: "8px 0 18px", lineHeight: 1.5 }}>
          {weakestFirst} first — the fastest place to see this actually work.
        </div>
        <button
          onClick={() => openModal("module1")}
          style={{ display: "block", width: "100%", background: "var(--ink)", color: "var(--paper)", textAlign: "center", fontFamily: BG, fontWeight: 800, fontSize: "14.5px", padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer" }}
        >
          Open Module 1 →
        </button>
      </div>

      {/* Full Roadmap */}
      <div style={{ flex: 1, background: "var(--marker-tint)", border: "2px solid var(--marker)", borderRadius: "16px", padding: "28px 24px", textAlign: "left", position: "relative" }}>
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--marker)", color: "var(--marker-ink)", fontSize: "10px", fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", padding: "4px 12px", borderRadius: "999px", whiteSpace: "nowrap" }}>
          Most Parents Choose This
        </div>
        <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "28px", color: "var(--ink)" }}>
          ₹999
        </div>
        <div style={{ fontSize: "13px", color: "#5C5950", margin: "8px 0 18px", lineHeight: 1.5 }}>
          All 6 weeks, sequenced specifically for {childName}.
        </div>
        <button
          onClick={() => openModal("full")}
          style={{ display: "block", width: "100%", background: "var(--marker-ink)", color: "var(--paper)", textAlign: "center", fontFamily: BG, fontWeight: 800, fontSize: "14.5px", padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer" }}
        >
          Open the Full Roadmap →
        </button>
      </div>
    </div>
  );
}
