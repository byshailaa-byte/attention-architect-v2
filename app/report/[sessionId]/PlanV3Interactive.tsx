"use client";
// Plan v3 interactive island for the rebuilt one-page plan (report-fixes-v4 · C). Owns: the view
// events (plan_v2_view + view_item on mount), the sticky mobile bottom bar, the "Pick your plan"
// comparison table + two checkout buttons, the FAQ accordions, and the single bottom call link.
//
// CHECKOUT is byte-for-byte the prior flow: POST /api/checkout/order {sessionId,tier}; events
// plan_cta_click, begin_checkout, checkout_modal_opened/dismissed; purchase; redirect
// /checkout/success. Amounts unchanged — plan=₹2,999 (tier1), plan+calls=₹4,999 (tier2).
import { useEffect, useState } from "react";
import Script from "next/script";
import { HEAD, BODY } from "@/app/components/FlowShell";
import { track } from "@/lib/analytics/track";
import {
  PLAN_STICKY_LABEL, PLAN_STICKY_BTN,
  PLAN_PICK_LABEL, PLAN_COMPARE_COL_PLAN, PLAN_COMPARE_COL_CALLS, PLAN_COMPARE_ROWS,
  PLAN_COMPARE_PERDAY_LABEL, PLAN_COMPARE_PERDAY, PLAN_WHICH_ONE, PLAN_BTN_CALLS, PLAN_BTN_PLAN,
  PLAN_GUARANTEE, PLAN_FAQ_LABEL, PLAN_FAQ, PLAN_BOTTOM_CALL,
} from "@/lib/report-v2/v3-copy";

const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", line: "#E7E0D2", sel: "#FFF8EC", onNavy: "#CFE0F2",
} as const;
const GREEN = "#2F9E6E";

type RazorpayCtor = new (o: Record<string, unknown>) => { open(): void };

// Minimal {Name}-only filler (pronouns are resolved server-side; price copy only carries {Name}).
function fillName(tmpl: string, name: string) {
  return tmpl.replace(/\{Name\}/g, name);
}

export function PlanV3View({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    track("plan_v2_view", { layout: "v3" }, sessionId);
    // view_item (GA4 + Meta ViewContent) for the plan/price view. Entry tier value; no child data.
    track("view_item", { currency: "INR", value: 2999, content_name: "plan", tier: "tier1" }, sessionId);
  }, [sessionId]);
  return null;
}

