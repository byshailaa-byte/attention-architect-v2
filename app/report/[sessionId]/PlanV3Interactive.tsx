"use client";
// Plan v3 interactive island for the one-page plan. Owns: the view events (plan_v2_view +
// day1_preview_view on mount), the sticky mobile bottom bar, the forked price cards (with the
// exact Razorpay checkout + tier ids + analytics event names reused from PlanInteractive.tsx),
// and the FAQ accordions. Static sections are server-rendered in PlanV2.tsx.
//
// CHECKOUT is byte-for-byte the PlanInteractive flow: POST /api/checkout/order {sessionId,tier};
// events plan_cta_click, begin_checkout, checkout_modal_opened/dismissed; gtag/fbq purchase;
// redirect /checkout/success. PlanInteractive.tsx itself is left untouched (simplified funnel).
import { useEffect, useState } from "react";
import Script from "next/script";
import { HEAD, BODY } from "@/app/components/FlowShell";
import { track } from "@/lib/analytics/track";
import { SHOW_COMPARE_AT } from "@/lib/report-v2/flags";
import {
  PLAN_STICKY_LABEL, PLAN_STICKY_BTN,
  PRICE_INCLUDE_LABEL, PRICE_INCLUDES, PRICE_TIER1, PRICE_TIER2, PRICE_COMPARE_AT, PRICE_BADGES,
  PLAN_FAQ_LABEL, PLAN_FAQ,
} from "@/lib/report-v2/v3-copy";

const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", line: "#E7E0D2", sel: "#FFF8EC", onNavy: "#CFE0F2",
} as const;
const GREEN = "#2F9E6E";

type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void };

// Minimal {Name}-only filler (pronouns are already resolved server-side in the strings passed
// as props; the price copy only carries {Name}). Kept tiny on purpose.
function fillName(tmpl: string, name: string) {
  return tmpl.replace(/\{Name\}/g, name);
}

export function PlanV3View({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    track("plan_v2_view", { layout: "v3" }, sessionId);
    track("day1_preview_view", { layout: "v3" }, sessionId);
  }, [sessionId]);
  return null;
}

function scrollToPrice() {
  document.getElementById("price")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Sticky mobile bottom bar (§102) — appears after the hero CTA scrolls out of view.
export function PlanV3StickyBar({ childName }: { childName: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("plan-hero-cta");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  if (!show) return null;
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, background: "#fff",
      borderTop: `1px solid ${C.line}`, boxShadow: "0 -4px 16px rgba(0,0,0,.08)",
      padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", fontFamily: BODY,
      display: "flex", alignItems: "center", gap: 12, maxWidth: 560, margin: "0 auto",
    }}>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.navy, lineHeight: 1.3 }}>{fillName(PLAN_STICKY_LABEL, childName)}</span>
      <button onClick={scrollToPrice} style={{ flexShrink: 0, background: C.gold, color: "#1a1a1a", border: "none", borderRadius: 11, fontWeight: 800, fontSize: 15, padding: "11px 18px", cursor: "pointer", fontFamily: BODY }}>{PLAN_STICKY_BTN}</button>
    </div>
  );
}

// FAQ accordions (§116–120).
export function PlanV3Faq({ childName }: { childName: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ fontFamily: BODY }}>
      <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: C.gold, textTransform: "uppercase", marginBottom: 16 }}>{PLAN_FAQ_LABEL}</div>
      {PLAN_FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
            <button onClick={() => setOpen(isOpen ? null : i)} style={{
              width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
              padding: "16px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              fontFamily: HEAD, fontSize: 17, color: C.navy, lineHeight: 1.3,
            }}>
              <span>{fillName(item.q, childName)}</span>
              <span style={{ flexShrink: 0, color: C.gold, fontSize: 20, fontWeight: 700, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
            </button>
            {isOpen && <p style={{ fontSize: 15.5, lineHeight: 1.55, color: C.dim, margin: "0 0 16px" }}>{fillName(item.a, childName)}</p>}
          </div>
        );
      })}
    </div>
  );
}

