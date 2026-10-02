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
        .v2-prose p { margin: 0 0 14px; font-size: 16px; line-height: 1.6; }
        .v2-prose p:last-child { margin-bottom: 0; }
        .v2-prose ul { margin: 0 0 14px 18px; display: flex; flex-direction: column; gap: 8px; }
        .v2-prose li { font-size: 15px; line-height: 1.6; }
        .v2-prose strong { font-weight: 700; color: ${V2.navy}; }
        .v2-prose em { font-style: italic; }
      ` }} />
      <div style={{ minHeight: "100dvh", background: V2.navy }}>
        <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", background: V2.cream, color: V2.navy, fontFamily: BODY }}>
          {children}
        </div>
      </div>
    </>
  );
}
