"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Pages where exit intent must NOT fire
const EXCLUDED_PREFIXES = [
  "/assessment",
  "/report",
  "/roadmap",
  "/profile",
  "/admin",
  "/lms",
  "/checkout",
  "/pre-assessment",
  "/generating",
  "/preview",
];

const SESSION_KEY = "exit_intent_shown";

const BG   = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
const NAVY = "#14284D";

// Mobile trigger: 30 s dwell + 30 % scroll depth, then show.
// False-positive profile: occasionally fires for users reading the page.
// Not false-negative-free: users who leave quickly (under 30 s) are missed.
const MOBILE_DWELL_MS   = 30_000;
const MOBILE_SCROLL_PCT = 30;

export default function ExitIntentModal() {
  const pathname     = usePathname();
  const [open, setOpen]     = useState(false);
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ wa_sent: boolean } | null>(null);

  const shownRef      = useRef(false);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollMetRef  = useRef(false);

  const isExcluded = EXCLUDED_PREFIXES.some(p => pathname.startsWith(p));

  function tryShow() {
    if (shownRef.current) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;
    shownRef.current = true;
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(SESSION_KEY, "1");
    setName("");
    setPhone("");
    setResult(null);
    setOpen(true);
  }

  useEffect(() => {
    if (isExcluded) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    if (!isMobile) {
      // Desktop: mouseleave at the top edge of the viewport
      function onMouseLeave(e: MouseEvent) {
        if (e.clientY < 5) tryShow();
      }
      document.addEventListener("mouseleave", onMouseLeave);
      return () => document.removeEventListener("mouseleave", onMouseLeave);
    } else {
      // Mobile: 30 s dwell + 30 % scroll depth → show.
      // Reset scroll-met flag on each page so scroll from a previous page
      // doesn't satisfy the condition for a page the user never scrolled.
      scrollMetRef.current = false;

      function checkMobileConditions() {
        if (scrollMetRef.current) tryShow();
      }

      function onScroll() {
        const scrolled = window.scrollY;
        const total    = document.documentElement.scrollHeight - window.innerHeight;
        if (total > 0 && (scrolled / total) * 100 >= MOBILE_SCROLL_PCT) {
          scrollMetRef.current = true;
        }
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      dwellTimerRef.current = setTimeout(checkMobileConditions, MOBILE_DWELL_MS);

      return () => {
        window.removeEventListener("scroll", onScroll);
        if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isExcluded]);

  async function submit() {
    if (!name.trim() || !phone.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/handbook-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), ageBand: "exit-intent", variant: "simplified" }),
      });
      const data = await res.json().catch(() => ({})) as { wa_sent?: boolean };
      setResult({ wa_sent: data.wa_sent ?? false });
    } catch {
      setResult({ wa_sent: false });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || isExcluded) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Get the free Attention Handbook"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) setOpen(false); }}
    >
      <div style={{
        background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "18px",
        padding: "32px 28px", maxWidth: "400px", width: "100%",
        boxShadow: "0 24px 60px rgba(0,0,0,.22)", position: "relative",
      }}>
        <button
          onClick={() => setOpen(false)}
          style={{ position: "absolute", top: "16px", right: "18px", background: "none", border: "none", fontSize: "20px", color: "var(--ink-dim)", cursor: "pointer", lineHeight: 1, padding: "4px" }}
          aria-label="Close"
        >×</button>

        {!result ? (
          <>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "var(--ink)", lineHeight: 1.3, marginBottom: "10px" }}>
              Before you go — take the Handbook with you.
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "16px" }}>
              Six things you can try tonight, explained clearly. Free, no assessment required.
            </p>
            <p style={{ fontSize: "13.5px", color: "var(--ink-dim)", lineHeight: 1.6, marginBottom: "16px" }}>
              Where should we send it? Enter your WhatsApp number and we&apos;ll send the Attention Handbook within a few minutes.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px" }}>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ border: "1.5px solid var(--line)", borderRadius: "10px", padding: "12px 14px", fontSize: "14.5px", fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
              <input
                type="tel"
                placeholder="WhatsApp number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                style={{ border: "1.5px solid var(--line)", borderRadius: "10px", padding: "12px 14px", fontSize: "14.5px", fontFamily: "inherit", color: "var(--ink)", background: "var(--paper)", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={submit}
              disabled={!name.trim() || !phone.trim() || submitting}
              style={{
                width: "100%", background: NAVY, color: "#fff", border: "none", borderRadius: "10px",
                padding: "14px 20px", fontWeight: 700, fontSize: "15px",
                cursor: name.trim() && phone.trim() && !submitting ? "pointer" : "not-allowed",
                opacity: name.trim() && phone.trim() && !submitting ? 1 : 0.55, fontFamily: "inherit", marginBottom: "10px",
              }}
            >
              {submitting ? "Sending…" : "Send me the Handbook →"}
            </button>
            <p style={{ fontSize: "11.5px", color: "var(--ink-dim)", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              By continuing, you agree to receive the Handbook and occasional related messages from Attention Architect on WhatsApp. Reply STOP any time to opt out.
            </p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>✓</div>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: "18px", color: "var(--ink)", marginBottom: "10px" }}>
              {result.wa_sent ? "Handbook sent to your WhatsApp." : "You're on the list."}
            </div>
            <p style={{ fontSize: "14px", color: "var(--ink-dim)", lineHeight: 1.6 }}>
              {result.wa_sent
                ? "Check your WhatsApp — the link is on its way."
                : "We'll send you the Attention Handbook on WhatsApp in 1–2 days, once our messaging setup is live."}
            </p>
            <button
              onClick={() => setOpen(false)}
              style={{ marginTop: "20px", background: "none", border: "1.5px solid var(--line)", borderRadius: "10px", padding: "10px 22px", fontSize: "13.5px", fontWeight: 600, color: "var(--ink-dim)", cursor: "pointer", fontFamily: "inherit" }}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
