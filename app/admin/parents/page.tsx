import { getParents } from "@/lib/admin/parents/data";
import { ParentsView } from "./ParentsView";
import { T } from "../crm-theme";

export const dynamic = "force-dynamic";

// The running commit, surfaced in the footer so a stale/old deploy is obvious at a glance.
const COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);

export default async function ParentsPage({ searchParams }: { searchParams: Promise<{ internal?: string }> }) {
  const showInternal = (await searchParams).internal === "1";
  try {
    const { rows, counts } = await getParents({ includeInternal: showInternal });
    return <ParentsView rows={rows} counts={counts} commit={COMMIT} showInternal={showInternal} />;
  } catch (e) {
    // Live data only — never silently fall back to fixtures (a broken deploy must look broken).
    console.error("[admin/parents] live data load failed", e);
    return (
      <main style={{ padding: "24px 28px", color: T.text, fontFamily: T.FONT_BODY }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", color: T.label }}>PARENTS</div>
        <h1 style={{ fontFamily: T.FONT_HEAD, fontSize: 28, fontWeight: 600, margin: "4px 0 10px" }}>Live data unavailable</h1>
        <p style={{ color: T.text2, maxWidth: 560, lineHeight: 1.5 }}>
          Couldn’t load parents from the database. No fixture data is shown.
        </p>
        <p style={{ color: T.muted, fontSize: 12.5, marginTop: 18 }}>Source: live (error) · {COMMIT}</p>
      </main>
    );
  }
}
