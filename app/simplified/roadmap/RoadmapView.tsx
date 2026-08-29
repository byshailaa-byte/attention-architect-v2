"use client";

import { useState, useEffect, useRef } from "react";

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
const INK    = "#1A1A1A";
const DIM    = "#555";
const LINE   = "#E2DFDA";
const BG     = "#FAFAF7";
const CARD   = "#FFFFFF";
const BF     = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

export type WeekPreview = {
  weekTitle: string;
  bullets: [string, string, string];
};

export type WeekContent = {
  weekTitle: string;
  day2Title: string;   // WHAT YOU DO — primary action
  day4Title: string;   // WHAT YOU DO — secondary action
  whatToSay: string;   // PDF shared script (verbatim)
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
  details summary { border-radius: 14px; }
  details[open] summary { border-radius: 14px 14px 0 0; }
  @media (max-width: 520px) {
    .rm-locked-grid { grid-template-columns: 1fr !important; }
    .rm-nav-label { display: none !important; }
    .rm-pricing { padding: 24px 18px !important; }
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
    "Homework starts without the friction it used to start with.",
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
    const label = tier === "tier1" ? "Roadmap" : "Roadmap + Founder Call";
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

  const WEEK_COLORS = [TEAL, GOLD, NAVY] as const;

  return (
    <div style={{ background: BG, minHeight: "100dvh", fontFamily: "'Inter', system-ui, sans-serif", color: INK }}>
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />

      {/* Nav */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: "12px", background: CARD, position: "sticky", top: 0, zIndex: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 24, width: "auto", flexShrink: 0 }} />
        <span className="rm-nav-label" style={{ fontSize: "12px", color: DIM, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {c}&rsquo;s Attention Health Roadmap
        </span>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 18px 80px" }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{
          font: "700 11px/1.4 var(--font-sans, system-ui)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: TEAL, marginBottom: "12px",
        }}>
          THE ROADMAP
        </div>
        <h1 style={{
          fontFamily: BF, fontWeight: 800,
          fontSize: "clamp(24px,5vw,38px)", lineHeight: 1.15,
          color: NAVY, marginBottom: "16px",
        }}>
          It is not your child who moves first. It is you.
        </h1>
        {/* Source: THE_PLAN.pdf verbatim */}
        <p style={{ fontSize: "16px", color: DIM, lineHeight: 1.7, marginBottom: "44px", maxWidth: "54ch" }}>
          The goal was never a child who focuses because you asked. It is a child who runs their own attention — and that only arrives if your role changes on the way there. This is how that happens, week by week, and who you become by the end of it.
        </p>

        {/* ── Parent Ladder ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "44px" }}>
          {/* Two-tone centred heading — matches THE_PLAN.pdf */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(20px,3.5vw,28px)", lineHeight: 1.2 }}>
              <span style={{ color: NAVY }}>From managing attention to</span><br />
              <span style={{ color: TEAL }}>architecting it</span>
            </div>
          </div>
          <p style={{
            textAlign: "center", fontSize: "14px", color: DIM, lineHeight: 1.65,
            maxWidth: "46ch", margin: "0 auto 28px",
          }}>
            You don&rsquo;t need to manage your child&rsquo;s attention forever. The roadmap changes <em>your</em> role, step by step, so they learn to manage their own.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {([
              { color: "#E85D5D", name: "The Reminder Parent",     quote: "Focus. Finish your homework. Put the phone away.",                                   desc: "You manage attention from the outside." },
              { color: "#F5A623", name: "The Observant Parent",    quote: "What keeps pulling their attention away?",                                            desc: "You begin noticing the patterns instead of reacting to every distraction." },
              { color: "#3B82F6", name: "The Guiding Parent",      quote: "What would make this easier to start?",                                               desc: "You stop giving constant instructions and start changing the conditions around attention." },
              { color: "#7C3AED", name: "The Coaching Parent",     quote: "What do you notice about your own attention?",                                         desc: "Your child begins recognising distraction, difficulty, fatigue and what helps them return." },
              { color: TEAL,      name: "The Attention Architect",  quote: "I don't have to manage their attention. They are learning to manage it themselves.", desc: "You design the environment, teach the skills, and gradually hand ownership back to your child." },
            ] as { color: string; name: string; quote: string; desc: string }[]).map((rung, i, arr) => (
              <div key={rung.name} style={{
                display: "flex", gap: 16, alignItems: "flex-start",
                padding: "16px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none",
              }}>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: rung.color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    font: "700 13px/1 var(--font-sans, system-ui)",
                  }}>{i + 1}</div>
                  {i < arr.length - 1 && <div style={{ width: 2, height: 18, background: LINE, marginTop: 4 }} />}
                </div>
                <div style={{ paddingTop: 4, flex: 1 }}>
                  <div style={{ font: "700 13px/1.3 var(--font-sans, system-ui)", color: rung.color, marginBottom: 3 }}>{rung.name}</div>
                  <div style={{ font: "600 12px/1.45 var(--font-sans, system-ui)", color: INK, fontStyle: "italic", marginBottom: 8 }}>
                    &ldquo;{rung.quote}&rdquo;
                  </div>
                  {/* AI-generated placeholder — replace before any paid campaign (see project open items) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/ladder-${i + 1}.png`} alt=""
                    style={{ width: "100%", maxWidth: 220, height: "auto", borderRadius: 8, display: "block", marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.6 }}>{rung.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Footer rail */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 18,
            font: "500 11.5px/1.4 var(--font-sans, system-ui)", color: DIM,
          }}>
            <span style={{ color: "#E85D5D", fontWeight: 700 }}>More control from you</span>
            <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, #E85D5D, ${TEAL})`, borderRadius: 2 }} />
            <span style={{ color: TEAL, fontWeight: 700 }}>More ownership by your child</span>
          </div>
        </div>

        {/* ── Goal section ─────────────────────────────────────────────────── */}
        <div style={{
          background: "#FEF9EE", border: `1px solid ${GOLD}55`,
          borderRadius: 20, padding: "32px 28px", marginBottom: "44px",
        }}>
          <div style={{
            font: "700 11px/1.4 var(--font-sans, system-ui)",
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: NAVY, marginBottom: "14px",
          }}>THE GOAL</div>
          <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "clamp(18px,3vw,24px)", lineHeight: 1.25, marginBottom: "16px" }}>
            <div style={{ color: NAVY }}>Not a child who focuses because you told them to.</div>
            <div style={{ color: TEAL }}>A child who learns how to manage their own attention.</div>
          </div>
          <p style={{ margin: "0 0 22px", fontSize: "14px", color: DIM, lineHeight: 1.65 }}>
            By the end of the roadmap, the goal is for your child to gradually become better at:
          </p>
          <div className="rm-goal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "20px" }}>
            {([
              ["01", "NOTICE",  "Recognise when their attention has drifted."],
              ["02", "DIRECT",  "Choose where their attention needs to go."],
              ["03", "PROTECT", "Reduce the things that repeatedly pull it away."],
              ["04", "RECOVER", "Know how to return when attention is lost."],
            ] as [string, string, string][]).map(([num, label, desc]) => (
              <div key={num} style={{
                background: CARD, borderRadius: 12,
                padding: "16px 14px",
                display: "flex", flexDirection: "column", gap: 6,
                border: `1px solid ${LINE}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: TEAL, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    font: "700 11px/1 var(--font-sans, system-ui)",
                    flexShrink: 0,
                  }}>{num}</div>
                  <div style={{
                    font: "700 11px/1.2 var(--font-sans, system-ui)",
                    letterSpacing: "0.08em", textTransform: "uppercase", color: NAVY,
                  }}>{label}</div>
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
          {/* "And for you?" panel */}
          <div className="rm-and-for-you" style={{
            background: NAVY, borderRadius: 12, padding: "18px 20px",
            display: "flex", alignItems: "flex-start", gap: 14,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rm-and-for-you-img" src="/aa-logo.png" alt="Attention Architect"
              style={{ height: 36, width: "auto", flexShrink: 0, opacity: 0.9 }} />
            <div>
              <div style={{
                font: "700 10px/1.4 var(--font-sans, system-ui)",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: GOLD, marginBottom: 6,
              }}>And for you?</div>
              <p style={{ margin: "0 0 6px", fontSize: "13px", color: "rgba(255,255,255,.85)", lineHeight: 1.55 }}>
                To become the parent who knows when to step in, what to change, and when to step back.
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: GOLD, fontWeight: 600 }}>
                That&rsquo;s the Attention Architect.
              </p>
            </div>
          </div>
        </div>

        {/* ── The Whole Plan ───────────────────────────────────────────────── */}
        <div style={{
          font: "700 11px/1.4 var(--font-sans, system-ui)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: TEAL, marginBottom: "10px",
        }}>THE WHOLE PLAN</div>
        <h2 style={{ fontFamily: BF, fontWeight: 700, fontSize: "20px", color: NAVY, marginBottom: "10px" }}>
          Six weeks. One small change each week.
        </h2>
        <p style={{ fontSize: "14px", color: DIM, lineHeight: 1.65, marginBottom: "20px", maxWidth: "56ch" }}>
          Every parent gets these same six, in this order — you can read all of them right here. What the assessment adds is the part underneath each one: which move fits your child&rsquo;s pattern.
        </p>
        {/* DELIBERATE: accordion stays collapsed with week 1 open by default.
            PDF shows all six expanded; keeping accordion because six fully-expanded
            cards make the page impractically long on mobile. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "44px" }}>
          {weekContents.map(({ weekTitle, day2Title, day4Title, whatToSay }, i) => {
            const tagColor = WEEK_COLORS[i % WEEK_COLORS.length];
            const archSignals = ARCHETYPE_SIGNALS[archetype] ?? ARCHETYPE_SIGNALS["The All-In Kid"];
            const signal = archSignals?.[i] ?? "";
            return (
              <details key={i} open={i === 0} style={{ background: CARD, border: `1.5px solid ${tagColor}44`, borderRadius: "14px" }}>
                <summary style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px 18px", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: tagColor, marginBottom: "4px" }}>
                      WEEK {i + 1}
                    </div>
                    <div style={{ fontFamily: BF, fontWeight: 800, fontSize: "15px", color: NAVY, lineHeight: 1.3 }}>{weekTitle}</div>
                  </div>
                  <span className="rm-acc-icon" style={{ color: tagColor, fontSize: "20px", flexShrink: 0, marginTop: "2px" }} />
                </summary>
                <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${LINE}` }}>
                  {/* WHAT YOU DO */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: "9.5px", fontWeight: 700, color: tagColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 6 }}>
                      What you do
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                      {[day2Title, day4Title].filter(Boolean).map((title, bi) => (
                        <li key={bi} style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: "12.5px", color: DIM, lineHeight: 1.45 }}>
                          <span style={{ color: tagColor, fontWeight: 700, flexShrink: 0, fontSize: 11, marginTop: 2 }}>→</span>
                          <span>{title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* WHAT TO WATCH FOR */}
                  {signal && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: tagColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 5 }}>
                        What to watch for
                      </div>
                      <p style={{ margin: 0, fontSize: "12.5px", color: DIM, lineHeight: 1.55, fontStyle: "italic" }}>{signal}</p>
                    </div>
                  )}
                  {/* WHAT TO SAY */}
                  {whatToSay && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: "9.5px", fontWeight: 700, color: tagColor, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 5 }}>
                        What to say
                      </div>
                      <p style={{ margin: 0, fontSize: "13px", color: NAVY, lineHeight: 1.55, fontWeight: 600 }}>
                        &ldquo;{whatToSay}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────────── */}
        <div ref={pricingRef} className="rm-pricing" style={{ marginBottom: "44px" }}>
          <p style={{
            margin: "0 0 20px", fontFamily: BF, fontWeight: 700,
            fontSize: "clamp(15px,2.5vw,18px)", lineHeight: 1.4, color: NAVY, textAlign: "center",
          }}>
            The plan is the same six weeks. What goes underneath is {c}&rsquo;s.
          </p>

          {/* Tier 2 — dominant card */}
          <div style={{
            background: NAVY, borderRadius: 16, padding: "28px 24px",
            marginBottom: "12px", position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 14, right: 16,
              background: GOLD, color: NAVY,
              fontFamily: BF, fontWeight: 800, fontSize: "10px",
              letterSpacing: ".08em", textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 6,
            }}>
              Most popular
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,.55)", marginBottom: 6 }}>
              Roadmap + a Founder Call
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
              <div style={{
                fontFamily: BF, fontSize: "40px", fontWeight: 800,
                background: `linear-gradient(135deg, ${GOLD}, #FBCB4A)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text", lineHeight: 1,
              }}>
                ₹4,999
              </div>
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,.4)", textDecoration: "line-through" }}>₹7,999</div>
            </div>
            <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
              {[
                `The personalised six-week roadmap built around ${c}`,
                "A personal call with our founder — at a time that works for you",
                "7-day guarantee: full refund if it doesn't feel worth it",
              ].map(item => (
                <li key={item} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, fontSize: "13px", color: "rgba(255,255,255,.8)", lineHeight: 1.5 }}>
                  <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => openCheckout("tier2")}
              disabled={checkoutLoading || !sessionId}
              style={{
                width: "100%", background: GOLD, color: NAVY,
                fontFamily: BF, fontWeight: 800, fontSize: "16px",
                padding: "15px 24px", borderRadius: "12px",
                border: "none", cursor: checkoutLoading ? "wait" : "pointer",
                opacity: checkoutLoading ? 0.7 : 1,
              }}
            >
              {checkoutLoading ? "Loading…" : `Start ${c}’s roadmap →`}
            </button>
            <div style={{ marginTop: 12, fontSize: "11px", color: "rgba(255,255,255,.4)", textAlign: "center" }}>
              One-time · Secured by Razorpay
            </div>
          </div>

          {/* Tier 1 — lighter card */}
          <div style={{
            background: "#F5F4F0", border: `1px solid ${LINE}`, borderRadius: 14,
            padding: "20px 22px",
          }}>
            <div style={{ fontSize: "13px", color: DIM, marginBottom: 6 }}>Just the roadmap</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
              <div style={{ fontFamily: BF, fontSize: "28px", fontWeight: 800, color: NAVY }}>₹2,999</div>
              <div style={{ fontSize: "13px", color: "#bbb", textDecoration: "line-through" }}>₹4,999</div>
            </div>
            <button
              onClick={() => openCheckout("tier1")}
              disabled={checkoutLoading || !sessionId}
              style={{
                width: "100%", background: "transparent", color: NAVY,
                fontFamily: BF, fontWeight: 700, fontSize: "14px",
                padding: "12px 18px", borderRadius: "10px",
                border: `1.5px solid ${NAVY}`,
                cursor: checkoutLoading ? "wait" : "pointer",
                opacity: checkoutLoading ? 0.6 : 1,
              }}
            >
              {checkoutLoading ? "Loading…" : "Choose this plan →"}
            </button>
            <div style={{ marginTop: 10, fontSize: "11px", color: "#bbb", textAlign: "center" }}>
              One-time · 7-day guarantee
            </div>
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
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
            <details key={q} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: "12px", padding: "16px 20px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "14.5px", color: INK, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                {q}
                <span style={{ color: NAVY, fontSize: "18px", flexShrink: 0 }}>+</span>
              </summary>
              <div style={{ marginTop: "12px", fontSize: "14px", color: DIM, lineHeight: 1.65 }}>{a}</div>
            </details>
          ))}
        </div>

        <div style={{ fontSize: "12px", color: DIM, textAlign: "center" }}>
          Attention Architect is a parent-education and guidance platform, not a diagnostic service.
        </div>

      </div>
    </div>
  );
}
