"use client";

import { useEffect } from "react";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

type Props = {
  sessionId: string;
  childName: string;
  parentName: string;
  email: string;
  phone: string;
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

export default function ClosingCtaButton({ sessionId, childName, parentName, email, phone }: Props) {
  useEffect(() => {
    if (!document.querySelector('script[src*="checkout.razorpay"]')) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  async function open() {
    const value = 999;
    fireEvent("begin_checkout", sessionId, { tier: "full", value });
    fireGtag("begin_checkout", { value, currency: "INR", items: [{ item_id: "full", price: value }] });
    fireFbq("track", "InitiateCheckout", { value, currency: "INR", content_name: "full" });

    const res = await fetch("/api/checkout/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier: "full" }),
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
    new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "Attention Architect",
      description: `${childName}'s Six-Week Journey`,
      prefill: { name: parentName, email, contact: phone },
      theme: { color: "#F6C63D" },
      handler: function (response: { razorpay_payment_id: string }) {
        fireGtag("purchase", { transaction_id: response.razorpay_payment_id, value, currency: "INR", items: [{ item_id: "full", price: value }] });
        fireFbq("track", "Purchase", { value, currency: "INR", content_name: "full" });
        window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
      },
    }).open();
  }

  return (
    <div style={{ background: "rgba(240,197,80,.14)", border: "1.5px solid var(--marker)", borderRadius: "18px", padding: "30px 24px", position: "relative", maxWidth: "480px", margin: "0 auto" }}>
      {/* Badge */}
      <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "var(--marker)", color: "#1a1a1f", fontSize: "10px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", padding: "4px 14px", borderRadius: "999px", whiteSpace: "nowrap" }}>
        Invest in {childName}&rsquo;s Attention
      </div>

      <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "30px", color: "#f2f1ed", marginTop: "6px" }}>₹999</div>
      <div style={{ fontSize: "14px", color: "#c9c7d1", margin: "8px 0 4px", lineHeight: 1.5 }}>
        All 6 weeks, sequenced specifically for {childName}.
      </div>
      <div style={{ fontSize: "12.5px", color: "#9c9aa8", marginBottom: "22px", lineHeight: 1.5 }}>
        Everything {childName} needs over the next six weeks.
      </div>
      <button
        onClick={open}
        style={{ display: "block", width: "100%", background: "#1a1a1f", color: "var(--paper)", textAlign: "center", fontFamily: BG, fontWeight: 800, fontSize: "16px", padding: "16px", borderRadius: "12px", border: "none", cursor: "pointer" }}
      >
        Begin {childName}&rsquo;s Next Chapter
      </button>
      <div style={{ fontSize: "12px", color: "#9c9aa8", marginTop: "12px", textAlign: "center" }}>✓ Not a diagnosis — a practical guide</div>
    </div>
  );
}
