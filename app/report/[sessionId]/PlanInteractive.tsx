"use client";
// Plan v2 interactive island: fires plan_v2_view + day1_preview_view on mount, and owns the
// pricing CTAs (existing Razorpay checkout, tier1/tier2) + the free-call links. Everything
// else on the Plan page is static server-rendered.
import { useEffect } from "react";
import Script from "next/script";
import { FLOW, HEAD, BODY } from "@/app/components/FlowShell";
import { fireGtag } from "@/lib/gtag";

type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void };

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

const CHECK = "✓";
const TIERS = [
  {
    tier: "tier2" as const, value: 4999, recommended: true, title: "Plan + 3 calls with us",
    ticks: ["The full six-week plan", "Three 1:1 calls with us", "We tailor it to your child"],
  },
  {
    tier: "tier1" as const, value: 2999, recommended: false, title: "The plan on its own",
    ticks: ["The full six-week plan", "Add calls later for ₹2,000"],
  },
];

export function PlanView({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    fireEvent("plan_v2_view", sessionId);
    fireEvent("day1_preview_view", sessionId);
  }, [sessionId]);
  return null;
}

export function PlanPricing({ sessionId, calendlyUrl, childName, parentName = "", email = "", phone = "" }: { sessionId: string; calendlyUrl: string; childName: string; parentName?: string; email?: string; phone?: string }) {
  // Prefill Razorpay with the contact already captured this session (same values/format v1
  // uses — RoadmapView passes { name, email, contact: phone }). Omit anything missing.
  const prefill: { name?: string; email?: string; contact?: string } = {};
  if (parentName) prefill.name = parentName;
  if (email) prefill.email = email;
  if (phone) prefill.contact = phone;

  async function openCheckout(tier: "tier1" | "tier2", value: number) {
    fireEvent("plan_cta_click", sessionId, { tier, value });
    fireEvent("begin_checkout", sessionId, { tier, value, source: "plan_v2" });
    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, tier }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.error ?? "Could not start checkout. Please try again."); return; }
      const { orderId, amount, currency, keyId } = await res.json() as { orderId: string; amount: number; currency: string; keyId: string };
      const RZP = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (typeof RZP === "undefined") { alert("Payment is loading — please try again in a moment."); return; }
      new RZP({
        key: keyId, amount, currency, order_id: orderId,
        name: "Attention Architect", description: TIERS.find((t) => t.tier === tier)?.title,
        prefill,
        handler: (response: { razorpay_payment_id: string }) => {
          const purchaseEventId = `purchase:${response.razorpay_payment_id}`;
          fireGtag("purchase", { transaction_id: response.razorpay_payment_id, value, currency: "INR", items: [{ item_id: tier, price: value }] });
          const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
          if (typeof fbq === "function") fbq("track", "Purchase", { value, currency: "INR", content_name: tier }, { eventID: purchaseEventId });
          window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
        },
        modal: { ondismiss: () => fireEvent("checkout_modal_dismissed", sessionId, { tier, value, source: "plan_v2" }) },
      }).open();
      fireEvent("checkout_modal_opened", sessionId, { tier, value, source: "plan_v2" });
    } catch { alert("Could not start checkout. Please try again."); }
  }

  return (
    <div style={{ fontFamily: BODY }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {TIERS.map((t) => (
        <div key={t.tier} style={{
          background: t.recommended ? FLOW.navy : "#fff", color: t.recommended ? "#fff" : FLOW.ink,
          border: t.recommended ? "none" : `1.5px solid ${FLOW.line}`, borderRadius: 16, padding: "20px 20px", marginBottom: 14,
          boxShadow: t.recommended ? "0 10px 26px rgba(30,58,95,.28)" : "none",
        }}>
          {t.recommended && <div style={{ display: "inline-block", background: FLOW.gold, color: "#1a1a1a", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, marginBottom: 12 }}>Recommended</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontFamily: HEAD, fontSize: 20 }}>{t.title}</span>
            <span style={{ fontFamily: HEAD, fontSize: 26, fontWeight: 600 }}>₹{t.value.toLocaleString("en-IN")}</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
            {t.ticks.map((tk, i) => (
              <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 7, fontSize: 15 }}>
                <span style={{ color: t.recommended ? FLOW.goldSoft : "#2F9E6E", fontWeight: 800 }}>{CHECK}</span>
                <span>{tk}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => openCheckout(t.tier, t.value)} style={{
            width: "100%", minHeight: 50, borderRadius: 13, border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16,
            background: t.recommended ? FLOW.gold : FLOW.navy, color: t.recommended ? "#1a1a1a" : "#fff",
          }}>{t.recommended ? `Start ${childName}'s plan` : "Get the plan"}</button>
        </div>
      ))}
      <p style={{ textAlign: "center", fontSize: 13.5, color: FLOW.dim, lineHeight: 1.6, margin: "10px 0 0" }}>
        One-time · 7-day guarantee<br />
        Full refund if it isn’t worth it<br />
        UPI, cards and netbanking via Razorpay
      </p>
    </div>
  );
}

export function PlanCallCard({ sessionId, calendlyUrl }: { sessionId: string; calendlyUrl: string }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${FLOW.line}`, borderRadius: 16, padding: "22px 20px", textAlign: "center", fontFamily: BODY }}>
      <div style={{ fontFamily: HEAD, fontSize: 20, marginBottom: 6, color: FLOW.navy }}>Not sure yet?</div>
      <p style={{ fontSize: 15, color: FLOW.dim, margin: "0 0 16px", lineHeight: 1.5 }}>Talk it through with us first. No pressure.</p>
      <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" onClick={() => fireEvent("call_click", sessionId, { where: "plan" })}
        style={{ display: "inline-block", minHeight: 48, lineHeight: "48px", padding: "0 22px", borderRadius: 13, border: `1.5px solid ${FLOW.navy}`, color: FLOW.navy, fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
        Book a free 15-min call
      </a>
    </div>
  );
}
