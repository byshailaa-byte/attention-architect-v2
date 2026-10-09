"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

type Props = {
  sessionId: string;
  childName: string;
  parentName: string;
  email: string;
  phone: string;
};

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
    const value = 2999;
    // DB (full) + GA4 begin_checkout + Pixel custom begin_checkout + Pixel InitiateCheckout
    // (eventID checkout:${sessionId}, shared with the CAPI call below for dedup).
    track("begin_checkout", { tier: "tier1", value, currency: "INR", content_name: "tier1", source: "closing_cta" }, sessionId);
    fetch("/api/meta/initiate-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier: "tier1", eventId: `checkout:${sessionId}` }),
    }).catch(() => {});

    const res = await fetch("/api/checkout/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier: "tier1" }),
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
    const tier = "tier1";
    const source = "closing_cta";
    track("checkout_modal_opened", { tier, value, source }, sessionId);
    new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "Attention Architect",
      description: `${childName}'s Six-Week Journey`,
      prefill: { name: parentName, email, contact: phone },
      theme: { color: "#F6C63D" },
      modal: {
        ondismiss: () => {
          track("checkout_modal_dismissed", { tier, value, source }, sessionId);
        },
      },
      handler: function (response: { razorpay_payment_id: string }) {
        // GA4 purchase + Pixel custom purchase + Pixel Purchase (eventID purchase:${pid}, shared
        // with the server CAPI Purchase). DB row is written server-side, so db:false.
        track("purchase", { tier: "tier1", value, currency: "INR", content_name: "tier1", razorpay_payment_id: response.razorpay_payment_id }, sessionId, { db: false });
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

      <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "30px", color: "#f2f1ed", marginTop: "6px" }}>₹2,999</div>
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
        Open {childName}&rsquo;s Roadmap
      </button>
    </div>
  );
}
