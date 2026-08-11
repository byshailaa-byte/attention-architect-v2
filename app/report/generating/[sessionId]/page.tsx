"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const ink      = "#201E19";
const inkSoft  = "#5B5648";
const inkFaint = "#8B8570";
const accent   = "#34503F";
const surface  = "#FBF9F3";

const FR = `"Fraunces", Georgia, serif`;
const PP = `"Public Sans", "Inter", system-ui, sans-serif`;

function buildMessages(firstName: string, archetype: string): { headline: string; sub: string }[] {
  const child = firstName || "your child";
  const hasArchetype = archetype.length > 0;

  return [
    {
      headline: `Building ${child}'s report.`,
      sub: "We're reading through everything you shared — this takes about 60 seconds.",
    },
    {
      headline: hasArchetype ? `${child} is ${archetype}.` : `${child}'s pattern is taking shape.`,
      sub: hasArchetype
        ? "We're mapping what that means in practice — week by week, not as a label."
        : "We're mapping what that means in practice for the weeks ahead.",
    },
    {
      headline: "You'll be taken straight there the moment it's ready.",
      sub: "No need to refresh — this page will move on its own.",
    },
  ];
}

function PulseRing() {
  return (
    <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 32px" }}>
      <style>{`
        @keyframes aa-pulse {
          0%   { transform: scale(1);   opacity: 0.55; }
          50%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
        @keyframes aa-dot {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.35; }
        }
        .aa-ring {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 1.5px solid ${accent};
          animation: aa-pulse 2.4s ease-out infinite;
        }
        .aa-ring-2 { animation-delay: 0.8s; }
        .aa-ring-3 { animation-delay: 1.6s; }
        .aa-dot-core {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .aa-dot-core span {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: ${accent};
          animation: aa-dot 2.4s ease-in-out infinite;
        }
      `}</style>
      <div className="aa-ring" />
      <div className="aa-ring aa-ring-2" />
      <div className="aa-ring aa-ring-3" />
      <div className="aa-dot-core"><span /></div>
    </div>
  );
}

function GeneratingScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams  = useSearchParams();
  const childName  = searchParams.get("name") || "";
  const archetype  = searchParams.get("archetype") || "";
  const router     = useRouter();

  const firstName  = childName.split(" ")[0] || "your child";
  const messages   = buildMessages(firstName, archetype);

  const [msgIdx, setMsgIdx]     = useState(0);
  const [visible, setVisible]   = useState(true);
  const redirectedRef           = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    fetch("/api/funnel/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "generating_page_view", session_id: sessionId, metadata: {} }),
    }).catch(() => {});
  }, [sessionId]);

  // Rotate messages every 18s with a brief fade
  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIdx(i => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 18_000);
    return () => clearInterval(id);
  }, [messages.length]);

  useEffect(() => {
    if (!sessionId) return;
    let attempts = 0;

    function redirect(hardCap = false) {
      if (redirectedRef.current) return;
      redirectedRef.current = true;
      // hardCap=true adds ?f=1 so the report page knows not to bounce back here
      router.replace(`/report/${sessionId}${hardCap ? "?f=1" : ""}`);
    }

    async function poll() {
      if (redirectedRef.current) return;
      try {
        const res  = await fetch(`/api/report/status?session=${sessionId}`);
        const data: { ready: boolean } = await res.json();
        if (data.ready) { redirect(); return; }
      } catch { /* network hiccup — keep polling */ }
      attempts++;
      if (attempts >= 30) { redirect(true); return; }
      setTimeout(poll, 4000);
    }

    const init = setTimeout(poll, 8000);
    const hard = setTimeout(() => redirect(true), 120_000);
    return () => { clearTimeout(init); clearTimeout(hard); };
  }, [sessionId, router]);

  const msg = messages[msgIdx];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: surface,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        fontFamily: PP,
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", top: "24px", left: "24px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 22, width: "auto" }} />
      </div>

      <div style={{ maxWidth: "400px", width: "100%", textAlign: "center" }}>
        <PulseRing />

        <div
          style={{
            transition: "opacity 0.4s ease",
            opacity: visible ? 1 : 0,
          }}
        >
          <h1
            style={{
              fontFamily: FR,
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: "clamp(22px, 5.5vw, 30px)",
              color: ink,
              margin: "0 0 16px",
              lineHeight: 1.25,
            }}
          >
            {msg.headline}
          </h1>
          <p style={{ fontFamily: PP, fontSize: "15px", color: inkSoft, lineHeight: 1.65, margin: 0 }}>
            {msg.sub}
          </p>
        </div>

        {/* Subtle dot indicator showing which message */}
        {messages.length > 1 && (
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "32px" }}>
            {messages.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 5, height: 5,
                  borderRadius: "50%",
                  background: i === msgIdx ? accent : "rgba(32,30,25,0.15)",
                  transition: "background 0.4s",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "absolute", bottom: "24px", fontSize: "12px", color: inkFaint, textAlign: "center", fontFamily: PP }}>
        The Human Decision
      </div>
    </div>
  );
}

export default function GeneratingPage() {
  return (
    <Suspense>
      <GeneratingScreen />
    </Suspense>
  );
}