// "Start now" / sticky bar / bottom call all scroll to the "Pick your plan" section (#price).
function scrollToPrice() {
  document.getElementById("price")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Sticky mobile bottom bar (§102) — appears after the hero scrolls out of view.
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

// "Pick your plan" — comparison table (§111) + "Which one?" note + two checkout buttons + guarantee.
export function PlanV3Pricing({ sessionId, childName, parentName = "", email = "", phone = "" }: {
  sessionId: string; childName: string; parentName?: string; email?: string; phone?: string;
}) {
  const prefill: { name?: string; email?: string; contact?: string } = {};
  if (parentName) prefill.name = parentName;
  if (email) prefill.email = email;
  if (phone) prefill.contact = phone;

  const titleFor = (tier: "tier1" | "tier2") => tier === "tier2" ? "Plan + 3 calls" : "The 6-week plan";

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

  // Grid: label column + two value columns. The "calls" column is highlighted (navy tint).
  const COLS = "1fr 58px 58px";
  const callsCell: React.CSSProperties = { background: "rgba(30,58,95,.06)" };
  const headCell: React.CSSProperties = { textAlign: "center", padding: "10px 4px", lineHeight: 1.2 };
  const Mark = ({ on }: { on: boolean }) => on
    ? <span style={{ color: GREEN, fontWeight: 800, fontSize: 17 }}>✓</span>
    : <span style={{ color: "#B9C0CB", fontWeight: 700, fontSize: 17 }}>–</span>;

  return (
    <div style={{ fontFamily: BODY }}>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, letterSpacing: ".12em", color: C.gold, textTransform: "uppercase", marginBottom: 14 }}>{PLAN_PICK_LABEL}</div>

      {/* comparison table */}
      <div style={{ border: `1.5px solid ${C.line}`, borderRadius: 14, overflow: "hidden", background: "#fff" }}>
        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "stretch", borderBottom: `1px solid ${C.line}` }}>
          <div />
          <div style={headCell}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{PLAN_COMPARE_COL_PLAN.name}</div>
            <div style={{ fontFamily: HEAD, fontSize: 15, color: C.navy }}>{PLAN_COMPARE_COL_PLAN.price}</div>
          </div>
          <div style={{ ...headCell, ...callsCell, borderLeft: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.navy }}>{PLAN_COMPARE_COL_CALLS.name}</div>
            <div style={{ fontFamily: HEAD, fontSize: 15, color: C.navy }}>{PLAN_COMPARE_COL_CALLS.price}</div>
          </div>
        </div>
        {/* rows */}
        {PLAN_COMPARE_ROWS.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.35, color: C.ink, padding: "11px 12px" }}>{fillName(r.label, childName)}</div>
            <div style={{ textAlign: "center", padding: "11px 4px" }}><Mark on={r.plan} /></div>
            <div style={{ textAlign: "center", padding: "11px 4px", ...callsCell, borderLeft: `1px solid ${C.line}` }}><Mark on={r.calls} /></div>
          </div>
        ))}
        {/* per-day footer row */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.dim, padding: "11px 12px" }}>{PLAN_COMPARE_PERDAY_LABEL}</div>
          <div style={{ textAlign: "center", padding: "11px 4px", fontFamily: HEAD, fontSize: 14, color: C.navy }}>{PLAN_COMPARE_PERDAY.plan}</div>
          <div style={{ textAlign: "center", padding: "11px 4px", ...callsCell, borderLeft: `1px solid ${C.line}`, fontFamily: HEAD, fontSize: 14, color: C.navy }}>{PLAN_COMPARE_PERDAY.calls}</div>
        </div>
      </div>

      {/* which one? */}
      <p style={{ fontSize: 14, lineHeight: 1.55, color: C.dim, margin: "16px 0 18px" }}>{PLAN_WHICH_ONE}</p>

      {/* buttons: calls (filled) + plan (outline) */}
      <button onClick={() => openCheckout("tier2", 4999)} style={{ width: "100%", minHeight: 52, borderRadius: 13, border: "none", cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16, background: C.gold, color: "#1a1a1a", marginBottom: 10 }}>{PLAN_BTN_CALLS}</button>
      <button onClick={() => openCheckout("tier1", 2999)} style={{ width: "100%", minHeight: 52, borderRadius: 13, border: `1.5px solid ${C.navy}`, cursor: "pointer", fontFamily: BODY, fontWeight: 700, fontSize: 16, background: "transparent", color: C.navy, marginBottom: 16 }}>{PLAN_BTN_PLAN}</button>

      {/* guarantee row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", justifyContent: "center" }}>
        {PLAN_GUARANTEE.map((g, i) => (
          <span key={i} style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, color: C.dim }}>
            <span style={{ color: GREEN, fontWeight: 800 }}>✓</span>{g}
          </span>
        ))}
      </div>
    </div>
  );
}

// The single bottom line (§121): "Not sure yet? Book a free 15-min call."
export function PlanV3BottomCall({ sessionId, calendlyUrl }: { sessionId: string; calendlyUrl: string }) {
  return (
    <div style={{ fontFamily: BODY, textAlign: "center" }}>
      <a href={calendlyUrl} target="_blank" rel="noopener noreferrer" onClick={() => track("call_click", { where: "plan" }, sessionId)}
        style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "11px 16px", fontSize: 15.5, fontWeight: 700, color: C.navy, textDecoration: "underline" }}>
        {PLAN_BOTTOM_CALL}
      </a>
    </div>
  );
}
