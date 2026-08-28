"use client";

import { useState, useEffect, useRef } from "react";

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
  hasPurchase?: boolean;
};

function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

function fireFbq(type: "track" | "trackCustom", event: string, params?: Record<string, unknown>, eventId?: string) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) {
      window.fbq(type, event, params ?? {}, { eventID: eventId });
    } else {
      window.fbq(type, event, params ?? {});
    }
  }
}

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

export default function StickyCta({ sessionId, childName, parentName, email, phone, hasPurchase }: Props) {
  if (hasPurchase) return null;
  const [visible, setVisible] = useState(false);
  const openedRef = useRef(false);
  const priceSeenRef = useRef(false);

  useEffect(() => {
    const showEl = document.getElementById("sticky-show-sentinel");
    const hideEl = document.getElementById("sticky-hide-sentinel");
    let pastShow = false;
    function update() { setVisible(pastShow && !priceSeenRef.current); }
    const showObs = new IntersectionObserver(([entry]) => {
      pastShow = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    }, { threshold: 0 });
    const hideObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) priceSeenRef.current = true; // latch: once price cards visible, stay hidden
      update();
    }, { threshold: 0 });
    if (showEl) showObs.observe(showEl);
    if (hideEl) hideObs.observe(hideEl);
    return () => { showObs.disconnect(); hideObs.disconnect(); };
  }, []);

  async function open() {
    if (openedRef.current) return;
    openedRef.current = true;
    setTimeout(() => { openedRef.current = false; }, 3000);

    const value = 999;
    const initiateEventId = `${sessionId}:initiate_checkout:full`;
    fireEvent("begin_checkout", sessionId, { tier: "full", value, source: "sticky_cta" });
    fireGtag("begin_checkout", { value, currency: "INR", items: [{ item_id: "full", price: value }] });
    fireFbq("track", "InitiateCheckout", { value, currency: "INR", content_name: "full" }, initiateEventId);
    fetch("/api/meta/initiate-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier: "full", eventId: initiateEventId }),
    }).catch(() => {});

    if (!document.querySelector('script[src*="checkout.razorpay"]')) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.head.appendChild(s);
      await new Promise((r) => { s.onload = r; });
    }

    const res = await fetch("/api/checkout/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier: "full" }),
    });
    if (!res.ok) {
      alert("Could not create order. Please try again.");
      openedRef.current = false;
      return;
    }
    const { orderId, amount, currency, keyId } = await res.json();
    const tier = "full";
    const source = "sticky_cta";
    fireEvent("checkout_modal_opened", sessionId, { tier, value, source });
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
          fireEvent("checkout_modal_dismissed", sessionId, { tier, value, source });
        },
      },
      handler: function (response: { razorpay_payment_id: string }) {
        const purchaseEventId = `purchase:${response.razorpay_payment_id}`;
        fireGtag("purchase", { transaction_id: response.razorpay_payment_id, value, currency: "INR" });
        fireFbq("track", "Purchase", { value, currency: "INR", content_name: "full" }, purchaseEventId);
        window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
      },
    }).open();
  }

  return (
    <>
      <style>{`@media (min-width: 641px) { #sticky-cta-bar { display: none !important; } }`}</style>
      <div
        id="sticky-cta-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: visible ? "block" : "none",
          background: "var(--ink2)",
          borderTop: "1px solid rgba(255,255,255,.12)",
          padding: "12px 20px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          onClick={open}
          style={{
            display: "block",
            width: "100%",
            background: "var(--marker)",
            color: "#1a1a1f",
            textAlign: "center",
            fontFamily: BG,
            fontWeight: 800,
            fontSize: "15px",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Open {childName}&rsquo;s Roadmap — ₹999 →
        </button>
        <div style={{ textAlign: "center", fontSize: "11.5px", color: "#7a7870", marginTop: "6px" }}>
          Full 6-week program
        </div>
      </div>
    </>
  );
}
