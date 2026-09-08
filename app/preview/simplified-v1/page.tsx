import { redirect } from "next/navigation";
import { getSql } from "@/lib/db/client";
import {
  PATTERN_LINE, MEANING, FRICTION_POINTS, TONIGHT_SAY, TONIGHT_WATCH,
  INSTINCT_LINE, NOW_LINES, THEN_LINES, TESTIMONIAL_POOL,
} from "@/lib/content/report-content";
import { getLmsWeekContent } from "@/lib/lms/content";
import {
  generateInstinctInteractionFallback,
  selectFallbackDimensions,
} from "@/lib/narrative/instinct-interaction-fallback";
import {
  generateSimplifiedStrengths,
  selectStrengthDimensions,
} from "@/lib/narrative/simplified-strengths";
import type { Strength } from "@/lib/narrative/simplified-strengths";
import {
  generateSimplifiedActions,
  selectActionDimensions,
} from "@/lib/narrative/simplified-actions";
import type { ActionsOutput } from "@/lib/narrative/simplified-actions";
import { reformatM01 } from "@/lib/narrative/simplified-reformatter";
import { checkTryTonightTitle } from "@/lib/quality/checks";
import SimplifiedFunnelClient from "./client";
import SimplifiedGate from "./SimplifiedGate";
import type { SimplifiedReportData } from "./client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// In-memory store of recently seen Try Tonight titles for cross-session collision detection.
// Does not persist across server restarts or multiple instances — acceptable for local
// preview testing. Requires a real persistence layer before production traffic.
// (same category of gap as the worry_followup migration — flag, don't forget)
const seenTryTonightTitles = new Set<string>();

// Maps raw DB slug values to parent-readable label + description for each profile card row.
const ATTENTION_SHAPE: Record<string, { label: string; desc: string }> = {
  "narrow-deep":       { label: "What gets them focused",  desc: "Something they can go right into. Once they're in, they tend to stay there." },
  "wide-shifting":     { label: "What gets them focused",  desc: "A few related things at once. Their attention moves between them rather than settling on one." },
  "social-anchored":   { label: "What gets them focused",  desc: "Being around other people. Company tends to hold them more than the task does." },
  "sensation-seeking": { label: "What gets them focused",  desc: "Whatever feels most alive in the moment. Energy tends to matter more than the subject." },
};
const ATTENTION_COMPETITION: Record<string, { label: string; desc: string }> = {
  "novelty":  { label: "What tends to pull them away", desc: "A new idea arriving mid-task. It often feels more urgent than what they were doing." },
  "external": { label: "What tends to pull them away", desc: "Noise or movement nearby. It doesn't take much to break the thread." },
  "internal": { label: "What tends to pull them away", desc: "Boredom or frustration building up from the inside, before anything happens around them." },
  "social":   { label: "What tends to pull them away", desc: "Whatever is going on with the people nearby. That usually gets read first." },
};
const FRICTION_RESPONSE: Record<string, { label: string; desc: string }> = {
  "avoid":           { label: "What happens when things get hard", desc: "They tend to step back rather than push into it. Often quietly, before anyone notices." },
  "solo-push":       { label: "What happens when things get hard", desc: "They keep going alone, even when it's clearly frustrating. Asking for help doesn't come easily." },
  "support-seek":    { label: "What happens when things get hard", desc: "They look for someone to work through it with. The company matters as much as the help." },
  "emotional-derail":{ label: "What happens when things get hard", desc: "It can become overwhelming before they get to a second attempt. Coming back takes a while." },
};
const RECHARGE_TYPE: Record<string, { label: string; desc: string }> = {
  "sensory-quiet":           { label: "What helps them reset", desc: "Quiet time on their own, with not much going on." },
  "social-connection":       { label: "What helps them reset", desc: "Time with people they trust. Not necessarily talking — just not alone." },
  "cognitive-displacement":  { label: "What helps them reset", desc: "Something absorbing enough to take their mind somewhere else entirely." },
  "autonomous-unstructured": { label: "What helps them reset", desc: "Time that's fully theirs, with nothing being asked of them." },
};

const ARCHETYPE_DESC: Record<string, string> = {
  "The All-In Kid": "Deep, chosen focus; harder to hold on open-ended or repetitive tasks",
  "The Explorer":   "Wide, roving attention that moves across topics; drawn to novel territory",
  "The Captain":    "Focus works best when they're in charge; resists tasks they haven't chosen",
  "The Glue":       "Attention follows the people around them; connects and focuses together",
  "The Inventor":   "Absorbed in the how — systems, builds, and original ways to solve problems",
  "The Live Wire":  "High-intensity focus; thrives on challenge and real stakes",
  "The Magnet":     "Attention follows social connection; energised by people and recognition",
  "The Storm":      "Bursts of intense focus followed by a strong need to disengage and reset",
};