// Forked price cards (§111–115). Both tiers, badges, "Both plans include" ticks, strikethrough
// compare-at gated behind SHOW_COMPARE_AT (currently false → hidden).
export function PlanV3Pricing({ sessionId, childName, parentName = "", email = "", phone = "" }: {
  sessionId: string; childName: string; parentName?: string; email?: string; phone?: string;
}) {
  const prefill: { name?: string; email?: string; contact?: string } = {};
  if (parentName) prefill.name = parentName;
  if (email) prefill.email = email;
  if (phone) prefill.contact = phone;

  const titleFor = (tier: "tier1" | "tier2") => tier === "tier2" ? fillName(PRICE_TIER2.title, childName) : PRICE_TIER1.title;

  async function openCheckout(tier: "tier1" | "tier2", value: number) {
    track("plan_cta_click", { tier, value }, sessionId);
    track("begin_checkout", { tier, value, currency: "INR", content_name: tier, source: "plan_v2" }, sessionId);
    fetch("/api/meta/initiate-checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, tier, eventId: `checkout:${sessionId}` }),
    }).catch(() => {});
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
        name: "Attention Architect", description: titleFor(tier),
        prefill,
        handler: (response: { razorpay_payment_id: string }) => {
          track("purchase", { tier, value, currency: "INR", content_name: tier, razorpay_payment_id: response.razorpay_payment_id }, sessionId, { db: false });
          window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
        },
        modal: { ondismiss: () => track("checkout_modal_dismissed", { tier, value, source: "plan_v2" }, sessionId) },
      }).open();
      track("checkout_modal_opened", { tier, value, source: "plan_v2" }, sessionId);
    } catch { alert("Could not start checkout. Please try again."); }
  }

  const Price = ({ now, was, onNavy }: { now: string; was: string; onNavy: boolean }) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <span style={{ fontFamily: HEAD, fontSize: 28, fontWeight: 600 }}>{now}</span>
      {SHOW_COMPARE_AT && <s style={{ fontSize: 15, fontWeight: 600, color: onNavy ? "rgba(255,255,255,.6)" : "#A6ADB8" }}>{was}</s>}
    </div>
  );

  return (
    <div style={{ fontFamily: BODY }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      {/* Both plans include */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: C.dim, textTransform: "uppercase", marginBottom: 10 }}>{PRICE_INCLUDE_LABEL}</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {PRICE_INCLUDES.map((t, i) => (
            <li key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8, fontSize: 15, lineHeight: 1.45 }}>
              <span style={{ color: GREEN, fontWeight: 800, flexShrink: 0 }}>✓</span>
              <span>{fillName(t, childName)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tier 2 — navy, "MOST HELP" */}
      <div style={{ background: C.navy, color: "#fff", borderRadius: 16, padding: "20px 20px", marginBottom: 14, boxShadow: "0 10px 26px rgba(30,58,95,.28)" }}>
        <div style={{ display: "inline-block", background: C.gold, color: "#1a1a1a", fontWeight: 800, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, marginBottom: 12 }}>{PRICE_TIER2.badge}</div>
        <div style={{ fontFamily: HEAD, fontSize: 20, lineHeight: 1.25, marginBottom: 10 }}>{fillName(PRICE_TIER2.title, childName)}</div>
        <Price now={PRICE_TIER2.price} was={PRICE_COMPARE_AT.tier2} onNavy />
        <div style={{ fontSize: 13, color: C.onNavy, margin: "4px 0 12px" }}>{PRICE_TIER2.perDay}</div>
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 16px", color: "#EAF1F8" }}>{fillName(PRICE_TIER2.body, childName)}</p>
        <button onClick={() => openCheckout("tier2", 4999)} style={{ width: "100%", minHeight: 50, borderRadius: 13, border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16, background: C.gold, color: "#1a1a1a" }}>{PRICE_TIER2.button}</button>
      </div>

      {/* Tier 1 */}
      <div style={{ background: "#fff", color: C.ink, border: `1.5px solid ${C.line}`, borderRadius: 16, padding: "20px 20px", marginBottom: 16 }}>
        <div style={{ fontFamily: HEAD, fontSize: 20, lineHeight: 1.25, marginBottom: 10 }}>{PRICE_TIER1.title}</div>
        <Price now={PRICE_TIER1.price} was={PRICE_COMPARE_AT.tier1} onNavy={false} />
        <div style={{ fontSize: 13, color: C.dim, margin: "4px 0 12px" }}>{PRICE_TIER1.perDay}</div>
        <p style={{ fontSize: 15, lineHeight: 1.5, margin: "0 0 16px" }}>{PRICE_TIER1.body}</p>
        <button onClick={() => openCheckout("tier1", 2999)} style={{ width: "100%", minHeight: 50, borderRadius: 13, border: `1.5px solid ${C.navy}`, cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16, background: "transparent", color: C.navy }}>{PRICE_TIER1.button}</button>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PRICE_BADGES.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13.5, color: C.dim }}>
            <span style={{ color: GREEN, fontWeight: 800, flexShrink: 0 }}>✓</span>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Close CTA (§121) + a scroll-to-price primary. Keeps the free-call Calendly link.
export function PlanV3Close({ sessionId, calendlyUrl, childName, headline, btnPlan, btnCall }: {
  sessionId: string; calendlyUrl: string; childName: string; headline: string; btnPlan: string; btnCall: string;
}) {
  return (
    <div style={{ fontFamily: BODY, textAlign: "center" }}>
      <h2 style={{ fontFamily: HEAD, fontSize: 26, lineHeight: 1.2, fontWeight: 500, color: C.navy, margin: "0 0 20px" }}>{headline}</h2>
      <button onClick={scrollToPrice} style={{ width: "100%", maxWidth: 360, minHeight: 50, borderRadius: 13, border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16, background: C.gold, color: "#1a1a1a", margin: "0 auto 12px", display: "block" }}>{fillName(btnPlan, childName)}</button>
      <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("call_click", { where: "plan" }, sessionId)}
        style={{ display: "inline-block", fontSize: 15, fontWeight: 700, color: C.navy, textDecoration: "underline" }}>
        {btnCall}
      </a>
    </div>
  );
}
