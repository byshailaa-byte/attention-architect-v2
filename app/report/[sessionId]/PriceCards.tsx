"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

const TIER_AMOUNT: Record<"module1" | "full", number> = { module1: 499, full: 999 };

type Props = {
  sessionId: string;
  childName: string;
  weakestFirst: string;
};

function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

function fireFbq(type: "track" | "trackCustom", event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(type, event, params ?? {});
  }
}

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

export default function PriceCards({ sessionId, childName, weakestFirst }: Props) {
  const firedViewItem = useRef(false);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { document.head.contains(s) && document.head.removeChild(s); };
  }, []);

  useEffect(() => {
    if (firedViewItem.current) return;
    firedViewItem.current = true;
    fireEvent("view_item", sessionId, { tiers: ["module1", "full"] });
    fireGtag("view_item", {
      items: [
        { item_id: "module1", item_name: "Module 1 — Resistance", price: 499, currency: "INR" },
        { item_id: "full", item_name: "Full 6-Module Roadmap", price: 999, currency: "INR" },
      ],
    });
    fireFbq("track", "ViewContent", { content_ids: ["module1", "full"], content_type: "product", currency: "INR" });
  }, [sessionId]);

  async function openModal(tier: "module1" | "full") {
    const value = TIER_AMOUNT[tier];

    fireEvent("begin_checkout", sessionId, { tier, value });
    fireGtag("begin_checkout", { value, currency: "INR", items: [{ item_id: tier, price: value }] });
    fireFbq("track", "InitiateCheckout", { value, currency: "INR", content_name: tier });

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
      handler: function (response: { razorpay_payment_id: string }) {
        fireGtag("purchase", {
          transaction_id: response.razorpay_payment_id,
          value,
          currency: "INR",
          items: [{ item_id: tier, price: value }],
        });
        fireFbq("track", "Purchase", { value, currency: "INR", content_name: tier });
        window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
      },
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
          Get First Module
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
          Invest in the Full Roadmap
        </button>
      </div>
    </div>
  );
}
