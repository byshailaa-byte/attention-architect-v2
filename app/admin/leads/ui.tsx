// Shared presentation tokens + tiny components for the Leads pages.
// Visual language matches the admin dashboard (dark theme, JetBrains Mono /
// Bricolage); layout/labels follow the leads mockup. No hooks here, so these
// render in both server and client components.
import React from "react";
import type { Channel } from "@/lib/leads/merge";

export const C = {
  bg: "#F6F3EC",
  card: "#FFFFFF",
  border: "#EFE8DA",
  text: "#1B2333",
  muted: "#5B6577",
  yellow: "#E8A33D",
  green: "#2F5D3A",
  red: "#9B2C2C",
  blue: "#1E3A5F",
  purple: "#6E5FB0",
  orange: "#B45309",
} as const;

export const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
export const MONO = "'JetBrains Mono', 'Fira Code', monospace";

// First-channel badge colour per the mockup's "First came from" column.
const CHANNEL_COLOR: Record<Channel, string> = {
  whatsapp_ad: C.green,
  whatsapp_direct: C.purple,
  web: C.blue,
  handbook: C.yellow,
};

export function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 600,
        color,
        border: `1px solid ${color}30`,
        background: `${color}14`,
        borderRadius: 10,
        padding: "2px 9px",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function ChannelBadge({ channel, label }: { channel: Channel; label: string }) {
  return <Badge text={label} color={CHANNEL_COLOR[channel]} />;
}

// Dark-orange, solid: "a human should reply first".
export function UrgentStatus({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        background: "#8A3B12",
        borderRadius: 10,
        padding: "3px 9px",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

// Safety flags get the most prominent treatment: solid red, uppercased.
export function SafetyStatus({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: 800,
        color: "#fff",
        background: "#B91C1C",
        borderRadius: 10,
        padding: "3px 10px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}

// "12 min ago", "1 h ago", "Yesterday", "3 days ago" — matches the mockup.
export function timeAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function rupees(paise: number | null): string {
  if (paise == null) return "";
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}
