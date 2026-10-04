"use client";

import { useEffect, useState } from "react";
import { normalizePhone, maskPhone } from "@/lib/phone";
import { FLOW, HEAD, BODY, Wordmark, ModuleIcon } from "@/app/components/FlowShell";

type Preview = {
  ok: boolean;
  weekTitle: string;
  readingLine: string;
  modules: { index: number; title: string }[];
  day2Title: string;
  weeks: { n: number; title: string }[];
};

const WA_NUMBER = "919993374923";

export default function ThankYouV2({
  childName, parentName, phone, archetype, ageBand, gender = "",
}: {
  childName: string;
  parentName: string;
  phone: string;    // raw as entered
  archetype: string;
  ageBand: string;
  gender?: string;
}) {
  const kid = childName.trim() || "your child";
  const parentFirst = (parentName.trim().split(/\s+/)[0]) || "there";
  const masked = maskPhone(normalizePhone(phone));
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    const p = new URLSearchParams({ archetype, ageBand, name: kid, gender: gender ?? "" });
    fetch(`/api/flow/thankyou-preview?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setPreview(d); })
      .catch(() => {});
  }, [archetype, ageBand, kid, gender]);

  const label = { fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase" as const, fontWeight: 700 };

  return (
    <div style={{ minHeight: "100dvh", background: FLOW.cream, fontFamily: BODY, color: FLOW.ink }}>
      {/* Navy header */}
      <div style={{ background: FLOW.navy, borderRadius: "0 0 28px 28px", padding: "26px 22px 40px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ marginBottom: 22 }}><Wordmark onNavy /></div>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(232,163,61,.16)", border: "1px solid rgba(232,163,61,.4)", display: "grid", placeItems: "center", marginBottom: 18 }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke={FLOW.goldSoft} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 30, lineHeight: 1.2, color: "#fff", margin: "0 0 10px" }}>Thank you, {parentFirst}.</h1>
          <p style={{ fontSize: 15, color: "#D6E0EC", lineHeight: 1.55, margin: "0 0 16px" }}>
            {kid}&rsquo;s report is on its way to your WhatsApp. It usually arrives within a minute.
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 999, padding: "7px 14px", fontSize: 13, color: "#EAF1F8" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.5 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.4A7.5 7.5 0 1 1 20.5 11.5z" stroke={FLOW.goldSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Sent to {masked}
          </span>
        </div>
      </div>

      {/* While you wait */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 40px" }}>
        <div style={{ background: "#fff", border: `1px solid ${FLOW.line}`, borderRadius: 20, padding: "22px 20px", boxShadow: "0 8px 22px rgba(30,58,95,.06)" }}>
          <div style={{ ...label, color: FLOW.gold, marginBottom: 6 }}>While you wait</div>
          <h2 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 21, lineHeight: 1.25, color: FLOW.ink, margin: "0 0 18px" }}>
            Here&rsquo;s what {kid}&rsquo;s six weeks look like
          </h2>

          {!preview ? (
            <p style={{ fontSize: 14, color: FLOW.dim }}>Loading the plan…</p>
          ) : (
            <>
              {/* Week 1 */}
              <div style={{ background: FLOW.cream, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                <div style={{ ...label, color: FLOW.dim, marginBottom: 4 }}>Week 1</div>
                <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 17, color: FLOW.ink, lineHeight: 1.3 }}>{preview.weekTitle}</div>
                <div style={{ fontSize: 12.5, color: FLOW.dim, marginTop: 4 }}>{preview.readingLine}</div>
              </div>

              {/* 4 modules */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {preview.modules.map((m, i) => (
                  <div key={m.index} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <ModuleIcon i={i} />
                    <div>
                      <div style={{ fontSize: 11, color: FLOW.dim, fontWeight: 600 }}>Module {m.index}</div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: FLOW.ink, lineHeight: 1.3 }}>{m.title}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tonight · Day 2 */}
              {preview.day2Title && (
                <div style={{ border: `1.5px solid ${FLOW.gold}`, background: FLOW.sel, borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
                  <div style={{ ...label, color: FLOW.gold, marginBottom: 5 }}>Tonight · Day 2 · 5 min</div>
                  <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 16, color: FLOW.ink, lineHeight: 1.35 }}>{preview.day2Title}</div>
                </div>
              )}

              {/* Weeks 1–3 + more */}
              <div style={{ ...label, color: FLOW.dim, marginBottom: 8 }}>The six weeks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {preview.weeks.map((w) => (
                  <div key={w.n} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 14, color: FLOW.gold, minWidth: 48 }}>Week {w.n}</span>
                    <span style={{ fontSize: 14, color: FLOW.ink, lineHeight: 1.4 }}>{w.title}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span style={{ minWidth: 48 }} />
                  <span style={{ fontSize: 13.5, color: FLOW.dim, fontStyle: "italic" }}>+ 3 more weeks</span>
                </div>
              </div>
            </>
          )}
        </div>

        <p style={{ fontSize: 13, color: FLOW.dim, lineHeight: 1.6, textAlign: "center", margin: "22px 6px 0" }}>
          Report not there in a few minutes? Check that {masked} is right, or{" "}
          <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{ color: FLOW.navy, fontWeight: 600 }}>message us on WhatsApp</a>.
        </p>
      </div>
    </div>
  );
}
