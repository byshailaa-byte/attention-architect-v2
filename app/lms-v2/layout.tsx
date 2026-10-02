import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getLmsVersion } from "@/lib/lms/lms-version";
import { getSql } from "@/lib/db/client";
import { V2, BODY } from "./v2ui";

export const metadata = { title: "Attention Architect — Programme" };

// Mobile-first shell for the rebuilt v2 experience. Each page renders its own
// header/back-link (per the mockups), so the layout only loads fonts, sets the
// base canvas, and guards the version: a v1 user who lands here goes to /lms.
export default async function LmsV2Layout({ children }: { children: ReactNode }) {
  const ctx = await getLmsUserContext(); // redirects to /lms/login or / if unauthorized / unpaid
  const version = await getLmsVersion(getSql(), ctx.userId);
  if (version === "v1") redirect("/lms");

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Figtree:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: `
        /* Shared prose — used by Phase 1 (module/day/weekend) AND the legacy pages. Global. */
        .v2-prose p { margin: 0 0 14px; font-size: 16px; line-height: 1.6; }
        .v2-prose p:last-child { margin-bottom: 0; }
        .v2-prose ul { margin: 0 0 14px 18px; display: flex; flex-direction: column; gap: 8px; }
        .v2-prose li { font-size: 16px; line-height: 1.6; }

        /* A1: the ONE shared column every /lms-v2 page renders into — fixed
           max-width, centered, full-width (never shrink-wraps to content). */
        .v2-shell { width: 100%; max-width: 560px; margin: 0 auto; min-height: 100dvh; box-sizing: border-box; background: #FDF8F0; color: #1E3A5F; }
        .v2-prose strong { font-weight: 700; color: ${V2.navy}; }
        .v2-prose em { font-style: italic; }

        /* Legacy pages (what-to-say, resources, resources/[slug], progress) kept the
           old v2-* class/variable names after f3bd522 removed the old layout CSS.
           Re-defined here against the new palette + fonts, SCOPED under .v2-legacy so
           Phase 1 pages are never affected. Teal is mapped to navy. */
        .v2-legacy {
          --v2-navy: #1E3A5F; --v2-navy-lt: #2C4A70;
          --v2-bg: #FDF8F0; --v2-card: #FFFFFF; --v2-line: #EDE7DB;
          --v2-dim: #5B6577; --v2-dim2: #6B6552;
          --v2-gold: #E8A33D; --v2-gold-lt: #8A6322; --v2-gold-tint: #FBF0E2; --v2-gold-line: #F2DFB8;
          --v2-red: #C0392B; --v2-red-tint: #FBEAE6;
          --v2-teal: #1E3A5F; --v2-teal-700: #1E3A5F; --v2-teal-tint: #E8EEF5;
          --v2-BG: 'Newsreader', Georgia, serif;
          --v2-IS: 'Figtree', system-ui, sans-serif;
        }
        .v2-legacy h1, .v2-legacy h2, .v2-legacy h3, .v2-legacy h4 {
          font-family: 'Newsreader', Georgia, serif; color: var(--v2-navy); letter-spacing: -0.01em;
        }
        .v2-legacy .v2-card { background: var(--v2-card); border: 1px solid var(--v2-line); border-radius: 14px; }
        .v2-legacy .v2-chip { border: 1px solid var(--v2-line); background: #fff; border-radius: 20px; padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: var(--v2-dim); cursor: pointer; font-family: 'Figtree', system-ui, sans-serif; }
        .v2-legacy .v2-chip.on { background: var(--v2-navy); color: #fff; border-color: var(--v2-navy); }
        .v2-legacy .v2-art { background: #fff; border: 1px solid var(--v2-line); border-radius: 13px; padding: 17px 18px; cursor: pointer; display: flex; flex-direction: column; transition: border-color .15s, box-shadow .15s; }
        .v2-legacy .v2-art:hover { border-color: var(--v2-gold); box-shadow: 0 4px 16px rgba(30,58,95,.08); }
        .v2-legacy .v2-art.share { background: var(--v2-gold-tint); border-color: var(--v2-gold-line); }
        .v2-legacy .v2-callout { background: #E8EEF5; border-left: 3px solid var(--v2-navy); border-radius: 0 10px 10px 0; padding: 15px 18px; margin: 18px 0; }
        .v2-legacy .v2-callout b { font-family: 'Newsreader', Georgia, serif; color: var(--v2-navy); display: block; margin-bottom: 4px; font-size: 14px; }
        .v2-legacy .v2-callout p { font-size: 13.8px; margin: 0; color: #2E3A4B; }
        .v2-legacy .v2-warn { background: var(--v2-gold-tint); border-left: 3px solid var(--v2-gold); border-radius: 0 10px 10px 0; padding: 15px 18px; margin: 18px 0; }
        .v2-legacy .v2-warn b { font-family: 'Newsreader', Georgia, serif; color: #8A6322; display: block; margin-bottom: 4px; font-size: 14px; }
        .v2-legacy .v2-warn p { font-size: 13.8px; margin: 0; color: #5E4712; }
      ` }} />
      <div style={{ minHeight: "100dvh", background: V2.navy, fontFamily: BODY }}>
        <div className="v2-shell">
          {children}
        </div>
      </div>
    </>
  );
}
