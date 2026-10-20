import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth/session";
import type { AgeBand } from "@/content/types";
import { coachTrialEnabled } from "@/lib/coach-trial/flags";
import { resolveCoachAccess } from "@/lib/coach-trial/access";
import { resolveTrialDays } from "@/lib/coach-trial/content";

// Trial-safe "Read the step in detail" page. Shows ONE day's full step for a trial parent — Day 1 is
// their report's tonight step, Days 2–4 are LMS Week-1 content for their archetype × age band. It
// does NOT open the paid LMS library (trial parents stay gated). Locked after Day 4 like the trial.
export const dynamic = "force-dynamic";

const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", gold: "#E8A33D", ink: "#2E3A4B", dim: "#5B6577",
  white: "#FFFFFF", line: "#E7E0D2",
} as const;
const HEAD = "var(--font-newsreader), Georgia, serif";
const BODY = "var(--font-figtree), system-ui, sans-serif";

export default async function TrialStepPage({ params }: { params: Promise<{ day: string }> }) {
  const { day: dayParam } = await params;
  const day = parseInt(dayParam, 10);
  if (!Number.isInteger(day) || day < 1 || day > 4) notFound();

  const jar = await cookies();
  const userId = verifySessionToken(jar.get(COOKIE_NAME)?.value ?? "");
  if (!userId) redirect("/lms/login");

  if (!coachTrialEnabled()) notFound();
  const access = await resolveCoachAccess(userId);
  if (access.role !== "trial") redirect("/");
  // Locked (trial ended) → send to /coach, which shows the paused/results screen.
  if (access.locked) redirect("/coach");
  // Can't peek past the current unlocked day.
  if (day > access.day) redirect(`/coach/step/${access.day}`);

  const { trial, userCtx } = access;
  const days = await resolveTrialDays({
    sessionId: trial.session_id ?? "",
    archetype: userCtx.archetype,
    ageBand: userCtx.ageBand as AgeBand,
    childName: userCtx.childName,
    gender: userCtx.childGender,
  });
  const card = days[day - 1];
  if (!card) notFound();

  const label = { fontSize: 11, fontWeight: 700, letterSpacing: ".1em", color: C.gold, textTransform: "uppercase" as const };

  return (
    <div style={{ minHeight: "100dvh", background: C.cream, fontFamily: BODY, color: C.ink }}>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 18px 48px" }}>
        <a href="/coach" style={{ fontSize: 14, fontWeight: 700, color: C.navy, textDecoration: "none" }}>&larr; Back to Coach</a>

        <div style={{ ...label, marginTop: 22, marginBottom: 6 }}>Day {day} of 4 · Today&rsquo;s step</div>
        <h1 style={{ fontFamily: HEAD, fontWeight: 600, fontSize: 26, lineHeight: 1.25, color: C.navy, margin: "0 0 18px" }}>{card.title}</h1>

        <div style={{ background: C.white, border: `1px solid ${C.line}`, borderLeft: `4px solid ${C.gold}`, borderRadius: "0 16px 16px 0", padding: "20px 22px" }}>
          {card.source === "report" ? (
            <>
              {card.instead && <p style={{ fontSize: 15.5, color: C.dim, lineHeight: 1.55, margin: "0 0 12px" }}>Instead of {card.instead}</p>}
              {card.say && (
                <p style={{ fontFamily: HEAD, fontSize: 19, color: C.navy, lineHeight: 1.5, margin: "0 0 14px" }}>&ldquo;{card.say}&rdquo;</p>
              )}
              {card.after && <p style={{ fontSize: 15.5, color: C.ink, lineHeight: 1.55, margin: "0 0 14px" }}>{card.after}</p>}
              {card.steps && card.steps.length > 0 && (
                <ol style={{ margin: "6px 0 0", paddingLeft: 22 }}>
                  {card.steps.map((s, i) => (
                    <li key={i} style={{ fontSize: 16, lineHeight: 1.55, color: C.ink, marginBottom: 9 }}>{s}</li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: C.ink, margin: 0, whiteSpace: "pre-wrap" }}>{card.body}</p>
          )}
        </div>

        <p style={{ fontSize: 14, color: C.dim, lineHeight: 1.6, margin: "20px 2px 0" }}>
          Try it once today, then tell the Coach how it went. We&rsquo;ll take it one step at a time.
        </p>
        <a href="/coach" style={{ display: "inline-block", marginTop: 18, background: C.gold, color: "#1a1a1a", borderRadius: 12, padding: "11px 18px", fontWeight: 700, fontSize: 15, textDecoration: "none" }}>
          Back to the Coach
        </a>
      </div>
    </div>
  );
}
