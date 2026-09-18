"use client";

import { useState, useEffect, useRef } from "react";
import { TESTIMONIAL_POOL } from "@/lib/content/report-content";
import { SHASHANK } from "@/lib/founders-data";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function fireGtag(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", event, params ?? {});
  }
}

function fireEvent(eventType: string, sessionId: string, metadata?: Record<string, unknown>) {
  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, session_id: sessionId, metadata: metadata ?? {} }),
  }).catch(() => {});
}

const NAVY   = "#14284D";
const GOLD   = "#F5A623";
const TEAL   = "#22A38A";
const TEAL_D = "#137A66";
const BLUE   = "#2F72B6";
const INK    = "#1A1A1A";
const DIM    = "#555";
const LINE   = "#E2DFDA";
const BG     = "#FAFAF7";
const CARD   = "#FFFFFF";
const BF     = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

// Six distinct accent colours — one per week, in order

// Rung 1 quote — varies by parent instinct, everything else stays universal
const RUNG1_QUOTE: Record<string, string> = {
  "The Quick Fixer":  "Here — let me show you a different way.",
  "The Pusher":       "Focus. Finish your homework. Put the phone away.",
  "The Negotiator":   "Finish this bit and then you can have your phone.",
  "The Steady Hand":  "I'll wait. Whenever you're ready.",
};



// One week of the goal-framed plan: the week title (WEEK_TITLES), the objective,
// and the two outcome columns. All strings arrive already token-filled from the server.
export type RoadmapWeek = {
  title:         string;
  objective:     string;
  parentOutcome: string;  // what changes for you
  childOutcome:  string;  // what may change for the child
};

type Props = {
  childName:     string;
  archetype:     string;
  parentPattern?: string;
  sessionId:     string | null;
  parentName?:   string;
  email?:        string;
  phone?:        string;
  // Goal-framing (from the stored goal, or the skill's recommended goal as a fallback).
  goalStatement: string;
  framingLine:   string;
  problem:       string;  // the problem, in one paragraph (skill-keyed)
  methodPoint1:  string;  // method step 1 body — skill-specific ("starts where the break is")
  breakWeek:     number;  // the week the work starts (1-based) — open + highlighted by default
  weeks:         RoadmapWeek[];
};

const MOBILE_CSS = `
  details summary::-webkit-details-marker { display: none; }
  details summary::marker { display: none; }
  .rm-acc-icon::after { content: "+"; font-weight: 400; }
  details[open] .rm-acc-icon::after { content: "−"; }
  .rm-wk-icon::after { content: "+"; font-size: 14px; font-weight: 400; color: #B9BEC6; }
  details[open] .rm-wk-icon::after { content: "−"; }
  .rm-faq-det summary { border-radius: 12px; }
  .rm-faq-det[open] summary { border-radius: 12px 12px 0 0; }
  .rm-dot-f { position: relative; padding-left: 14px; }
  .rm-dot-f::before { content: ""; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .rm-dot-o { position: relative; padding-left: 14px; }
  .rm-dot-o::before { content: ""; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; border-radius: 50%; border: 1.5px solid currentColor; background: transparent; }
  .rm-testimonials-scroll { scrollbar-width: none; }
  .rm-testimonials-scroll::-webkit-scrollbar { display: none; }
  .rm-wk-row { display: flex; gap: 12px; position: relative; padding-bottom: 4px; }
  .rm-wk-row:not(:last-child)::after { content: ""; position: absolute; left: 14px; top: 32px; bottom: 0; width: 2px; background: #E2DFDA; }
  .rm-wk-body { flex: 1; min-width: 0; padding-bottom: 14px; }
  .rm-wk-det summary { list-style: none; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; font-size: 9.5px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #F5A623; }
  .rm-wk-det summary::-webkit-details-marker { display: none; }
  .rm-wk-det summary::marker { display: none; }
  .rm-wk-det summary .rm-wk-icon { margin-left: 2px; }
  @media (max-width: 520px) {
    .rm-locked-grid { grid-template-columns: 1fr !important; }
    .rm-nav-label { display: none !important; }
    .rm-and-for-you { flex-direction: column !important; }
    .rm-and-for-you-img { height: 28px !important; width: auto !important; }
  }
  @media (max-width: 400px) {
    .rm-goal-grid { grid-template-columns: 1fr !important; }
  }
`;