const PARENT_INSTINCT_DESC: Record<string, string> = {
  "The Quick Fixer":  "When something isn't working, you move fast to find a new approach",
  "The Pusher":       "When a child hesitates, your instinct is to push them to stay with it",
  "The Negotiator":   "When resistance builds, you look for a deal or compromise that keeps things moving",
  "The Steady Hand":  "You hold the space and wait — consistent presence without pressure",
};

function fallback<T>(map: Record<string, T>, key: string | undefined, def: T): T {
  return (key && map[key]) ? map[key] : def;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; f?: string }>;
}) {
  const { session, f } = await searchParams;
  const fallbackMode = f === "1";

  // No session or malformed UUID — send to landing page, not prototype content.
  if (!session || !UUID_RE.test(session)) {
    redirect("/simplified");
  }

  const sql = getSql();
  const rawRows = await sql`
    SELECT
      a.child_name, a.age_band, a.archetype, a.archetype_fit_tier,
      a.parent_pattern, a.parent_instinct_fit_tier, a.concerns, a.dimensions,
      a.weakest_two, a.parent_name,
      r.narrative_moments, r.behaviour_signature
    FROM assessments a
    LEFT JOIN reports r
      ON r.assessment_id = a.id
      AND r.superseded_by IS NULL
      AND r.status = 'published'
    WHERE a.session_id = ${session}::uuid
    LIMIT 1
  `;

  const rows = rawRows as (Record<string, unknown> & { parent_name: string | null; child_name: string | null })[];

  // Session doesn't exist in DB — clean error, not prototype content.
  if (!rows.length) {
    return <ReportNotFound />;
  }

  const row = rows[0];

  // Contact gate: show gate if parent hasn't submitted details yet.
  if (!row.parent_name) {
    const childName = typeof row.child_name === "string" ? row.child_name : "Your Child";
    return <SimplifiedGate sessionId={session} childName={childName} />;
  }

  // Report not published yet.
  if (!rows[0].narrative_moments) {
    if (fallbackMode) {
      // Generating screen's 120s hard cap fired and report still isn't ready.
      // Show a clean "still building" state — never prototype content.
      return <StillBuilding />;
    }
    // Parent submitted gate but report isn't published yet — redirect to the animated
    // waiting screen. It polls /api/report/status and redirects here when ready,
    // passing ?f=1 on hard-cap so we fall into StillBuilding above instead of looping.
    const childName  = typeof row.child_name === "string" ? row.child_name : "";
    const archetype  = typeof row.archetype  === "string" ? row.archetype  : "";
    redirect(
      `/report/generating/${session}?name=${encodeURIComponent(childName)}&archetype=${encodeURIComponent(archetype)}&dest=simplified`,
    );
  }
  const dims = row.dimensions as Record<string, { value: string }>;
  const moments = row.narrative_moments as { moment_id: string; title: string; content: string }[];

  type SigDimension = {
    dimension: string;
    validated: boolean;
    evidence_tier: string;
    expression: { type?: string; value?: string } | null;
  };
  const behaviourSig = (row.behaviour_signature ?? {}) as { dimensions?: SigDimension[] };
  const sigDimensions: SigDimension[] = behaviourSig.dimensions ?? [];

  const m01 = moments.find((m) => m.moment_id === "m_01");
  const m03 = moments.find((m) => m.moment_id === "m_03");

  const str = (v: unknown, def: string): string => (typeof v === "string" ? v : def);

  const archetype = str(row.archetype, "The All-In Kid");
  const parentPattern = str(row.parent_pattern, "The Quick Fixer");
  // Convert display name → slug expected by generation functions
  const parentInstinctSlug = parentPattern.toLowerCase().replace(/^the /, "").replace(/\s+/g, "-");

  const weekContent = [1, 2, 3].map((w) => getLmsWeekContent(archetype, w));

  // Check for previously persisted simplified-funnel moments so we don't regenerate on
  // every page load. Pattern: check narrative_moments first; generate + persist only on
  // first visit. Subsequent visits serve cached content identically (same as m_01 / m_02).
  const mCachedStrengths = moments.find(m => m.moment_id === "m_simplified_strengths");
  const mCachedActions   = moments.find(m => m.moment_id === "m_simplified_actions");
  const mCachedFallback  = moments.find(m => m.moment_id === "m_instinct_interaction_fallback");
  const mCachedDetail01  = moments.find(m => m.moment_id === "m_01_simplified");

  // Accumulates moments generated this request; persisted to DB at the end.
  const newMoments: { moment_id: string; title: string; content: string }[] = [];

  const childName = str(row.child_name, "Your Child");

  // DETAIL 05: serve from cache if present; otherwise generate and queue for persistence.
  let strengths: Strength[] | null = null;
  if (mCachedStrengths) {
    try { strengths = JSON.parse(mCachedStrengths.content) as Strength[]; } catch {}
  }
  if (!strengths) {
    const strengthDims = selectStrengthDimensions(sigDimensions);
    if (strengthDims.length > 0) {
      strengths = await generateSimplifiedStrengths({
        childName,
        ageBand: str(row.age_band, "10-11"),
        archetype,
        dimensions: strengthDims,
      });
      newMoments.push({ moment_id: "m_simplified_strengths", title: "strengths", content: JSON.stringify(strengths) });
    }
  }

  // DETAIL 03: prefer m_03 (loop detected); then cached fallback; then generate fallback.
  let detail03Content: string | null = null;
  let detail03Title: string | null = null;
  if (m03) {
    detail03Content = m03.content;
    detail03Title = m03.title;
  } else if (mCachedFallback) {
    detail03Content = mCachedFallback.content;
    detail03Title = mCachedFallback.title;
  } else {
    const fallbackDims = selectFallbackDimensions(sigDimensions);
    if (fallbackDims.length > 0) {
      const generated = await generateInstinctInteractionFallback({
        childName,
        ageBand: str(row.age_band, "10-11"),
        archetype,
        archetypeFitTier: str(row.archetype_fit_tier, "primary"),
        parentInstinct: parentInstinctSlug,
        parentInstinctDisplay: parentPattern,
        parentInstinctFitTier: str(row.parent_instinct_fit_tier, "primary"),
        dimensions: fallbackDims,
      });
      detail03Content = generated.content;
      detail03Title = generated.section;
      newMoments.push({ moment_id: "m_instinct_interaction_fallback", title: generated.section, content: generated.content });
    }
  }

  // DETAIL 06 + Try Tonight: serve from cache if present; otherwise generate and persist.
  // Title collision check fires only on first generation (cached titles are already stored).
  let actionsOutput: ActionsOutput | null = null;
  if (mCachedActions) {
    try { actionsOutput = JSON.parse(mCachedActions.content) as ActionsOutput; } catch {}
  }
  if (!actionsOutput) {
    const actionDims = selectActionDimensions(sigDimensions);
    if (actionDims.length > 0) {
      actionsOutput = await generateSimplifiedActions({
        childName,
        ageBand: str(row.age_band, "10-11"),
        archetype,
        parentInstinct: parentInstinctSlug,
        parentInstinctDisplay: parentPattern,
        dimensions: actionDims,
      });
      if (actionsOutput.tryTonight) {
        const priorTitles = [...seenTryTonightTitles];
        const titleFailure = checkTryTonightTitle(actionsOutput.tryTonight.title, priorTitles);
        if (titleFailure) {
          actionsOutput = await generateSimplifiedActions({
            childName,
            ageBand: str(row.age_band, "10-11"),
            archetype,
            parentInstinct: parentInstinctSlug,
            parentInstinctDisplay: parentPattern,
            dimensions: actionDims,
          });
        }
      }
      if (actionsOutput.tryTonight) {
        seenTryTonightTitles.add(actionsOutput.tryTonight.title);
      }
      newMoments.push({ moment_id: "m_simplified_actions", title: "actions", content: JSON.stringify(actionsOutput) });
    }
  }

  // DETAIL 01 (m_01_simplified): reformat m_01 prose into 3-4 checklist bullets.
  // Input is the already-generated m_01 content; no new evidence introduced.
  let detail01Bullets: string[] | null = null;
  if (mCachedDetail01) {
    try { detail01Bullets = JSON.parse(mCachedDetail01.content) as string[]; } catch {}
  }
  if (!detail01Bullets && m01) {
    detail01Bullets = await reformatM01(m01.content);
    newMoments.push({ moment_id: "m_01_simplified", title: "detail01_bullets", content: JSON.stringify(detail01Bullets) });
  }

  // Persist any newly generated moments back to the report so subsequent visits are served
  // from cache. Uses JSONB array concatenation; safe because narrative_moments is an array
  // for all sessions with a published report.
  if (newMoments.length > 0) {
    const newMomentsJson = JSON.stringify(newMoments);
    await sql`
      UPDATE reports
      SET narrative_moments = narrative_moments || ${newMomentsJson}::jsonb
      WHERE assessment_id = (
        SELECT id FROM assessments WHERE session_id = ${session}::uuid LIMIT 1
      )
        AND superseded_by IS NULL
        AND status = 'published'
    `;
  }

  // Record that this parent viewed their report. Fires once per page load (server render).
  // Checked reaches here only when: session valid, parent_name set, published report exists.
  // Use .catch so a DB hiccup never breaks the report render.
  await sql`
    INSERT INTO funnel_events (event_type, session_id, metadata)
    VALUES ('simplified_report_view', ${session}::uuid, '{"variant":"simplified"}'::jsonb)
  `.catch((e: unknown) => console.warn("[funnel] simplified_report_view:", (e as Error).message));

  const data: SimplifiedReportData = {
    childName: str(row.child_name, "Your Child"),
    ageBand: str(row.age_band, "10-11"),
    archetype,
    archetypeFitTier: str(row.archetype_fit_tier, "primary"),
    parentPattern,
    parentInstinctFitTier: str(row.parent_instinct_fit_tier, "primary"),
    archetypeDesc: ARCHETYPE_DESC[archetype] ?? "A distinct attention pattern",
    parentInstinctDesc: PARENT_INSTINCT_DESC[parentPattern] ?? "Your own way of responding when things get hard",
    profile: {
      attentionShape: fallback(ATTENTION_SHAPE, dims.attention_shape?.value, {
        label: "What draws attention in", desc: "Described above in words",
      }),
      attentionCompetition: fallback(ATTENTION_COMPETITION, dims.attention_competition?.value, {
        label: "What pulls it away", desc: "Described above in words",
      }),
      frictionResponse: fallback(FRICTION_RESPONSE, dims.friction_response?.value, {
        label: "Response to friction", desc: "Described above in words",
      }),
      rechargeType: fallback(RECHARGE_TYPE, dims.recharge_type?.value, {
        label: "What helps them recharge", desc: "Described above in words",
      }),
    },
    m01Title: m01?.title ?? null,
    m01Content: m01?.content ?? null,
    detail01Bullets: detail01Bullets ?? null,
    detail03Content,
    detail03Title,
    strengths: strengths?.map(s => s.text) ?? null,
    actions: actionsOutput?.actions ?? null,
    tryTonight: actionsOutput?.tryTonight ?? null,
    weekTitles: [
      weekContent[0]?.weekTitle ?? "Week 1",
      weekContent[1]?.weekTitle ?? "Week 2",
      weekContent[2]?.weekTitle ?? "Week 3",
    ],
    sessionId: session,
    patternLine: PATTERN_LINE[archetype] ?? "",
    meaning: MEANING[archetype] ?? [],
    frictionPoints: FRICTION_POINTS[archetype] ?? [],
    tonightSay: TONIGHT_SAY[archetype] ?? "",
    tonightWatch: TONIGHT_WATCH[archetype] ?? "",
    instinctLine: INSTINCT_LINE[parentPattern] ?? "",
    nowLines: NOW_LINES,
    thenLines: THEN_LINES,
    ladderCurrent: 1,
    testimonial: TESTIMONIAL_POOL[
      parseInt(session.replace(/-/g, "").slice(0, 2), 16) % TESTIMONIAL_POOL.length
    ],
    drawsIn:  dims.attention_shape?.value ? (ATTENTION_SHAPE[dims.attention_shape.value]?.desc ?? "")  : "",
    pullsAway: dims.attention_competition?.value ? (ATTENTION_COMPETITION[dims.attention_competition.value]?.desc ?? "") : "",
    friction:  dims.friction_response?.value ? (FRICTION_RESPONSE[dims.friction_response.value]?.desc ?? "")  : "",
    recharge:  dims.recharge_type?.value ? (RECHARGE_TYPE[dims.recharge_type.value]?.desc ?? "")  : "",
    weakestTwo: Array.isArray(row.weakest_two) ? (row.weakest_two as string[]) : [],
    dimValues: {
      attention_shape:       dims.attention_shape?.value       ?? "",
      attention_competition: dims.attention_competition?.value ?? "",
      friction_response:     dims.friction_response?.value     ?? "",
      recharge_type:         dims.recharge_type?.value         ?? "",
    },
  };

  return <SimplifiedFunnelClient data={data} />;
}

function ReportNotFound() {
  return (
    <div style={{ minHeight: "100dvh", background: "#FBF9F3", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 24, width: "auto", marginBottom: 32 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: "#14284D", marginBottom: 8 }}>Report not found</p>
        <p style={{ fontSize: 14, color: "#5B5648", lineHeight: 1.6 }}>
          This link may have expired or the session wasn&rsquo;t saved correctly. If you took the assessment, try going back to where you started.
        </p>
      </div>
    </div>
  );
}

function StillBuilding() {
  return (
    <div style={{ minHeight: "100dvh", background: "#FBF9F3", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 24, width: "auto", marginBottom: 32 }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: "#14284D", marginBottom: 8 }}>Still building your report</p>
        <p style={{ fontSize: 14, color: "#5B5648", lineHeight: 1.6 }}>
          This is taking a little longer than usual. You don&rsquo;t need to stay on this page — we&rsquo;ll send it to your WhatsApp as soon as it&rsquo;s ready.
        </p>
      </div>
    </div>
  );
}
