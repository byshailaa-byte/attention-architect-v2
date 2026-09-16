import type { ReactNode } from "react";
import { getSql } from "@/lib/db/client";
import { getLmsUserContext } from "@/lib/lms/user-context";
import V2Sidebar from "@/components/lms-v2/V2Sidebar";

const CSS = `
  :root {
    --v2-navy:#14284D; --v2-navy-lt:#1E3A66;
    --v2-gold:#F5A623; --v2-gold-lt:#FBCB4A; --v2-gold-tint:#FDF1DC; --v2-gold-line:#F2DFB8;
    --v2-teal:#21A38A; --v2-teal-700:#137A66; --v2-teal-tint:#DCECE7;
    --v2-red:#D9614A; --v2-red-tint:#FBEAE6;
    --v2-bg:#F7F6F2; --v2-card:#fff; --v2-line:#E8E4DC;
    --v2-dim:#5A6472; --v2-dim2:#8D93A1;
    --v2-w1:#DCECE7; --v2-w2:#FDF1DC; --v2-w3:#E3EAF7; --v2-w4:#EEE6F5; --v2-w5:#FBE7E2; --v2-w6:#E6F1E4;
    --v2-BG: var(--font-bricolage),'Bricolage Grotesque',sans-serif;
    --v2-IS: var(--font-instrument),'Instrument Sans',system-ui,sans-serif;
  }
  .v2-shell { display:grid; grid-template-columns:242px 1fr; height:100dvh; overflow:hidden; background:var(--v2-bg); font-family:var(--v2-IS); color:var(--v2-dim); font-size:14px; line-height:1.55; }
  .v2-main  { display:flex; flex-direction:column; height:100dvh; overflow:hidden; }
  .v2-scroll{ flex:1; overflow-y:auto; }
  .v2-sidebar-el { display:flex; flex-direction:column; }
  @media(max-width:1000px){ .v2-shell{grid-template-columns:1fr} .v2-sidebar-el{display:none} }
  h1,h2,h3,h4{ font-family:var(--v2-BG); color:var(--v2-navy); letter-spacing:-.025em; }
  a{ text-decoration:none; }
  /* Shared card */
  .v2-card{ background:var(--v2-card); border:1px solid var(--v2-line); border-radius:14px; }
  /* Progress bar */
  .v2-bar{ height:9px; background:#ECEAE4; border-radius:6px; overflow:hidden; }
  .v2-bar i{ display:block; height:100%; background:linear-gradient(90deg,var(--v2-teal),#48BE8C); border-radius:6px; }
  /* Pills */
  .v2-pill-prog{ background:var(--v2-teal-tint); color:var(--v2-teal-700); font-size:10.5px; font-weight:700; padding:4px 9px; border-radius:6px; font-family:var(--v2-BG); }
  .v2-pill-done{ background:#E6F1E4; color:#3C7A46; font-size:10.5px; font-weight:700; padding:4px 9px; border-radius:6px; font-family:var(--v2-BG); }
  .v2-pill-lock{ background:#F1EFEA; color:var(--v2-dim2); font-size:10.5px; font-weight:700; padding:4px 9px; border-radius:6px; font-family:var(--v2-BG); }
  /* Week rows */
  .v2-wrow{ display:flex; align-items:center; gap:14px; padding:14px 19px; border-bottom:1px solid var(--v2-line); cursor:pointer; transition:background .12s; }
  .v2-wrow:last-child{ border-bottom:none; }
  .v2-wrow:hover{ background:#FCFBF8; }
  .v2-wrow.active{ background:linear-gradient(90deg,var(--v2-teal-tint),#fff); }
  .v2-wrow.locked{ opacity:.62; cursor:default; pointer-events:none; }
  /* Day strip */
  .v2-daystrip{ display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin:16px 0 8px; }
  @media(max-width:620px){ .v2-daystrip{grid-template-columns:repeat(3,1fr)} }
  .v2-day{ background:#fff; border:1px solid var(--v2-line); border-radius:11px; padding:12px 6px; text-align:center; cursor:pointer; }
  .v2-day.done{ background:var(--v2-teal-tint); border-color:rgba(33,163,138,.32); }
  .v2-day.today{ border:2px solid var(--v2-gold); background:var(--v2-gold-tint); }
  .v2-day.locked{ opacity:.42; cursor:default; }
  .v2-day.wknd{ background:#F4F1FA; border-color:#DDD3EE; }
  /* Lesson prose */
  .v2-prose p{ font-size:14.5px; line-height:1.68; margin-bottom:12px; }
  .v2-prose h2{ font-size:21px; margin:7px 0 12px; font-weight:800; }
  .v2-prose h3{ font-size:17px; margin:24px 0 9px; }
  .v2-prose ul{ margin:0 0 14px 19px; }
  .v2-prose li{ font-size:15px; line-height:1.66; margin-bottom:7px; }
  .v2-prose strong{ font-weight:700; }
  .v2-prose em{ font-style:italic; }
  /* Callout / warn (resources) */
  .v2-callout{ background:var(--v2-teal-tint); border-left:3px solid var(--v2-teal); border-radius:0 10px 10px 0; padding:15px 18px; margin:18px 0; }
  .v2-callout b{ font-family:var(--v2-BG); color:var(--v2-teal-700); display:block; margin-bottom:4px; font-size:13px; }
  .v2-callout p{ font-size:13.8px; margin:0; color:#2C5C51; }
  .v2-warn{ background:var(--v2-gold-tint); border-left:3px solid var(--v2-gold); border-radius:0 10px 10px 0; padding:15px 18px; margin:18px 0; }
  .v2-warn b{ font-family:var(--v2-BG); color:#8A5F0F; display:block; margin-bottom:4px; font-size:13px; }
  .v2-warn p{ font-size:13.8px; margin:0; color:#5E4712; }
  /* Reflection buttons */
  .v2-rbtn{ border:1.5px solid var(--v2-line); background:#fff; border-radius:10px; padding:10px 15px; font-size:12.8px; font-weight:600; cursor:pointer; font-family:var(--v2-IS); }
  .v2-rbtn.sel-worked{ border-color:var(--v2-teal); background:var(--v2-teal-tint); color:var(--v2-teal-700); }
  .v2-rbtn.sel-mixed{ border-color:var(--v2-gold); background:var(--v2-gold-tint); color:#8A5F0F; }
  .v2-rbtn.sel-no{ border-color:var(--v2-red); background:var(--v2-red-tint); color:var(--v2-red); }
  /* For-you box */
  .v2-foryou{ background:var(--v2-gold-tint); border:1px solid var(--v2-gold-line); border-radius:12px; padding:15px 17px; margin:17px 0; }
  /* Fork line */
  .v2-forkline{ display:flex; gap:8px; align-items:center; background:#F4F1FA; border:1px solid #DDD3EE; border-radius:10px; padding:10px 13px; font-size:12.3px; color:#5B4A78; margin-bottom:14px; }
  /* Resources chips */
  .v2-chip{ border:1px solid var(--v2-line); background:#fff; border-radius:20px; padding:7px 14px; font-size:12.5px; font-weight:600; color:var(--v2-dim); cursor:pointer; }
  .v2-chip.on{ background:var(--v2-navy); color:#fff; border-color:var(--v2-navy); }
  /* Article card */
  .v2-art{ background:#fff; border:1px solid var(--v2-line); border-radius:13px; padding:17px 18px; cursor:pointer; display:flex; flex-direction:column; transition:border-color .15s, box-shadow .15s; }
  .v2-art:hover{ border-color:var(--v2-gold); box-shadow:0 4px 16px rgba(20,40,77,.07); }
  .v2-art.share{ background:var(--v2-gold-tint); border-color:var(--v2-gold-line); }
`;

export const metadata = { title: "Attention Architect — Programme" };

export default async function LmsV2Layout({ children }: { children: ReactNode }) {
  const ctx = await getLmsUserContext();
  const sql = getSql();
  const cwRows = await sql`
    SELECT MAX(week)::int AS w FROM lms_progress
    WHERE user_id = ${ctx.userId} AND day BETWEEN 1 AND 5
  ` as unknown as { w: number | null }[];
  const currentWeek = cwRows[0]?.w ?? 1;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="v2-shell">
        <V2Sidebar
          childName={ctx.childName}
          archetype={ctx.archetype}
          ageBand={ctx.ageBand}
          parentPattern={ctx.parentPattern}
          currentWeek={currentWeek}
        />
        <div className="v2-main">
          <div className="v2-scroll">{children}</div>
        </div>
      </div>
    </>
  );
}
