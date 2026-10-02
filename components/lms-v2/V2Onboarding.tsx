"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { V2, HEAD, BODY } from "@/app/lms-v2/v2ui";

export default function V2Onboarding({
  childName,
  archetypeName,
  ageBandLabel,
  recap,
}: {
  childName: string;
  archetypeName: string;
  ageBandLabel: string;
  recap: string; // filled s2Anecdote — the report's "this pattern has a name" line
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    try {
      await fetch("/api/lms/onboarding-complete", { method: "POST" });
    } catch { /* non-fatal — home will re-stamp if needed */ }
    router.push("/lms-v2");
    router.refresh();
  }

  const dot = (on: boolean) => ({ height: 4, borderRadius: 2, background: on ? V2.gold : "#3C5778" as string });
  const dotLight = (on: boolean) => ({ height: 4, borderRadius: 2, background: on ? V2.gold : V2.line2 });

  if (screen === 1) {
    return (
      <div style={{ background: V2.navy, color: V2.white, fontFamily: BODY, minHeight: "100dvh", boxSizing: "border-box", padding: "28px 24px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div style={dot(true)} /><div style={dot(false)} />
        </div>
        <div style={{ marginTop: 40, fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: V2.gold }}>Welcome</div>
        <h1 style={{ margin: 0, fontFamily: HEAD, fontSize: 36, lineHeight: 1.12, fontWeight: 600 }}>These are {childName}&rsquo;s six weeks.</h1>
        <p style={{ margin: 0, fontSize: 17, lineHeight: 1.55, color: V2.onNavySoft }}>Everything here is written for one child: {childName}, {archetypeName}, age {ageBandLabel}.</p>
        <section style={{ background: V2.cream, color: V2.navy, borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: V2.darkGold }}>FROM {childName.toUpperCase()}&rsquo;S REPORT</div>
          <p style={{ margin: 0, fontFamily: HEAD, fontSize: 20, lineHeight: 1.35 }}>{recap}</p>
          <p style={{ margin: 0, fontSize: 14, color: V2.dim }}>That one fact is what the six weeks are built on.</p>
        </section>
        <div style={{ marginTop: "auto" }}>
          <button onClick={() => setScreen(2)} style={{ width: "100%", minHeight: 52, borderRadius: 12, background: V2.gold, color: V2.navy, border: 0, fontSize: 16, fontWeight: 700, fontFamily: BODY, cursor: "pointer" }}>Continue</button>
        </div>
      </div>
    );
  }

  // Read / Do / Record tile icons (book, check-circle, pencil) from the mockup.
  const ICON: Record<string, { stroke: string; path: React.ReactNode }> = {
    Read:   { stroke: "#1E3A5F", path: <><path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z" /></> },
    Do:     { stroke: "#8A6322", path: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></> },
    Record: { stroke: "#2F5D3A", path: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></> },
  };
  const StepCard = ({ bg, title, body }: { bg: string; title: string; body: string }) => (
    <div style={{ display: "flex", gap: 14, background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 14, padding: 14 }}>
      <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 10, background: bg, display: "grid", placeItems: "center" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={ICON[title].stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{ICON[title].path}</svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: V2.dim }}>{body}</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: V2.cream, color: V2.navy, fontFamily: BODY, minHeight: "100dvh", boxSizing: "border-box", padding: "28px 24px 30px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <div style={dotLight(true)} /><div style={dotLight(true)} />
      </div>
      <h1 style={{ margin: "28px 0 0", fontFamily: HEAD, fontSize: 32, lineHeight: 1.15, fontWeight: 600 }}>How each week works</h1>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: V2.ink }}>{childName} doesn&rsquo;t do anything differently. You do, in small ways, in moments that already happen.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <StepCard bg={V2.tintBlue} title="Read" body="Four short modules at the start of the week. 10–15 minutes in total." />
        <StepCard bg={V2.tintGold} title="Do" body="One small move a day, about 5 minutes. A new one unlocks each day." />
        <StepCard bg={V2.tintGreen} title="Record" body="One tap: worked, mixed, or didn't land. At the weekend you see your week read back to you." />
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: V2.dim }}>Miss a day? Nothing resets. Pick up where you left off.</p>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={start} disabled={busy} style={{ width: "100%", minHeight: 52, borderRadius: 12, background: V2.navy, color: V2.white, border: 0, fontSize: 16, fontWeight: 600, fontFamily: BODY, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Starting…" : "Start Week 1"}</button>
        <button onClick={() => setScreen(1)} style={{ background: "none", border: 0, textAlign: "center", fontSize: 14, color: V2.dim, minHeight: 44, fontFamily: BODY, cursor: "pointer" }}>Back</button>
      </div>
    </div>
  );
}
