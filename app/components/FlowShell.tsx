"use client";

import type { ReactNode } from "react";

// ── v2 flow design system (?flow=v2 only) ────────────────────────────────────
// Cream ground, Newsreader headlines, Figtree body. v1 never imports this.
export const FLOW = {
  cream:    "#FBF6EE",
  navy:     "#1E3A5F",
  navyLt:   "#2C4A70",
  gold:     "#E8A33D",
  goldSoft: "#F2C77E",
  ink:      "#2E3A4B",
  dim:      "#5B6577",
  white:    "#FFFFFF",
  line:     "#E7E0D2",
  sel:      "#FFF8EC",
  onNavy:   "#CFE0F2",
} as const;

export const HEAD = "var(--font-newsreader), Georgia, serif";
export const BODY = "var(--font-figtree), system-ui, sans-serif";

// Single source of truth for the time estimate: the start-screen pill ("Free · N min")
// and the questions' "About N min left" both derive from this.
export const FLOW_TOTAL_MIN = 5;
export function minsLeft(pct: number) { return Math.max(1, Math.round(((100 - pct) / 100) * FLOW_TOTAL_MIN)); }

// Wordmark — brand is ONLY "Attention Architect". Text so it reads on navy or cream.
export function Wordmark({ onNavy = false }: { onNavy?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: HEAD, fontWeight: 600, fontSize: 17, letterSpacing: ".01em", color: onNavy ? "#fff" : FLOW.navy }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 20L12 5l8 15" stroke={onNavy ? FLOW.goldSoft : FLOW.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 20l4-7 4 7" stroke={onNavy ? "#fff" : FLOW.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Attention Architect
    </span>
  );
}

// 3-segment progress for the start steps.
export function SegmentBar({ step, total = 3, onNavy = false }: { step: number; total?: number; onNavy?: boolean }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < step ? FLOW.gold : (onNavy ? "rgba(255,255,255,.22)" : FLOW.line) }} />
        ))}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: ".04em", color: onNavy ? FLOW.onNavy : FLOW.dim }}>
        Step {step} of {total}
      </div>
    </div>
  );
}

