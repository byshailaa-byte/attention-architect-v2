"use client";

import { useState, useEffect, useRef } from "react";
import { NOW_LINES, THEN_LINES, TESTIMONIAL_POOL } from "@/lib/content/report-content";

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
const W = ["#E2705F", "#E9973F", "#DFC13C", "#4E9E86", "#3D7CB8", "#7B6BC4"] as const;

// What the child is building — one per week
const THEM_LINES = [
  "beginning without a reminder",
  "holding on when something easier is nearby",
  "staying with it past the first good stretch",
  "finding their way back on their own",
  "using it where nobody taught it",
  "doing it without you in the room",
] as const;

export type WeekPreview = {
  weekTitle: string;
  bullets: [string, string, string];
};

export type WeekContent = {
  weekTitle: string;
  day2Title: string;   // WHAT YOU DO — primary action → "You:" line
  day4Title: string;   // WHAT YOU DO — secondary action (shown in accordion)
  whatToSay: string;   // script line → "What to say" in accordion
};

type Props = {
  childName:    string;
  archetype:    string;
  weekContents: WeekContent[];
  sessionId:    string | null;
  parentName?:  string;
  email?:       string;
  phone?:       string;
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
  .rm-dot-f::before { content: ""; position: absolute; left: 0; top: 8px; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .rm-dot-o { position: relative; padding-left: 14px; }
  .rm-dot-o::before { content: ""; position: absolute; left: 0; top: 8px; width: 7px; height: 7px; border-radius: 50%; border: 1.5px solid currentColor; background: transparent; }
  .rm-testimonials-scroll { scrollbar-width: none; }
  .rm-testimonials-scroll::-webkit-scrollbar { display: none; }
  @media (max-width: 520px) {
    .rm-locked-grid { grid-template-columns: 1fr !important; }
    .rm-nav-label { display: none !important; }
    .rm-and-for-you { flex-direction: column !important; }
    .rm-and-for-you-img { height: 28px !important; width: auto !important; }
    .rm-sn-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 400px) {
    .rm-goal-grid { grid-template-columns: 1fr !important; }
  }
`;

const ARCHETYPE_SIGNALS: Partial<Record<string, readonly [string, string, string, string, string, string]>> = {
  "The Storm": [
    "They pick one and get going, instead of arguing about which.",
    "They turn it off at the limit they chose, without the negotiation.",
    "They see a whole task through without checking in at every step.",
    "They stop looking at you first to check whether a decision is allowed.",
    "They start factoring their sibling in before it becomes a fight.",
    "They decide something before you've thought to offer the choice.",
  ],
  "The All-In Kid": [
    "They get into something without needing a run-up.",
    "They come out of a screen stretch the way they'd come out of a book.",
    "They keep going on a day that would normally derail it.",
    "A session that goes nowhere doesn't wreck the rest of the day.",
    "They handle a sibling interrupting without it becoming a scene.",
    "They ask for the quiet themselves, before you've offered it.",
  ],
  "The Inventor": [
    "They start their own way instead of waiting to be told how.",
    "They set up a screen task deliberately, not just by default.",
    "They stick with an approach across days, adjusting as they go.",
    "A method failing doesn't make them abandon the whole project.",
    "They take on someone else's idea without it feeling like losing.",
    "They explain why they did it that way, without being asked.",
  ],
  "The Explorer": [
    "An idea gets written down instead of chased mid-homework.",
    "They come back to what they were doing after a screen break.",
    "Reaching for the notepad stops needing a reminder.",
    "An idea going nowhere doesn't stop them having the next one.",
    "They notice they've interrupted someone, without being told.",
    "You find the system being used somewhere you never set it up.",
  ],
  "The Magnet": [
    "They settle into something with you nearby but not involved.",
    "They don't need you watching to stay with a screen task.",
    "They stay with something longer without checking you're still there.",
    "They work through a hard moment while you're in the room, not for you.",
    "They hold their own in a group, not just one-to-one.",
    "They tell you when they want you around — and when they don't.",
  ],
  "The Glue": [
    "Homework starts without the resistance it used to start with.",
    "Screen conversations stop beginning as an argument.",
    "A bad day stops taking the whole evening with it.",
    "Something unresolved doesn't mean the night is ruined.",
    "They stop carrying the whole weight of a sibling fight.",
    "They tell you how they're doing before you've asked.",
  ],
  "The Captain": [
    "They run something without checking each step with you.",
    "They keep a rule they set themselves.",
    "Something ongoing keeps running without your reminders.",
    "It going wrong doesn't stop them wanting to run the next thing.",
    "They lead something a sibling has to go along with, and it holds.",
    "They step in and take charge before anyone hands it to them.",
  ],
  "The Live Wire": [
    "Something matters enough to start without a push.",
    "A screen limit holds because they set the stakes on it.",
    "The energy lasts past the exciting first stretch.",
    "Not getting the thing doesn't stop them setting the next stake.",
    "They handle a shared outcome, including someone else losing too.",
    "They set their own stakes without being prompted.",
  ],
};

export default function RoadmapView({ childName: c, archetype, weekContents, sessionId, parentName = "", email = "", phone = "" }: Props) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
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
    const label = tier === "tier1" ? "Roadmap" : "Roadmap + Founder Calls";
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

  const archSignals = ARCHETYPE_SIGNALS[archetype] ?? ARCHETYPE_SIGNALS["The All-In Kid"];

  function handleFounderCall() {
    if (sessionId) {
      fireEvent("founder_call_requested", sessionId, { source: "mid_page" });
      fireGtag("founder_call_requested", { source: "mid_page" });
    }
    const msg = encodeURIComponent(
      `Hi — I'd like to book my free 30-minute founder call. Child: ${c}. Session: ${sessionId ?? "unknown"}`
    );
    window.open(`https://wa.me/919993374923?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  // Shared tick-list style helper
  const tick = (color: string) => ({
    display: "flex", gap: 8, alignItems: "flex-start",
    marginBottom: 7, fontSize: "13px", color: DIM, lineHeight: 1.5,
  } as React.CSSProperties);

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

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <div style={{ font: "700 11px/1.4 'Instrument Sans',system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL, marginBottom: "12px" }}>
          THE ROADMAP
        </div>
        <h1 style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(24px,5vw,38px)", lineHeight: 1.15, color: NAVY, marginBottom: "16px" }}>
          It is not your child who moves first. It is you.
        </h1>
        <p style={{ fontSize: "16px", color: DIM, lineHeight: 1.7, marginBottom: "44px", maxWidth: "54ch" }}>
          The goal was never a child who focuses because you asked. It is a child who runs their own attention — and that only arrives if your role changes on the way there. This is how that happens, week by week, and who you become by the end of it.
        </p>

        {/* ── 2. Goal ──────────────────────────────────────────────────────── */}
        <div style={{ background: "#FEF9EE", border: `1px solid ${GOLD}55`, borderRadius: 20, padding: "32px 28px", marginBottom: "44px" }}>
          <div style={{ font: "700 11px/1.4 'Instrument Sans',system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: NAVY, marginBottom: "14px" }}>THE GOAL</div>
          <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(18px,3vw,24px)", lineHeight: 1.25, marginBottom: "16px" }}>
            <div style={{ color: NAVY }}>Not a child who focuses because you told them to.</div>
            <div style={{ color: TEAL }}>A child who learns how to manage their own attention.</div>
          </div>
          <p style={{ margin: "0 0 22px", fontSize: "14px", color: DIM, lineHeight: 1.65 }}>
            By the end of the roadmap, the goal is for {c} to gradually become better at:
          </p>
          <div className="rm-goal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "20px" }}>
            {([
              ["01", "NOTICE",  "Spot when their attention has drifted."],
              ["02", "DIRECT",  "Choose where it needs to go."],
              ["03", "PROTECT", "Cut down what keeps pulling it away."],
              ["04", "RECOVER", "Know how to get back to it."],
            ] as [string, string, string][]).map(([num, label, desc]) => (
              <div key={num} style={{ background: CARD, borderRadius: 12, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 6, border: `1px solid ${LINE}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: TEAL, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "700 11px/1 'Instrument Sans',system-ui", flexShrink: 0 }}>{num}</div>
                  <div style={{ font: "700 11px/1.2 'Instrument Sans',system-ui", letterSpacing: "0.08em", textTransform: "uppercase", color: NAVY }}>{label}</div>
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
          {/* "And for you?" */}
          <div className="rm-and-for-you" style={{ background: NAVY, borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: "6px 8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="rm-and-for-you-img" src="/aa-logo.png" alt="Attention Architect" style={{ height: 30, width: "auto", display: "block" }} />
            </div>
            <div>
              <div style={{ font: "700 10px/1.4 'Instrument Sans',system-ui", letterSpacing: "0.1em", textTransform: "uppercase", color: GOLD, marginBottom: 6 }}>And for you?</div>
              <p style={{ margin: "0 0 6px", fontSize: "13px", color: "rgba(255,255,255,.85)", lineHeight: 1.55 }}>
                To become the parent who knows when to step in, what to change, and when to step back.
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: GOLD, fontWeight: 600 }}>
                That&rsquo;s the Attention Architect.
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. Six weeks ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          <div style={{ font: "700 11px/1.4 'Instrument Sans',system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL, marginBottom: "10px" }}>THE SIX WEEKS</div>
          <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "10px" }}>
            One change a week. Six weeks. That&rsquo;s the whole ask.
          </h2>
          <p style={{ fontSize: "14px", color: DIM, lineHeight: 1.65, marginBottom: "18px", maxWidth: "56ch" }}>
            Each week works on you first, then on them — the second half doesn&rsquo;t hold without the first.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {weekContents.slice(0, 6).map(({ weekTitle, day2Title, day4Title, whatToSay }, i) => {
              const wc = W[i] ?? TEAL;
              const signal = archSignals?.[i] ?? "";
              return (
                <div key={i} style={{ background: CARD, border: `1px solid ${LINE}`, borderLeft: `4px solid ${wc}`, borderRadius: 10, overflow: "hidden" }}>
                  {/* Badge + title */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px 0" }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: wc, color: "#fff", fontFamily: BF, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div style={{ fontFamily: BF, fontWeight: 700, fontSize: 14.5, color: NAVY, lineHeight: 1.25 }}>{weekTitle}</div>
                  </div>
                  {/* You / Them — always visible */}
                  <div style={{ padding: "8px 14px 0 50px", display: "flex", flexDirection: "column", gap: 2 }}>
                    <div className="rm-dot-f" style={{ fontSize: "12px", lineHeight: 1.55, color: wc }}><strong style={{ color: NAVY }}>You:</strong> {day2Title}</div>
                    <div className="rm-dot-o" style={{ fontSize: "12px", lineHeight: 1.55, color: wc }}><strong style={{ color: NAVY }}>Them:</strong> {THEM_LINES[i]}</div>
                  </div>
                  {/* Accordion — one per week, week 1 open */}
                  <details open={i === 0} style={{ margin: "10px 14px 12px 50px", borderTop: `1px dashed ${LINE}`, paddingTop: 9 }}>
                    <summary style={{ cursor: "pointer", fontSize: "10px", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: GOLD, display: "flex", justifyContent: "space-between", alignItems: "center", listStyle: "none" }}>
                      What to say · Watch for
                      <span className="rm-wk-icon" />
                    </summary>
                    <div style={{ marginTop: 9 }}>
                      {whatToSay && (
                        <>
                          <div style={{ fontSize: "8px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: TEAL_D }}>What to say</div>
                          <p style={{ margin: "2px 0 10px", fontSize: "12px", fontStyle: "italic", color: NAVY, lineHeight: 1.5 }}>&ldquo;{whatToSay}&rdquo;</p>
                        </>
                      )}
                      {day4Title && (
                        <>
                          <div style={{ fontSize: "8px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: TEAL_D, marginBottom: 2 }}>Also this week</div>
                          <p style={{ margin: "0 0 10px", fontSize: "12px", color: DIM, lineHeight: 1.5 }}>{day4Title}</p>
                        </>
                      )}
                      {signal && (
                        <>
                          <div style={{ fontSize: "8px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: DIM }}>Watch for</div>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: DIM, lineHeight: 1.5, fontStyle: "italic" }}>{signal}</p>
                        </>
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. Mid-page free call — gift for finishing the assessment ────── */}
        <div style={{ marginBottom: "44px" }}>
          <div style={{ font: "700 10px/1.4 ‘Instrument Sans’,system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL_D, marginBottom: 12 }}>
            Yours for finishing the assessment
          </div>
          <div style={{ background: CARD, border: `1.5px solid ${TEAL}55`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ height: 4, background: TEAL }} />
            <div style={{ padding: "18px 18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                <div style={{ fontFamily: BF, fontWeight: 700, fontSize: "16px", color: NAVY }}>A call with our founder</div>
                <div style={{ background: TEAL, color: "#fff", fontSize: "8px", fontWeight: 700, letterSpacing: ".08em", padding: "3px 7px", borderRadius: 5, flexShrink: 0 }}>FREE FOR YOU</div>
              </div>
              <div style={{ fontFamily: BF, fontWeight: 800, fontSize: 28, color: TEAL_D, lineHeight: 1, marginBottom: 4 }}>
                Free&nbsp;<s style={{ fontSize: 13, fontWeight: 600, color: "#A6ADB8" }}>₹999</s>
              </div>
              <div style={{ fontSize: "11px", color: DIM, marginBottom: 16 }}>30 minutes · No purchase needed</div>
              <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0 }}>
                {[
                  "Bring one evening that isn’t working",
                  "We look at it together",
                  "Yours because you finished the assessment",
                ].map(item => (
                  <li key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7, fontSize: "13px", color: DIM, lineHeight: 1.5 }}>
                    <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={handleFounderCall}
                style={{ width: "100%", background: TEAL, color: "#fff", fontFamily: BF, fontWeight: 700, fontSize: "14px", padding: "13px", borderRadius: 10, border: "none", cursor: "pointer", display: "block", boxSizing: "border-box" }}
              >
                Book your free call →
              </button>
            </div>
          </div>
        </div>

        {/* ── 5. Ladder ────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(20px,3.5vw,28px)", lineHeight: 1.2 }}>
              <span style={{ color: NAVY }}>From managing attention to</span><br />
              <span style={{ color: TEAL }}>architecting it</span>
            </div>
          </div>
          <p style={{ textAlign: "center", fontSize: "14px", color: DIM, lineHeight: 1.65, maxWidth: "46ch", margin: "0 auto 28px" }}>
            You don&rsquo;t need to manage {c}&rsquo;s attention forever. The roadmap changes <em>your</em> role, step by step, so they learn to manage their own.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {([
              { color: "#E85D5D", name: "The Reminder Parent",     quote: "Focus. Finish your homework. Put the phone away.",                                   desc: "You manage attention from the outside." },
              { color: GOLD,      name: "The Observant Parent",    quote: "What keeps pulling their attention away?",                                            desc: "You begin noticing the patterns instead of reacting to every distraction." },
              { color: "#3B82F6", name: "The Guiding Parent",      quote: "What would make this easier to start?",                                               desc: "You stop giving constant instructions and start changing the conditions around attention." },
              { color: "#7C3AED", name: "The Coaching Parent",     quote: "What do you notice about your own attention?",                                         desc: "Your child begins recognising distraction, difficulty, fatigue and what helps them return." },
              { color: TEAL,      name: "The Attention Architect",  quote: "I don't have to manage their attention. They are learning to manage it themselves.", desc: "You design the environment, teach the skills, and gradually hand ownership back to your child." },
            ] as { color: string; name: string; quote: string; desc: string }[]).map((rung, i, arr) => (
              <div key={rung.name} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 0", borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none" }}>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: rung.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", font: "700 13px/1 'Instrument Sans',system-ui" }}>{i + 1}</div>
                  {i < arr.length - 1 && <div style={{ width: 2, height: 18, background: LINE, marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 4, flex: 1 }}>
                  <div style={{ font: "700 13px/1.3 'Instrument Sans',system-ui", color: rung.color, marginBottom: 3 }}>{rung.name}</div>
                  <div style={{ font: "600 12px/1.45 'Instrument Sans',system-ui", color: INK, fontStyle: "italic", marginBottom: 8 }}>
                    &ldquo;{rung.quote}&rdquo;
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/ladder-${i + 1}.png`} alt=""
                    style={{ width: "100%", maxWidth: 220, height: "auto", borderRadius: 8, display: "block", margin: "0 auto 8px" }} />
                  <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.6 }}>{rung.desc}</p>
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

        {/* ── 6. School night, six weeks apart ─────────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "14px" }}>
            A school night, six weeks apart
          </h2>
          <div className="rm-sn-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#FBEDEA", border: "1px solid #F3D7D0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: "8.5px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: "#A8341F", marginBottom: 10 }}>Right now</div>
              {NOW_LINES.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < NOW_LINES.length - 1 ? 6 : 0 }}>
                  <span style={{ color: "#A8341F", opacity: 0.5, flexShrink: 0, lineHeight: 1.55 }}>—</span>
                  <span style={{ fontSize: "12px", color: "#7A2E1A", lineHeight: 1.55 }}>{line}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#DCECE7", border: "1px solid #C4E0D7", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: "8.5px", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, color: TEAL_D, marginBottom: 10 }}>In six weeks</div>
              {THEN_LINES.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < THEN_LINES.length - 1 ? 6 : 0 }}>
                  <span style={{ color: TEAL_D, opacity: 0.5, flexShrink: 0, lineHeight: 1.55 }}>—</span>
                  <span style={{ fontSize: "12px", color: "#1A5E4A", lineHeight: 1.55 }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
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
                <div style={{ fontSize: "12px", fontWeight: 600, color: DIM }}>Roadmap + three founder calls</div>
                <div style={{ background: GOLD, color: NAVY, fontSize: "8px", fontWeight: 700, letterSpacing: ".08em", padding: "3px 7px", borderRadius: 5, flexShrink: 0 }}>RECOMMENDED</div>
              </div>
              <div style={{ fontFamily: BF, fontWeight: 800, fontSize: 27, color: NAVY, lineHeight: 1, marginBottom: 4 }}>
                ₹4,999&nbsp;<s style={{ fontSize: 13, fontWeight: 600, color: "#A6ADB8" }}>₹7,999</s>
              </div>
              <div style={{ fontSize: "10.5px", color: DIM, marginBottom: 12 }}>One-time · 7-day guarantee</div>
              <ul style={{ listStyle: "none", margin: "0 0 14px", padding: 0 }}>
                {[
                  `The personalised six-week roadmap built around ${c}`,
                  "Three founder calls, not one",
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

        {/* ── 8. Testimonials ───────────────────────────────────────────────── */}
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
