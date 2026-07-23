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

export default function PriceCards({ sessionId, childName, weakestFirst, parentName, email, phone }: Props) {
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
        { item_id: "module1", item_name: "Week 1 Guide", price: 499, currency: "INR" },
        { item_id: "full", item_name: "Full 6-Week Journey", price: 999, currency: "INR" },
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
    new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name: "Attention Architect",
      description: tier === "module1" ? "Week 1 Guide" : `${childName}'s Six-Week Journey`,
      prefill: { name: parentName, email, contact: phone },
      theme: { color: "#F6C63D" },
      handler: function (response: { razorpay_payment_id: string }) {
        fireGtag("purchase", { transaction_id: response.razorpay_payment_id, value, currency: "INR", items: [{ item_id: tier, price: value }] });
        fireFbq("track", "Purchase", { value, currency: "INR", content_name: tier });
        window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
      },
    }).open();
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const reportUrl = `${baseUrl}/report/${sessionId}`;
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this attention report: ${reportUrl}`)}`;

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
      {/* Primary ₹999 card */}
      <div style={{ background: "#f5e6c3", borderRadius: "16px", padding: "24px 20px", textAlign: "left", marginBottom: "16px" }}>
        <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "26px", color: "var(--ink)" }}>₹999</div>
        <div style={{ fontSize: "13px", color: "#5C5950", margin: "8px 0 4px", lineHeight: 1.5 }}>
          All 6 weeks, sequenced specifically for {childName}.
        </div>
        <div style={{ fontSize: "12px", color: "#7a7870", marginBottom: "18px", lineHeight: 1.5 }}>
          Everything {childName} needs over the next six weeks.
        </div>
        <button
          onClick={() => openModal("full")}
          style={{ display: "block", width: "100%", background: "#1a1a1f", color: "var(--paper)", textAlign: "center", fontFamily: BG, fontWeight: 800, fontSize: "14px", padding: "13px", borderRadius: "10px", border: "none", cursor: "pointer" }}
        >
          Begin {childName}&rsquo;s Next Chapter
        </button>
        <div style={{ fontSize: "11.5px", color: "#7a7870", marginTop: "10px", textAlign: "center" }}>✓ 7-day money-back guarantee</div>
      </div>

      {/* Plain secondary ₹499 block */}
      <div style={{ textAlign: "center", padding: "4px 0 20px" }}>
        <div style={{ fontSize: "13.5px", color: "#9c9aa8", marginBottom: "10px" }}>Not ready for all six weeks yet?</div>
        <button
          onClick={() => openModal("module1")}
          style={{ background: "transparent", border: "1.5px solid rgba(255,255,255,.25)", borderRadius: "10px", color: "#c9c7d1", fontFamily: BG, fontWeight: 700, fontSize: "13.5px", padding: "10px 20px", cursor: "pointer" }}
        >
          See Week One Only — ₹499
        </button>
      </div>

      {/* Guarantee block */}
      <div style={{ background: "rgba(63,190,122,.1)", border: "1px solid rgba(63,190,122,.25)", borderRadius: "10px", padding: "12px 16px", marginTop: "4px", fontSize: "13px", color: "#8fe0b6", lineHeight: 1.5 }}>
        7-day money-back guarantee. Email us and we&rsquo;ll refund — no forms, no questions.
      </div>

      {/* Trust row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "#9c9aa8" }}>🔒 Secured by Razorpay</span>
        {["UPI", "Cards", "Netbanking"].map((m) => (
          <span key={m} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "6px", fontSize: "11px", color: "#9c9aa8", padding: "2px 8px" }}>{m}</span>
        ))}
      </div>

      {/* WhatsApp share */}
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "#9c9aa8" }}>
        Want to discuss with your partner first?{" "}
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#c9c7d1", textDecoration: "underline", textUnderlineOffset: "2px" }}
        >
          Share this report
        </a>
      </div>
    </div>
  );
}
