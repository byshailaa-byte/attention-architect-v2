// Light admin theme tokens (matches the mockups + Part A spec). Plain constants, usable from
// server and client components. Fonts are the self-hosted next/font/local CSS variables.
import type { LeadStage } from "@/lib/admin/crm";

export const T = {
  page: "#F6F3EC",
  card: "#FFFFFF",
  cardBorder: "#EFE8DA",
  inputBorder: "#E6DECF",
  divider: "#F3EEE4",
  text: "#1B2333",
  text2: "#5B6577",
  textRow: "#2E3A4B",
  muted: "#8A93A3",
  label: "#8A6322",
  navy: "#1E3A5F",
  amber: "#E8A33D",
  successBg: "#EAF0EA", successText: "#2F5D3A",
  warmBg: "#FCEFE6", warmText: "#8C3F22",
  dangerBg: "#FBEAEA", dangerText: "#9B2C2C",
  greyBg: "#EEF1F5", greyText: "#5B6577",
  readBg: "#FBF1DC", readText: "#8A6322",
  wa: "#25D366", waText: "#0B3D1F",
  rowHighlight: "#FFF8EC",
  checkbox: "#C7BFAE",
  thread: "#EFEAE0", bubbleOut: "#DCF3D9", bubbleIn: "#FFFFFF",
  sel: "#FBF4E6",
  chipFill: "#F3EEE4",
  FONT_HEAD: "var(--font-newsreader), Newsreader, Georgia, serif",
  FONT_BODY: "var(--font-figtree), Figtree, system-ui, sans-serif",
} as const;

export const STAGE: Record<LeadStage, { label: string; bg: string; fg: string }> = {
  replied:      { label: "Replied on WhatsApp", bg: T.successBg, fg: T.successText },
  reached_plan: { label: "Reached plan",        bg: T.warmBg,    fg: T.warmText },
  read_report:  { label: "Read report",         bg: T.readBg,    fg: T.readText },
  not_opened:   { label: "Not opened",          bg: T.greyBg,    fg: T.greyText },
  bought:       { label: "Bought",              bg: T.successBg, fg: T.successText },
};

export const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, letterSpacing: "0.12em", color: T.label, textTransform: "uppercase",
};
