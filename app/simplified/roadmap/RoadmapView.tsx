"use client";

import { useState, useEffect, useRef } from "react";
import { TESTIMONIAL_POOL } from "@/lib/content/report-content";

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
const W  = ["#E2705F", "#E9973F", "#DFC13C", "#4E9E86", "#3D7CB8", "#7B6BC4"] as const;
const C1 = "#E2705F";
const C2 = "#E9973F";
const C3 = "#3D7CB8";
const C4 = "#4E9E86";

// Rung 1 quote — varies by parent instinct, everything else stays universal
const RUNG1_QUOTE: Record<string, string> = {
  "The Quick Fixer":  "Here — let me show you a different way.",
  "The Pusher":       "Focus. Finish your homework. Put the phone away.",
  "The Negotiator":   "Finish this bit and then you can have your phone.",
  "The Steady Hand":  "I'll wait. Whenever you're ready.",
};

// Problem each module solves — one per week, universal
const PROBLEM_LINES = [
  "For evenings that take three reminders before anything begins.",
  "For when something easier is always one tap away.",
  "For the tired Tuesday, not the good day.",
  "For when one interruption ends the whole session.",
  "For when it only works at the kitchen table.",
  "For the evening you don't have to be in the room.",
] as const;

// What the child is building — per archetype × week
const THEM_LINES_BY_ARCHETYPE: Record<string, readonly [string, string, string, string, string, string]> = {
  "The Storm": [
    "begins once the choice is genuinely theirs",
    "stays with it even when it wasn't their idea",
    "runs a whole stretch without handing it back",
    "picks it up again after a bad call",
    "makes their own calls outside homework too",
    "decides before you think to offer",
  ],
  "The All-In Kid": [
    "gets into something without needing a run-up",
    "comes out of a screen like they would a book",
    "keeps going on a day that usually derails it",
    "a session going nowhere doesn't wreck the evening",
    "protects their own focus somewhere new",
    "asks for the quiet themselves",
  ],
  "The Inventor": [
    "starts their own way without waiting to be told",
    "sticks with their method when a shortcut appears",
    "carries one approach across days, adjusting as they go",
    "a method failing doesn't end the whole thing",
    "uses their own way somewhere new",
    "explains why they did it that way",
  ],
  "The Explorer": [
    "writes the idea down instead of chasing it",
    "comes back to the page after the break",
    "keeps using it on an ordinary day",
    "one idea going nowhere doesn't stop the next",
    "reaches for it somewhere you never set it up",
    "uses it without any reminder from you",
  ],
  "The Magnet": [
    "begins with you nearby but not helping",
    "stays with it when the room goes quiet",
    "keeps going on a day you can't sit with them",
    "works through a hard bit without you fixing it",
    "holds their own in a group, not just with you",
    "tells you when they want you close",
  ],
  "The Glue": [
    "starts once things feel settled between you",
    "stays with it even when something's unresolved",
    "keeps going on a day that already went badly",
    "a wobble doesn't take the whole evening with it",
    "handles a sibling moment without carrying all of it",
    "tells you how they're doing before you ask",
  ],
  "The Captain": [
    "starts when it's genuinely theirs to run",
    "keeps going when someone else sets the terms",
    "runs something ongoing for a whole week",
    "it going wrong doesn't stop them leading next time",
    "takes charge somewhere outside homework",
    "steps up before anyone asks",
  ],
  "The Live Wire": [
    "starts when something's actually riding on it",
    "keeps going after the exciting part ends",
    "carries a stake across days, not one burst",
    "a stake not paying off doesn't stop the next",
    "sets stakes outside homework too",
    "sets their own without being prompted",
  ],
};