// One continuous bar + "About N min left" for the questions.
export function QuestionProgress({ pct, minutesLeft, onNavy = false }: { pct: number; minutesLeft: number; onNavy?: boolean }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: onNavy ? FLOW.onNavy : FLOW.dim }}>About {Math.max(1, minutesLeft)} min left</span>
      </div>
      <div style={{ height: 6, width: "100%", background: onNavy ? "rgba(255,255,255,.18)" : FLOW.line, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${clamped}%`, background: FLOW.gold, borderRadius: 999, transition: "width .35s ease" }} />
      </div>
    </div>
  );
}

// Cream full-height centered frame with a constrained column.
export function Screen({ children, bg = FLOW.cream, pad = "28px 20px 40px" }: { children: ReactNode; bg?: string; pad?: string }) {
  return (
    <div style={{ minHeight: "100dvh", background: bg, display: "flex", justifyContent: "center", fontFamily: BODY, color: FLOW.ink }}>
      <div style={{ width: "100%", maxWidth: 440, padding: pad, boxSizing: "border-box" }}>{children}</div>
    </div>
  );
}

// Back link used on steps after the first.
export function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Go back" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: FLOW.navy, fontWeight: 600, padding: 0, display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Back
    </button>
  );
}

// ── Worry cards (step 1) ──────────────────────────────────────────────────────
// Each worry has its own tinted 44px icon chip. Icons use currentColor.
const ic = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const BookIcon      = (<svg {...ic}><path d="M4 5.5A2 2 0 016 4h5v15H6a2 2 0 00-2 1.5z" /><path d="M20 5.5A2 2 0 0018 4h-5v15h5a2 2 0 012 1.5z" /></svg>);
const TargetIcon    = (<svg {...ic}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></svg>);
const ScreenIcon    = (<svg {...ic}><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></svg>);
const PersonIcon    = (<svg {...ic}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20a6.5 6.5 0 0113 0" /></svg>);
const SproutIcon    = (<svg {...ic}><path d="M12 20v-7" /><path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6z" /><path d="M12 11c0-3 2.5-4.5 6-4.5 0 3-2.5 4.5-6 4.5z" /></svg>);
const ChecklistIcon = (<svg {...ic}><path d="M9 6h10M9 12h10M9 18h10" /><path d="M4 5.5l1.2 1.2L7 4.5" /><path d="M4.5 12h.01M4.5 18h.01" /></svg>);
const DotsIcon      = (<svg {...ic}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></svg>);

export type Worry = { key: string; label: string; icon: ReactNode; tintBg: string; tintIcon: string; echo: string };
// Visual + supportive-copy registry, keyed by the canonical worry key (unchanged downstream: report,
// plan and Coach all read the key). The DISPLAY label per age comes from WORRIES_BY_AGE below; the
// label here is a short generic fallback. echo is the "you're in the right place" reassurance line.
export const WORRIES: Worry[] = [
  { key: "homework",   label: "Homework",   icon: BookIcon,      tintBg: "#E8EEF5", tintIcon: "#1E3A5F", echo: "Homework fights. You’re in the right place. The fight is usually not about the homework, and the next questions find what it’s really about." },
  { key: "reminders",  label: "Needs reminders", icon: TargetIcon, tintBg: "#EAF0EA", tintIcon: "#2F5D3A", echo: "Needs reminders. You’re in the right place. “Won’t” and “can’t” look identical from the outside, and the next questions tell them apart." },
  { key: "screens",    label: "Screens",    icon: ScreenIcon,    tintBg: "#FBE6C4", tintIcon: "#8A6322", echo: "Screens. You’re in the right place. Screen battles usually sit on top of something else, and the next questions find what." },
  { key: "confidence", label: "Confidence", icon: PersonIcon,    tintBg: "#EFEAF5", tintIcon: "#4A3470", echo: "Low confidence. You’re in the right place. “I can’t” is often a decision made before trying, and the next questions show where it starts." },
  { key: "giveup",     label: "Gives up",   icon: SproutIcon,    tintBg: "#F8E9E2", tintIcon: "#8C3F22", echo: "Gives up quickly. You’re in the right place. Quitting fast is usually protecting something, and the next questions find what." },
  { key: "finish",     label: "Finishing",  icon: ChecklistIcon, tintBg: "#E3F0F0", tintIcon: "#1F5A5A", echo: "Never finishes. You’re in the right place. Starting and finishing use different wiring, and the next questions show which one slips." },
  { key: "other",      label: "Something else", icon: DotsIcon,  tintBg: "#ECEAE4", tintIcon: "#5B6577", echo: "Something else. You’re in the right place. The questions still map how your child’s attention works and where it slips." },
];

export function worryByKey(key: string | null | undefined): Worry {
  return WORRIES.find((w) => w.key === key) ?? WORRIES[WORRIES.length - 1]; // default → "other"
}

// ── Age bands (C2) ────────────────────────────────────────────────────────────
export const AGE_BANDS = ["8-9", "10-11", "12-14"] as const;
export type AgeBandV2 = (typeof AGE_BANDS)[number];
// Sub-label under each age number on the age screen.
export const AGE_LABELS: Record<AgeBandV2, string> = {
  "8-9":   "learning to start",
  "10-11": "starting on their own",
  "12-14": "planning their own time",
};

// ── Per-age worry lists (C2) ──────────────────────────────────────────────────
// Each item's `key` maps to an existing canonical worry (report/plan/Coach unchanged); only the
// DISPLAY label and ORDER are age-specific. Shown in the order below. "other" is always last.
export const WORRIES_BY_AGE: Record<AgeBandV2, { key: string; label: string }[]> = {
  "8-9": [
    { key: "reminders",  label: "Needs reminding for everything" },
    { key: "homework",   label: "Homework time is a fight" },
    { key: "screens",    label: "Hard to get off screens" },
    { key: "giveup",     label: "Gives up when it gets hard" },
    { key: "confidence", label: "Says “I can’t” before trying" },
    { key: "finish",     label: "Leaves things half done" },
    { key: "other",      label: "Something else" },
  ],
  "10-11": [
    { key: "homework",   label: "Homework turns into a fight" },
    { key: "reminders",  label: "Won’t start without reminders" },
    { key: "screens",    label: "Screens or gaming take over" },
    { key: "finish",     label: "Rushes or leaves work half done" },
    { key: "giveup",     label: "Gives up when it’s hard" },
    { key: "confidence", label: "Doubts their own ability" },
    { key: "other",      label: "Something else" },
  ],
  "12-14": [
    { key: "screens",    label: "Phone or gaming takes over" },
    { key: "reminders",  label: "Leaves studying to the last minute" },
    { key: "homework",   label: "Doesn’t plan or keep up with schoolwork" },
    { key: "finish",     label: "Starts things, doesn’t finish them" },
    { key: "giveup",     label: "Shuts down when it gets hard" },
    { key: "confidence", label: "Low confidence about studies" },
    { key: "other",      label: "Something else" },
  ],
};

// ── "How often?" (C2) — OPTIONAL. Stored keys + the exact card-1 phrase each maps to. ──
export const FREQUENCY_OPTIONS: { key: string; label: string }[] = [
  { key: "d1_2",  label: "1–2 days a week" },
  { key: "d3_4",  label: "3–4 days" },
  { key: "most",  label: "Most days" },
  { key: "daily", label: "Every day" },
];
// Report card 1 renders "This happens <phrase>." ONLY when a frequency is set.
export const FREQUENCY_CARD1_PHRASE: Record<string, string> = {
  d1_2:  "1–2 days a week",
  d3_4:  "3–4 days a week",
  most:  "most days",
  daily: "every day",
};

export function IconChip({ worry, size = 44 }: { worry: Worry; size?: number }) {
  return (
    <div aria-hidden="true" style={{ width: size, height: size, borderRadius: 12, background: worry.tintBg, color: worry.tintIcon, display: "grid", placeItems: "center", flexShrink: 0 }}>
      {worry.icon}
    </div>
  );
}

// ── LMS module icons for the thank-you preview (from the /lms-v2 mockup) ──────
const MODULE_TINT   = ["#E8EEF5", "#FBF0E2", "#EAF0EA", "#EFEAF5"];
const MODULE_STROKE = ["#1E3A5F", "#8A6322", "#2F5D3A", "#4A3470"];
export function ModuleIcon({ i, size = 44 }: { i: number; size?: number }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: MODULE_STROKE[i], strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const path =
    i === 0 ? <><path d="M12 3v6" /><path d="M5.6 5.6l4.2 4.2" /><path d="M3 12h6" /><circle cx="15" cy="15" r="5" /></>
    : i === 1 ? <><path d="M7 12h4" /><path d="M13 12h4" /><path d="M9 8l-2 4 2 4" /><path d="M15 8l2 4-2 4" /></>
    : i === 2 ? <><path d="M4 18h16" /><path d="M7 18v-4" /><path d="M12 18v-7" /><path d="M17 18v-10" /></>
    : <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />;
  return (
    <div aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, borderRadius: 10, background: MODULE_TINT[i], display: "grid", placeItems: "center" }}>
      <svg {...common}>{path}</svg>
    </div>
  );
}
