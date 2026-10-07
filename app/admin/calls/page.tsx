import { getCallingSource } from "@/lib/admin/crm/real";
import type { QueueTab, Stats, Lead } from "@/lib/admin/crm";
import { CallsView } from "./CallsView";
import { T } from "../crm-theme";

export const dynamic = "force-dynamic";

const TABS: QueueTab[] = ["due_today", "replied", "reached_plan", "read_report", "callbacks", "interested", "done"];
// The running commit, surfaced in the footer so a stale/old deploy is obvious at a glance.
const COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.includes(sp.tab as QueueTab) ? sp.tab : "due_today") as QueueTab;
  const src = getCallingSource();

  let stats: Stats;
  let leads: Lead[];
  try {
    [stats, leads] = await Promise.all([src.getStats(), src.getQueue(tab)]);
  } catch (e) {
    // Live data only. Never silently fall back to fixtures — show an explicit error instead.
    console.error("[admin/calls] live data load failed", e);
    return (
      <main style={{ padding: "24px 28px", color: T.text, fontFamily: T.FONT_BODY }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: T.label }}>CALLS</div>
        <h1 style={{ fontFamily: T.FONT_HEAD, fontSize: 28, fontWeight: 600, margin: "4px 0 10px" }}>Live data unavailable</h1>
        <p style={{ color: T.text2, maxWidth: 560, lineHeight: 1.5 }}>
          The calling queue couldn’t be loaded from the database. No preview or fixture data is shown.
          Retry shortly; if it persists, check <code>DATABASE_URL</code> and the latest deployment.
        </p>
        <p style={{ color: T.muted, fontSize: 12.5, marginTop: 18 }}>Source: live (error) · {COMMIT}</p>
      </main>
    );
  }

  return <CallsView stats={stats} leads={leads} tab={tab} commit={COMMIT} />;
}