// Founder discovery call — Calendly. The slot panel is intentionally NOT rendered:
// showing counts we can't verify would be fabricated scarcity. Wire a real-availability
// panel here when Calendly availability can actually be read.
const CALENDLY_URL = "https://calendly.com/attentionarchitect/attention-architect-discovery";

export default function RoadmapView({ childName: c, archetype, parentPattern = "The Pusher", sessionId, parentName = "", email = "", phone = "", goalStatement, framingLine, problem, methodPoint1, breakWeek, weeks }: Props) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  // Six-week accordion: the parent's own week (breakWeek) is open by default.
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(() => new Set([breakWeek - 1]));
  const toggleWeek = (i: number) =>
    setOpenWeeks((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const pricingRef = useRef<HTMLDivElement>(null);
  const firedViewItem = useRef(false);

  const testimonialIdx = sessionId
    ? parseInt(sessionId.replace(/-/g, "").slice(0, 2), 16) % TESTIMONIAL_POOL.length
    : 0;
  const testimonial = TESTIMONIAL_POOL[testimonialIdx];
  void testimonial; // used below

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { document.head.contains(s) && document.head.removeChild(s); };
  }, []);

  useEffect(() => {
    if (!pricingRef.current || !sessionId || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !firedViewItem.current) {
        firedViewItem.current = true;
        fireEvent("view_item", sessionId, { tiers: ["tier1", "tier2"] });
        obs.disconnect();
      }
    }, { threshold: 0.4 });
    obs.observe(pricingRef.current);
    return () => obs.disconnect();
  }, [sessionId]);

  async function openCheckout(tier: "tier1" | "tier2") {
    if (!sessionId || checkoutLoading) return;
    const label = tier === "tier1" ? "Roadmap" : `Roadmap + three sessions with ${SHASHANK.name}`;
    const value = tier === "tier1" ? 2999 : 4999;
    setCheckoutLoading(true);
    fireEvent("begin_checkout", sessionId, { tier, value, source: "roadmap" });
    fireGtag("begin_checkout", { value, currency: "INR", items: [{ item_id: tier, price: value }] });
    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, tier }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        alert(d.error ?? "Could not create order. Please try again.");
        return;
      }
      const { orderId, amount, currency, keyId } = await res.json() as { orderId: string; amount: number; currency: string; keyId: string };
      if (typeof window.Razorpay === "undefined") {
        alert("Payment system still loading. Please try again in a moment.");
        return;
      }
      fireEvent("checkout_modal_opened", sessionId, { tier, value, source: "roadmap" });
      new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Attention Architect",
        description: label,
        prefill: { name: parentName, email, contact: phone },
        theme: { color: "#F5A623" },
        modal: {
          ondismiss: () => {
            fireEvent("checkout_modal_dismissed", sessionId, { tier, value, source: "roadmap" });
          },
        },
        handler: function (response: { razorpay_payment_id: string }) {
          const purchaseEventId = `purchase:${response.razorpay_payment_id}`;
          fireGtag("purchase", { transaction_id: response.razorpay_payment_id, value, currency: "INR", items: [{ item_id: tier, price: value }] });
          if (typeof window.fbq === "function") window.fbq("track", "Purchase", { value, currency: "INR", content_name: tier }, { eventID: purchaseEventId });
          window.location.href = `/checkout/success?session=${encodeURIComponent(sessionId)}`;
        },
      }).open();
    } finally {
      setCheckoutLoading(false);
    }
  }


  // Shared tick-list style helper
  const tick = (color: string) => ({
    display: "flex", gap: 8, alignItems: "flex-start",
    marginBottom: 7, fontSize: "13px", color: DIM, lineHeight: 1.5,
  } as React.CSSProperties);

  // Section eyebrow + heading, shared across the v2 bands.
  const kick: React.CSSProperties = { font: "700 10.5px/1.4 'Instrument Sans',system-ui", letterSpacing: ".12em", textTransform: "uppercase", color: "#A3781E", marginBottom: 11 };
  const h2s: React.CSSProperties = { fontFamily: BF, fontWeight: 800, fontSize: "clamp(22px,4vw,28px)", lineHeight: 1.16, color: NAVY, letterSpacing: "-0.03em" };

  return (
    <div style={{ background: BG, minHeight: "100dvh", fontFamily: "'Instrument Sans', system-ui, sans-serif", color: INK }}>
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: "12px", background: CARD, position: "sticky", top: 0, zIndex: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 24, width: "auto", flexShrink: 0 }} />
        <span className="rm-nav-label" style={{ fontSize: "12px", color: DIM, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {c}&rsquo;s Attention Health Roadmap
        </span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 18px 80px" }}>

        {/* ── 1. Problem ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "40px" }}>
          <div style={kick}>What the report found</div>
          <h2 style={h2s}>The problem, in one paragraph</h2>
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderLeft: "3px solid #C9503A", borderRadius: "0 14px 14px 0", padding: "22px 24px", marginTop: 16 }}>
            <div style={{ font: "700 10.5px/1.4 'Instrument Sans',system-ui", letterSpacing: ".1em", textTransform: "uppercase", color: "#C9503A", marginBottom: 9 }}>Where it breaks</div>
            <p style={{ fontSize: "16.5px", lineHeight: 1.62, color: NAVY, margin: 0 }}>{problem}</p>
          </div>
        </div>

        {/* ── 2. Method ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "40px" }}>
          <div style={kick}>How this fixes it</div>
          <h2 style={h2s}>You move first. Every week.</h2>
          <p style={{ fontSize: "16px", color: DIM, lineHeight: 1.6, margin: "13px 0 0", maxWidth: "56ch" }}>
            Not a programme {c} has to sit through. A change to what you do, made one week at a time, in the order the skills build.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 24 }}>
            {([
              ["It starts where the break is", methodPoint1],
              ["One change a week", "Small enough to survive a normal Tuesday. Comprehensive overhauls don't last; single adjustments do."],
              ["You change first, then they practise", `Every week asks something of you before it asks anything of ${c}. That's the part you control.`],
              ["You measure it yourself", "Week one you count what's happening now. Week six you count the same thing, the same way. No score, no test."],
            ] as const).map(([h, b], i) => (
              <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: CARD, border: `1px solid ${LINE}`, borderRadius: 13, padding: "16px 18px" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: "#FDF1DC", color: "#8A5F0F", fontFamily: BF, fontWeight: 800, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <b style={{ display: "block", fontFamily: BF, fontSize: 16, color: NAVY, marginBottom: 3 }}>{h}</b>
                  <span style={{ fontSize: 14.5, color: DIM, lineHeight: 1.55 }}>{b}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. The six weeks — accordion, the parent's week open by default ─ */}
        <div style={{ marginBottom: "40px" }}>
          <div style={kick}>The six weeks</div>
          <h2 style={h2s}>One change a week, in order</h2>
          <p style={{ fontSize: "16px", color: DIM, lineHeight: 1.6, margin: "13px 0 0", maxWidth: "60ch" }}>{framingLine}</p>
          <div style={{ marginTop: 20 }}>
            {weeks.slice(0, 6).map((wk, i) => {
              const open = openWeeks.has(i);
              const isBreak = i === breakWeek - 1;
              const isLast = i === 5;
              const numBg = isLast ? "#DCECE7" : isBreak ? "#FDF1DC" : "#fff";
              const numBorder = isLast ? TEAL : isBreak ? GOLD : LINE;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: numBg, border: `1.5px solid ${numBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BF, fontWeight: 800, fontSize: 13.5, color: NAVY, marginTop: 16 }}>{i + 1}</div>
                    {!isLast && <div style={{ width: 2, flex: 1, background: LINE, margin: "4px 0" }} />}
                  </div>
                  <div style={{ padding: "14px 0 4px" }}>
                    <h4 onClick={() => toggleWeek(i)} style={{ fontFamily: BF, fontSize: 16.5, fontWeight: 700, color: NAVY, lineHeight: 1.3, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, cursor: "pointer", margin: 0 }}>
                      {wk.title}
                      <span style={{ fontFamily: "'Instrument Sans',system-ui", fontSize: 18, fontWeight: 400, color: DIM, flexShrink: 0, lineHeight: 1, transform: open ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
                    </h4>
                    <div onClick={() => toggleWeek(i)} style={{ fontSize: 14.5, color: DIM, marginTop: 5, cursor: "pointer" }}>{wk.objective}</div>
                    {open && (
                      <div className="rm-goal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 10 }}>
                        <div style={{ background: "#FDF1DC", borderRadius: 10, padding: "11px 13px" }}>
                          <div style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase" as const, fontWeight: 700, color: "#8A5F0F", marginBottom: 5 }}>What changes for you</div>
                          <div style={{ fontSize: 13.3, lineHeight: 1.5, color: "#5E4712" }}>{wk.parentOutcome}</div>
                        </div>
                        <div style={{ background: "#DCECE7", borderRadius: 10, padding: "11px 13px" }}>
                          <div style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase" as const, fontWeight: 700, color: TEAL, marginBottom: 5 }}>What may change for {c}</div>
                          <div style={{ fontSize: 13.3, lineHeight: 1.5, color: "#2C5C51" }}>{wk.childOutcome}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Success ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "40px" }}>
          <div style={kick}>What success looks like</div>
          <h2 style={h2s}>How you&rsquo;ll know it worked</h2>
          <div style={{ background: "linear-gradient(135deg,#DCECE7,#EAF5F1)", border: "1.5px solid rgba(33,163,138,.3)", borderRadius: 16, padding: 24, marginTop: 16 }}>
            <div style={{ font: "700 10.5px/1.4 'Instrument Sans',system-ui", letterSpacing: ".12em", textTransform: "uppercase", color: TEAL, marginBottom: 9 }}>Six weeks from now</div>
            <h3 style={{ fontFamily: BF, fontWeight: 700, fontSize: 19, lineHeight: 1.35, color: NAVY, margin: "0 0 9px" }}>{goalStatement}</h3>
            <p style={{ fontSize: 14.5, color: DIM, lineHeight: 1.6, margin: 0 }}>
              Week one, you count it. Week six, you count the same thing the same way. Two numbers, both your own observation — nothing scored, nothing graded.
            </p>
            <div className="rm-goal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginTop: 16 }}>
              {([["Week 1", "where you start"], ["Week 6", `where ${c} lands`]] as const).map(([t, s]) => (
                <div key={t} style={{ background: "#fff", border: "1px dashed rgba(33,163,138,.4)", borderRadius: 11, padding: "14px 16px" }}>
                  <div style={{ fontSize: 9.5, letterSpacing: ".09em", textTransform: "uppercase" as const, fontWeight: 700, color: DIM }}>{t}</div>
                  <b style={{ display: "block", fontFamily: BF, fontSize: 19, color: NAVY, margin: "5px 0 0" }}>&mdash;</b>
                  <span style={{ fontSize: 11.5, color: DIM }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: DIM, lineHeight: 1.6, marginTop: 16, maxWidth: "62ch" }}>
            Not a guarantee. The pace depends on {c} and on the week. What the plan changes is the conditions — reliably, one at a time.
          </p>
        </div>

        {/* ── 5. Founder call — navy band. Slot panel intentionally omitted (no
                fabricated scarcity); wire real Calendly availability here later. ─ */}
        <div style={{ marginBottom: "40px", background: `linear-gradient(140deg,${NAVY},#1E3A66)`, borderRadius: 16, padding: "30px 26px" }}>
          <div style={{ font: "700 10.5px/1.4 'Instrument Sans',system-ui", letterSpacing: ".12em", textTransform: "uppercase", color: "#FBCB4A", marginBottom: 11 }}>Before you decide</div>
          <h2 style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(21px,3.6vw,26px)", lineHeight: 1.16, color: "#fff", letterSpacing: "-0.03em" }}>
            Fifteen minutes with {SHASHANK.name.split(" ")[0]}, free.
          </h2>
          <p style={{ fontSize: 15.5, color: "#C2CEE0", lineHeight: 1.6, margin: "14px 0 0", maxWidth: "60ch" }}>
            If you want to talk it through before paying for anything — what the report found, whether the six weeks fits your evenings, what it won&rsquo;t do. No pitch, and no obligation to buy afterwards.
          </p>
          <p style={{ fontSize: 15.5, color: "#C2CEE0", lineHeight: 1.6, margin: "11px 0 0", maxWidth: "60ch" }}>
            This is separate from the three 30-minute sessions in the guided plan. Those are for during the six weeks; this one is for deciding whether to start.
          </p>
          <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "linear-gradient(135deg,#FBCB4A,#F5A623)", color: NAVY, borderRadius: 11, padding: "14px 26px", fontFamily: BF, fontWeight: 700, fontSize: 15, marginTop: 16, textDecoration: "none" }}>
            Book a free 15 minutes →
          </a>
          <div style={{ fontSize: 12.5, color: "#8EA0BC", marginTop: 10 }}>{SHASHANK.name}, Chief Attention Architect</div>
        </div>

        {/* ── 5. Ladder ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(20px,3.5vw,28px)", lineHeight: 1.2 }}>
              <span style={{ color: NAVY }}>From managing attention to</span><br />
              <span style={{ color: TEAL }}>architecting it</span>
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: "14px", color: DIM, lineHeight: 1.65, maxWidth: "46ch", margin: "0 auto 24px" }}>
            You don&rsquo;t need to manage {c}&rsquo;s attention forever. The roadmap changes <em>your</em> role, step by step, so they learn to manage their own.
          </p>
          <div>
            {([
              { color: "#E85D5D", name: "The Reminder Parent",     quote: RUNG1_QUOTE[parentPattern] ?? RUNG1_QUOTE["The Pusher"]!, desc: "Every parent starts here. What differs is how.",                                                                        alt: "Parent gesturing urgently to a child looking at his phone, with an exclamation mark in a speech bubble" },
              { color: GOLD,      name: "The Observant Parent",    quote: "What keeps pulling their attention away?",                 desc: "You begin noticing the patterns instead of reacting to every distraction.",                                              alt: "Parent watching quietly as a child writes, with a magnifying glass in a speech bubble" },
              { color: "#3B82F6", name: "The Guiding Parent",      quote: "What would make this easier to start?",                   desc: "You stop giving constant instructions and start changing the conditions around attention.",                                alt: "Parent pointing and smiling as a child writes, with a lightbulb in a speech bubble" },
              { color: "#7C3AED", name: "The Coaching Parent",     quote: "What do you notice about your own attention?",            desc: "Your child begins recognising distraction, difficulty, fatigue and what helps them return.",                              alt: "Parent sitting beside a thoughtful child, with a brain in a speech bubble" },
              { color: TEAL,      name: "The Attention Architect", quote: "I don’t have to manage their attention. They are learning to manage it themselves.", desc: "You design the environment, teach the skills, and gradually hand ownership back to your child.", alt: "Parent and child high-fiving, with a star in a speech bubble" },
            ] as { color: string; name: string; quote: string; desc: string; alt: string }[]).map((rung, i, arr) => (
              <div key={rung.name} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "16px 0", borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none" }}>
                {/* Thumbnail with badge overlapping top-left */}
                <div style={{ position: "relative", flexShrink: 0, width: 100, height: 100 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/* ladder-1.png – ladder-5.png: AI-generated illustrations, reviewed and approved for launch 2026-09-16. Replace with final branded artwork before scaling paid campaigns. */}
                  <img src={`/ladder-${i + 1}.png`} alt={rung.alt} style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", top: -6, left: -6, width: 22, height: 22, borderRadius: "50%", background: rung.color, color: "#fff", font: "700 11px/22px 'Instrument Sans',system-ui", textAlign: "center", border: `2px solid ${BG}` }}>{i + 1}</div>
                </div>
                {/* Text column */}
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{ font: "700 13px/1.3 'Instrument Sans',system-ui", color: rung.color, marginBottom: 3 }}>{rung.name}</div>
                  <div style={{ font: "500 12px/1.45 'Instrument Sans',system-ui", color: INK, fontStyle: "italic", marginBottom: 6 }}>
                    &ldquo;{rung.quote}&rdquo;
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: DIM, lineHeight: 1.55 }}>{rung.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, font: "500 11.5px/1.4 'Instrument Sans',system-ui", color: DIM }}>
            <span style={{ color: "#E85D5D", fontWeight: 700 }}>More control from you</span>
            <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, #E85D5D, ${TEAL})`, borderRadius: 2 }} />
            <span style={{ color: TEAL, fontWeight: 700 }}>More ownership by your child</span>
          </div>
        </div>


        {/* ── 6. Testimonials (moved before pricing; content unchanged) ─────── */}
        <div style={{ marginBottom: "18px" }}>
          <div style={kick}>From parents who&rsquo;ve done it</div>
          <h2 style={h2s}>What changed, in their words</h2>
        </div>
        <div className="rm-testimonials-scroll" style={{ display: "flex", overflowX: "auto", gap: 14, marginBottom: "44px", scrollSnapType: "x mandatory", paddingBottom: 4 }}>
          {TESTIMONIAL_POOL.map((t, i) => (
            <div key={i} style={{ flex: "0 0 280px", scrollSnapAlign: "start", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "22px 20px", boxShadow: "0 4px 14px rgba(20,40,77,.05)" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: GOLD, letterSpacing: 2, marginBottom: 12 }}>★★★★★</div>
              <p style={{ margin: "0 0 14px", fontStyle: "italic", fontSize: "14px", color: INK, lineHeight: 1.6 }}>&ldquo;{t.quote}&rdquo;</p>
              <div style={{ fontSize: "12.5px", fontWeight: 700, color: NAVY }}>{t.who}</div>
              <div style={{ fontSize: "12.5px", color: DIM, marginTop: 2 }}>{t.detail}</div>
            </div>
          ))}
        </div>

        {/* ── 7. Pricing — three equal cards ───────────────────────────────── */}
        <div ref={pricingRef} style={{ marginBottom: "44px" }}>
          <p style={{ margin: "0 0 20px", fontFamily: BF, fontWeight: 700, fontSize: "clamp(15px,2.5vw,18px)", lineHeight: 1.4, color: NAVY, textAlign: "center" }}>
            Six weeks now, for how they handle attention later.
          </p>

          {/* Card 1 — Roadmap + 3 calls (gold, recommended) */}
          <div style={{ background: CARD, border: `1.5px solid ${GOLD}`, borderRadius: 12, overflow: "hidden", marginBottom: 10, boxShadow: "0 2px 10px rgba(245,166,35,.14)" }}>
            <div style={{ height: 4, background: GOLD }} />
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: DIM }}>Roadmap + three sessions with {SHASHANK.name}</div>
                <div style={{ background: GOLD, color: NAVY, fontSize: "8px", fontWeight: 700, letterSpacing: ".08em", padding: "3px 7px", borderRadius: 5, flexShrink: 0 }}>RECOMMENDED</div>
              </div>
              <div style={{ fontFamily: BF, fontWeight: 800, fontSize: 27, color: NAVY, lineHeight: 1, marginBottom: 4 }}>
                ₹4,999&nbsp;<s style={{ fontSize: 13, fontWeight: 600, color: "#A6ADB8" }}>₹7,999</s>
              </div>
              <div style={{ fontSize: "10.5px", color: DIM, marginBottom: 12 }}>One-time · 7-day guarantee</div>
              <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0 }}>
                {[
                  `The personalised six-week roadmap built around ${c}`,
                  `Three 30-minute sessions with ${SHASHANK.name}, ${SHASHANK.role}`,
                  "Full refund if it isn’t worth it",
                ].map(item => (
                  <li key={item} style={tick(GOLD)}>
                    <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openCheckout("tier2")}
                disabled={checkoutLoading || !sessionId}
                style={{ width: "100%", background: GOLD, color: NAVY, fontFamily: BF, fontWeight: 800, fontSize: "15px", padding: "13px", borderRadius: 10, border: "none", cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? 0.7 : 1, display: "block", boxSizing: "border-box" }}
              >
                {checkoutLoading ? "Loading…" : `Start ${c}’s roadmap →`}
              </button>
            </div>
          </div>

          {/* Card 3 — Just the roadmap (blue) */}
          <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ height: 4, background: BLUE }} />
            <div style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: DIM, marginBottom: 6 }}>Just the roadmap</div>
              <div style={{ fontFamily: BF, fontWeight: 800, fontSize: 27, color: NAVY, lineHeight: 1, marginBottom: 4 }}>
                ₹2,999&nbsp;<s style={{ fontSize: 13, fontWeight: 600, color: "#A6ADB8" }}>₹4,999</s>
              </div>
              <div style={{ fontSize: "10.5px", color: DIM, marginBottom: 12 }}>One-time · 7-day guarantee</div>
              <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0 }}>
                {[
                  `The personalised six-week roadmap built around ${c}`,
                  "Every week’s move, the words, what to watch for",
                  "Full refund if it isn’t worth it",
                ].map(item => (
                  <li key={item} style={tick(BLUE)}>
                    <span style={{ color: BLUE, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => openCheckout("tier1")}
                disabled={checkoutLoading || !sessionId}
                style={{ width: "100%", background: "transparent", color: NAVY, fontFamily: BF, fontWeight: 700, fontSize: "14px", padding: "12px", borderRadius: 10, border: `1.5px solid ${NAVY}`, cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? 0.6 : 1, display: "block", boxSizing: "border-box" }}
              >
                {checkoutLoading ? "Loading…" : "Choose this plan →"}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "11px", color: "#8A9097", marginTop: 6 }}>One-time payment · Secured by Razorpay</div>
        </div>

        {/* ── 9. FAQ ───────────────────────────────────────────────────────── */}
        <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "16px" }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "48px" }}>
          {[
            ["Is this a medical or clinical test?", "No. Attention Architect is a parent-education and self-discovery tool, not a diagnostic service."],
            ["Who is this for?", "Parents of children aged 8–14."],
            ["Does this diagnose ADHD or any condition?", "No — and it's not designed to. If something here concerns you clinically, that's worth a conversation with a pediatrician or child psychologist."],
            ["Is this the same as the report I already got?", `No. The report helped you understand ${c}'s pattern. The roadmap is what helps you act on it, one week at a time.`],
          ].map(([q, a]) => (
            <details key={q} className="rm-faq-det" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: "12px", padding: "16px 20px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "14.5px", color: INK, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                {q}
                <span className="rm-acc-icon" style={{ color: NAVY, fontSize: "18px", flexShrink: 0 }} />
              </summary>
              <div style={{ marginTop: "12px", fontSize: "14px", color: DIM, lineHeight: 1.65 }}>{a}</div>
            </details>
          ))}
        </div>

        {/* ── 10. Disclaimer ───────────────────────────────────────────────── */}
        <div style={{ fontSize: "12px", color: DIM, textAlign: "center" }}>
          Attention Architect is a parent-education and guidance platform, not a diagnostic service.
        </div>

      </div>
    </div>
  );
}
