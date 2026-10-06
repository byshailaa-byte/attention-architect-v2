"use client";
import { useEffect, useState } from "react";
import { T } from "./crm-theme";

// Thin amber banner on all 4 CRM screens.
export function PreviewBanner() {
  return (
    <div style={{
      background: "#FBF4E6", borderBottom: `1px solid ${T.amber}`, color: T.warmText,
      fontSize: 12.5, fontWeight: 600, padding: "6px 16px", textAlign: "center",
    }}>
      Preview data. Nothing is saved or sent.
    </div>
  );
}

export function previewToast(msg = "Preview data: not saved") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("aa-toast", { detail: msg }));
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const h = (e: Event) => { setMsg((e as CustomEvent).detail as string); setTimeout(() => setMsg(null), 2200); };
    window.addEventListener("aa-toast", h);
    return () => window.removeEventListener("aa-toast", h);
  }, []);
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 200,
      background: T.navy, color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(20,40,77,.3)",
    }}>{msg}</div>
  );
}
