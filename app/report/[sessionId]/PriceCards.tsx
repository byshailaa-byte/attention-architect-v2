"use client";

import { useEffect, useRef } from "react";
import { PlanPricing } from "./PlanInteractive";
import { track } from "@/lib/analytics/track";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open(): void };
  }
}

type Props = {
  sessionId: string;
  childName: string;
  weakestFirst: string;
  parentName: string;
  email: string;
  phone: string;
};

export default function PriceCards({ sessionId, childName, parentName, email, phone }: Props) {
  const firedViewItem = useRef(false);
  const firedPricingView = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    // DB keeps the full {tiers}; GA4 + Pixel(custom view_item) + Pixel ViewContent get only the
    // allow-listed params (currency). content_ids/items are dropped by default-deny.
    track("view_item", { tiers: ["tier1", "tier2"], currency: "INR" }, sessionId);
  }, [sessionId]);

  // Fires once when the pricing card is ≥50% visible in the viewport — distinct from
  // view_item (which fires on mount) and scroll_milestone (which is page-level).
  useEffect(() => {
    if (!rootRef.current || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !firedPricingView.current) {
        firedPricingView.current = true;
        track("pricing_section_viewed", {}, sessionId);
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(rootRef.current);
    return () => obs.disconnect();
  }, [sessionId]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const reportUrl = `${baseUrl}/report/${sessionId}`;
  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this attention report: ${reportUrl}`)}`;

  return (
    <div ref={rootRef} style={{ maxWidth: "480px", margin: "0 auto" }}>

      <PlanPricing sessionId={sessionId} calendlyUrl="" childName={childName} parentName={parentName} email={email} phone={phone} />

      {/* Trust row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "#8B8570" }}>🔒 Secured by Razorpay</span>
        {["UPI", "Cards", "Netbanking"].map((m) => (
          <span key={m} style={{ background: "rgba(32,30,25,0.05)", border: "1px solid rgba(32,30,25,0.12)", borderRadius: "6px", fontSize: "11px", color: "#5B5648", padding: "2px 8px" }}>{m}</span>
        ))}
      </div>

      {/* WhatsApp share */}
      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "13px", color: "#8B8570" }}>
        Want to discuss with your partner first?{" "}
        <a
          href={waShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#34503F", textDecoration: "underline", textUnderlineOffset: "2px" }}
        >
          Share this report
        </a>
      </div>
    </div>
  );
}