const SCHOOL_NIGHT: Record<string, { now: [string,string,string]; then: [string,string,string] }> = {
  "The Storm": {
    now:  ["The evening starts with who decided what", "You ask, they push back, you ask again", "Nothing begins until someone gives in"],
    then: ["They pick where to start and get going", "You offer once, then leave it", "The argument stops being about whose idea it was"],
  },
  "The All-In Kid": {
    now:  ["Getting them in takes twenty minutes", "Getting them out takes another twenty", "Any interruption ends the session"],
    then: ["They settle in faster because the block is protected", "Stopping stops being a fight", "One interruption doesn't end the evening"],
  },
  "The Inventor": {
    now:  ["You show them the quicker way and they stop", "The long way takes an hour", "You end up doing half of it"],
    then: ["They start their own way without waiting to be told", "The long way finishes, and it’s theirs", "You stop reaching for the shortcut"],
  },
  "The Explorer": {
    now:  ["An idea arrives and the page stops moving", "You ask twice, and the second time is sharper", "Twenty minutes on, nothing’s been written"],
    then: ["The idea gets written down and the work carries on", "You ask once, or not at all", "The page moves, even on an ordinary evening"],
  },
  "The Magnet": {
    now:  ["Nothing happens unless you’re in the room", "You sit down and it starts; you leave and it stops", "You’re at the table longer than they are"],
    then: ["They begin with you nearby but not helping", "You can leave the room and it carries on", "You get the evening back"],
  },
  "The Glue": {
    now:  ["The pencil doesn’t move and nothing’s wrong with the homework", "Something unresolved is sitting between you", "You find out an hour later what it was"],
    then: ["Things get named before the work starts", "A bad afternoon doesn’t take the whole evening", "The page moves once the air is clear"],
  },
  "The Captain": {
    now:  ["Every instruction slows things down", "They do it, but at half speed", "It only moves when you’re standing over it"],
    then: ["They run it themselves and it gets done faster", "You stop giving instructions", "You find out it’s finished without having asked"],
  },
  "The Live Wire": {
    now:  ["Without a clock nothing registers as happening", "Ninety seconds in, they’re gone", "You supply the urgency, every night"],
    then: ["They set the stake and it holds", "The energy lasts past the interesting part", "You stop being the one making it matter"],
  },
};

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
  childName:     string;
  archetype:     string;
  parentPattern?: string;
  weekContents:  WeekContent[];
  sessionId:     string | null;
  parentName?:   string;
  email?:        string;
  phone?:        string;
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

