import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSql } from "@/lib/db/client";
import { SimplifiedReportBody } from "@/app/preview/simplified-v1/page";
import ReportGate from "./ReportGate";
import GatedReportFlow from "./GatedReportFlow";
import ReportView from "./ReportView";
import NarrativeReportView from "./NarrativeReportView";
import ScrollTracker from "./ScrollTracker";
import SiteFooter from "@/app/components/SiteFooter";
import type { AxisResult } from "@/lib/engine/scorer";
import { fetchPublishedNarrativeReport } from "@/lib/report/fetch-narrative";
import { resolveChildPronoun, CHILD_NAME_FALLBACK } from "@/lib/report/pronouns";
import type { Gender } from "@/lib/report/pronouns";

type Params = Promise<{ sessionId: string }>;
type SearchParams = Promise<{ f?: string }>;

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { sessionId } = await params;
  const { f } = await searchParams;
  const fallbackMode = f === "1"; // set by generating page on hard-cap timeout — skip redirect

  // Validate UUID format before hitting the DB
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(sessionId)) {
    return <NotFound />;
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT
      a.id,
      a.session_id,
      a.child_name,
      a.age_band,
      a.child_gender,
      a.archetype,
      a.parent_pattern,
      a.axes,
      a.weakest_two,
      a.parent_name,
      a.email,
      a.phone,
      a.concerns,
      a.worry_followup,
      a.tried,
      a.better,
      a.pricing_variant,
      -- Goal state for GoalSection. Gate 3: goal_flagged and goal_free_text are
      -- deliberately NOT selected — they never leave the DB into the report.
      a.goal_skill,
      a.goal_key,
      a.goal_text,
      a.goal_source
    FROM assessments a
    WHERE a.session_id = ${sessionId}::uuid
    LIMIT 1
  `) as unknown as {
    id: string;
    session_id: string;
    child_name: string | null;
    age_band: string;
    child_gender: string | null;
    archetype: string;
    parent_pattern: string;
    axes: {
      stability:  AxisResult;
      resistance: AxisResult;
      recovery:   AxisResult;
      attention?: AxisResult;
    };
    weakest_two: string[];
    parent_name: string | null;
    email: string | null;
    phone: string | null;
    concerns: string[];
    worry_followup: string | null;
    tried: string[] | null;
    better: string[] | null;
    pricing_variant: string | null;
    goal_skill: string | null;
    goal_key: string | null;
    goal_text: string | null;
    goal_source: string | null;
  }[];

  if (rows.length === 0) {
    return <NotFound />;
  }

  const row = rows[0];

  // Simplified sessions render the Phase B report DIRECTLY here — no redirect hop —
  // so the canonical /report/<id> URL (every WhatsApp link) stays the served page.
  if (row.pricing_variant === "simplified") {
    return <SimplifiedReportBody session={sessionId} fallbackMode={fallbackMode} />;
  }

  const gatedEnabled = process.env.NEXT_PUBLIC_GATED_REPORT_ENABLED === "true";
  const isGated = row.pricing_variant === "gated" && gatedEnabled;

  let hasPurchase = false;
  let purchaseTier: string | null = null;
  // Control path prefetches the narrative in parallel with the purchase check (below);
  // undefined = not prefetched (gated-paid path fetches it further down).
  let nrPrefetched: Awaited<ReturnType<typeof fetchPublishedNarrativeReport>> | undefined = undefined;

  if (isGated) {
    const paidRows = (await sql`
      SELECT id, tier FROM purchases
      WHERE assessment_id = ${row.id}::uuid AND status = 'paid'
      ORDER BY created_at DESC LIMIT 1
    `) as unknown as { id: string; tier: string }[];

    if (paidRows.length === 0) {
      // Not yet paid — show the 3-screen gated flow
      const nrForTeaser = await fetchPublishedNarrativeReport(sql, row.id);
      const teaserMoment = (nrForTeaser?.narrative_moments ?? []).find(
        (m) => m.moment_id === "m_teaser",
      ) ?? null;
      return (
        <GatedReportFlow
          sessionId={sessionId}
          hasPhone={!!row.phone}
          initialPhone={row.phone ?? ""}
          teaserText={teaserMoment?.content ?? null}
          childName={row.child_name || CHILD_NAME_FALLBACK}
        />
      );
    }
    // Paid — fall through to full report rendering below (parent_name gate skipped)
    hasPurchase = true;
    purchaseTier = paidRows[0].tier;
  } else {
    // Control arm (or pre-migration session with no variant): existing parent_name gate
    if (!row.parent_name) {
      await sql`
        INSERT INTO funnel_events (event_type, session_id, metadata)
        VALUES ('report_gate_view', ${sessionId}::uuid, '{}'::jsonb)
      `.catch((e: unknown) => console.warn("[funnel] report_gate_view:", (e as Error).message));

      return (
        <>
          <ReportGate sessionId={sessionId} />
          <SiteFooter />
        </>
      );
    }
    // Control arm: the purchase check (to hide PriceCards) and the narrative fetch are
    // independent — run them in parallel instead of sequentially.
    const [paidRows, nrResult] = await Promise.all([
      sql`
        SELECT tier FROM purchases
        WHERE assessment_id = ${row.id}::uuid AND status = 'paid'
        ORDER BY created_at DESC LIMIT 1
      ` as unknown as Promise<{ tier: string }[]>,
      fetchPublishedNarrativeReport(sql, row.id),
    ]);
    hasPurchase = paidRows.length > 0;
    purchaseTier = paidRows[0]?.tier ?? null;
    nrPrefetched = nrResult;
  }

  // Published narrative report (gates on status='published' AND superseded_by IS NULL).
  // Control path already fetched it in parallel above; gated-paid path fetches it here.
  const nr = nrPrefetched !== undefined
    ? nrPrefetched
    : await fetchPublishedNarrativeReport(sql, row.id);

  if (nr === null && !fallbackMode) {
    // No published narrative yet. Check whether generation is still in progress:
    // if no report row exists at all, the pipeline hasn't committed anything yet — redirect
    // to the animated waiting screen so the parent isn't silently dropped on the static fallback.
    // If a report row exists (draft, quality-failed, superseded) generation is done but blocked;
    // in that case the static fallback is the correct experience.
    const anyReport = (await sql`
      SELECT id FROM reports
      WHERE assessment_id = ${row.id}::uuid
      LIMIT 1
    `) as unknown as { id: string }[];

    if (anyReport.length === 0) {
      redirect(
        `/report/generating/${sessionId}?name=${encodeURIComponent(row.child_name ?? "")}&archetype=${encodeURIComponent(row.archetype ?? "")}`,
      );
    }
  }

  if (nr !== null) {
    // Analytics write moved OFF the render path via after() — never adds to TTFB.
    after(async () => {
      await sql`
        INSERT INTO funnel_events (event_type, session_id, metadata)
        VALUES ('report_view', ${sessionId}::uuid, ${JSON.stringify({ archetype: row.archetype })}::jsonb)
      `.catch((e: unknown) => console.warn("[funnel] report_view:", (e as Error).message));
    });

    const gender = (row.child_gender ?? null) as Gender;
    const pronouns = {
      subj:      resolveChildPronoun(gender, "subj"),
      obj:       resolveChildPronoun(gender, "obj"),
      poss:      resolveChildPronoun(gender, "poss"),
      reflexive: resolveChildPronoun(gender, "reflexive"),
    };
    return (
      <>
        <ScrollTracker sessionId={sessionId} />
        <NarrativeReportView
          moments={nr.narrative_moments}
          archetype={nr.archetype}
          archetypeFitTier={nr.archetype_fit_tier ?? "primary"}
          parentInstinct={nr.parent_instinct}
          familyLoop={nr.family_attention_loop}
          childName={row.child_name || CHILD_NAME_FALLBACK}
          parentName={row.parent_name ?? "you"}
          email={row.email ?? ""}
          phone={row.phone ?? ""}
          concerns={row.concerns ?? []}
          worryFollowup={row.worry_followup ?? null}
          childGender={gender}
          initialGoal={{ skill: row.goal_skill, key: row.goal_key, text: row.goal_text, source: row.goal_source }}
          sessionId={sessionId}
          pronouns={pronouns}
          hasPurchase={hasPurchase}
          purchaseTier={purchaseTier}
        />
      </>
    );
  }

  return (
    <>
      <ScrollTracker sessionId={sessionId} />
      <ReportView
        assessment={{
          ...row,
          parent_name: row.parent_name ?? "you",
        }}
      />
      <SiteFooter />
    </>
  );
}

function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--paper)" }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--ink)" }}
        >
          Report not found
        </p>
        <p className="text-sm" style={{ color: "var(--ink-dim)" }}>
          This link may have expired or the session was not saved correctly.
        </p>
      </div>
    </main>
  );
}