export default function RoadmapView({ childName: c, archetype, parentPattern = "The Pusher", weekContents, sessionId, parentName = "", email = "", phone = "" }: Props) {
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

        {/* ── 3. Six weeks — compressed timeline ───────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          <div style={{ font: "700 11px/1.4 'Instrument Sans',system-ui", letterSpacing: "0.12em", textTransform: "uppercase", color: TEAL, marginBottom: "10px" }}>THE SIX WEEKS</div>
          <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "10px" }}>
            One change a week
          </h2>
          <p style={{ fontSize: "14px", color: DIM, lineHeight: 1.65, marginBottom: "18px", maxWidth: "56ch" }}>
            Each week works on you first, then on {c}.
          </p>
          <div style={{ position: "relative" }}>
            {weekContents.slice(0, 6).map(({ weekTitle, day2Title, whatToSay }, i) => {
              const wc = W[i] ?? TEAL;
              const themLine = (THEM_LINES_BY_ARCHETYPE[archetype] ?? THEM_LINES_BY_ARCHETYPE["The All-In Kid"]!)[i] ?? "";
              return (
                <div key={i} className="rm-wk-row">
                  <div style={{ width: 29, height: 29, borderRadius: 9, background: wc, color: "#fff", fontFamily: BF, fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>{i + 1}</div>
                  <div className="rm-wk-body">
                    <div style={{ fontFamily: BF, fontWeight: 700, fontSize: 14.5, color: NAVY, lineHeight: 1.2 }}>{weekTitle}</div>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5, marginTop: 4, color: DIM }}>{PROBLEM_LINES[i]}</div>
                    <details className="rm-wk-det" style={{ marginTop: 8 }}>
                      <summary>What you do <span className="rm-wk-icon" /></summary>
                      <div style={{ marginTop: 9, background: CARD, borderRadius: 10, padding: 12, boxShadow: "0 2px 8px rgba(20,40,77,.05)" }}>
                        <div className="rm-dot-f" style={{ fontSize: 11.5, lineHeight: 1.5, color: wc, marginBottom: 4 }}><strong style={{ fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase" as const, color: NAVY, opacity: 0.6, display: "inline" }}>You </strong>{day2Title}</div>
                        <div className="rm-dot-o" style={{ fontSize: 11.5, lineHeight: 1.5, color: wc }}><strong style={{ fontSize: 9, letterSpacing: ".06em", textTransform: "uppercase" as const, color: NAVY, opacity: 0.6, display: "inline" }}>{c} </strong>{themLine}</div>
                        {whatToSay && (
                          <div style={{ background: NAVY, borderRadius: 8, padding: "9px 11px", marginTop: 9 }}>
                            <div style={{ fontSize: 7.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: GOLD, fontWeight: 700 }}>Say</div>
                            <div style={{ fontSize: 11.5, fontStyle: "italic", color: "#fff", marginTop: 3, fontFamily: BF, fontWeight: 600 }}>&ldquo;{whatToSay}&rdquo;</div>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── The arc — school-night before/after merged into stages 1 & 2 ── */}
        {(() => {
          const sn = SCHOOL_NIGHT[archetype] ?? SCHOOL_NIGHT["The Explorer"]!;
          const arcSteps: { dot: string; label: string; when: string; title: string; line: string }[] = [
            { dot: C1, label: "NOW", when: "Tonight",          title: "You’re the reason it happens",     line: [sn.now[0], sn.now[1]].filter(Boolean).join(". ") + "." },
            { dot: C2, label: "6W",  when: "By week six",      title: "They start without being asked",       line: sn.then[0] ?? "" },
            { dot: C3, label: "→",   when: "The months after", title: "It turns up elsewhere",                 line: "Somewhere nobody taught it. They notice their own drift." },
            { dot: C4, label: "∞",   when: "What you’re building", title: "A child who runs their own attention", line: "The skill nobody hands out at nineteen." },
          ];
          return (
            <div style={{ marginBottom: "44px", borderRadius: 14, overflow: "hidden", background: NAVY }}>
              <div style={{ padding: "22px 20px 24px" }}>
                <div style={{ fontSize: 8.5, letterSpacing: "0.13em", textTransform: "uppercase" as const, fontWeight: 700, color: "#FBCB4A", marginBottom: 7 }}>Where this goes</div>
                <div style={{ fontFamily: BF, fontWeight: 700, fontSize: "clamp(18px,3.5vw,22px)", lineHeight: 1.16, color: "#fff", marginBottom: 9 }}>
                  A school night with {c}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "#AFBACB", marginBottom: 17 }}>
                  Six weeks is the start of it, not the whole of it.
                </div>
                <div>
                  {arcSteps.map((s, i, arr) => (
                    <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < arr.length - 1 ? 16 : 0, position: "relative" }}>
                      {i < arr.length - 1 && (
                        <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 2, background: "rgba(255,255,255,.16)" }} />
                      )}
                      <div style={{ width: 31, height: 31, borderRadius: "50%", background: s.dot, color: "#fff", fontFamily: BF, fontWeight: 800, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>{s.label}</div>
                      <div style={{ flex: 1, paddingTop: 3 }}>
                        <div style={{ fontSize: 8, letterSpacing: "0.11em", textTransform: "uppercase" as const, fontWeight: 700, color: s.dot }}>{s.when}</div>
                        <div style={{ fontFamily: BF, fontSize: 14.5, fontWeight: 700, color: "#fff", marginTop: 3, lineHeight: 1.22 }}>{s.title}</div>
                        <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#AFBACB", marginTop: 5 }}>{s.line}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

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
          <p style={{ textAlign: "center", fontSize: "14px", color: DIM, lineHeight: 1.65, maxWidth: "46ch", margin: "0 auto 24px" }}>
            You don&rsquo;t need to manage {c}&rsquo;s attention forever. The roadmap changes <em>your</em> role, step by step, so they learn to manage their own.
          </p>
          <div>
            {([
              { color: "#E85D5D", name: "The Reminder Parent",     quote: RUNG1_QUOTE[parentPattern] ?? RUNG1_QUOTE["The Pusher"]!, desc: "Every parent starts here. What differs is how." },
              { color: GOLD,      name: "The Observant Parent",    quote: "What keeps pulling their attention away?",                                            desc: "You begin noticing the patterns instead of reacting to every distraction." },
              { color: "#3B82F6", name: "The Guiding Parent",      quote: "What would make this easier to start?",                                               desc: "You stop giving constant instructions and start changing the conditions around attention." },
              { color: "#7C3AED", name: "The Coaching Parent",     quote: "What do you notice about your own attention?",                                        desc: "Your child begins recognising distraction, difficulty, fatigue and what helps them return." },
              { color: TEAL,      name: "The Attention Architect", quote: "I don’t have to manage their attention. They are learning to manage it themselves.", desc: "You design the environment, teach the skills, and gradually hand ownership back to your child." },
            ] as { color: string; name: string; quote: string; desc: string }[]).map((rung, i, arr) => (
              <div key={rung.name} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "16px 0", borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none" }}>
                {/* Thumbnail with badge overlapping top-left */}
                <div style={{ position: "relative", flexShrink: 0, width: 100, height: 100 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/ladder-${i + 1}.png`} alt="" style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", display: "block" }} />
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
