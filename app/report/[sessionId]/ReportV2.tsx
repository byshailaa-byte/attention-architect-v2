// Report v2 (?report=v2). PLAIN, UNSTYLED review page for Phase 1 — every content-layer
// field rendered in order, no design. The card/one-page layout is decided after a parent
// test. Default report stays v1; this is opt-in via ?report=v2 or a ?flow=v2 session.
//
// Load-or-generate: content is generated once (LLM → validate → one retry → static fallback)
// and stored in report_v2_content keyed by session_id, so re-opens are instant and stable.
import { after } from "next/server";
import { getSql } from "@/lib/db/client";
import { generateReportV2, type AssessmentInput } from "@/lib/report-v2/generate";
import type { ReportV2Content } from "@/lib/report-v2/types";

async function loadOrGenerate(session: string): Promise<ReportV2Content | null> {
  const sql = getSql();

  // Already generated?
  try {
    const cached = (await sql`
      SELECT content FROM report_v2_content WHERE session_id = ${session}::uuid LIMIT 1
    `) as unknown as { content: ReportV2Content }[];
    if (cached[0]?.content) return cached[0].content;
  } catch { /* table missing pre-migration — fall through to generate */ }

  const rows = (await sql`
    SELECT child_name, child_gender, age_band, archetype, concerns, answers, dimensions,
           report_v2_goal
    FROM assessments WHERE session_id = ${session}::uuid LIMIT 1
  `) as unknown as {
    child_name: string | null;
    child_gender: string | null;
    age_band: string | null;
    archetype: string | null;
    concerns: string[] | null;
    answers: Record<string, string>;
    dimensions: AssessmentInput["dimensions"];
    report_v2_goal: string | null;
  }[];
  if (rows.length === 0) return null;
  const r = rows[0];

  const g = await generateReportV2({
    childName: r.child_name,
    childGender: r.child_gender,
    ageBand: r.age_band,
    archetype: r.archetype,
    concerns: r.concerns,
    answers: r.answers ?? {},
    dimensions: r.dimensions ?? {},
    v2Goal: r.report_v2_goal,
  });
  const content = g.content;

  // Best-effort store; a write failure must not break the render.
  try {
    await sql`
      INSERT INTO report_v2_content (session_id, content, source)
      VALUES (${session}::uuid, ${JSON.stringify(content)}::jsonb, ${content.source})
      ON CONFLICT (session_id) DO NOTHING
    `;
  } catch (e) {
    console.warn("[report-v2] store content:", (e as Error).message);
  }
  return content;
}

export default async function ReportV2({ session }: { session: string }) {
  const c = await loadOrGenerate(session);

  if (c) {
    const sql = getSql();
    after(async () => {
      await sql`
        INSERT INTO funnel_events (event_type, session_id, metadata)
        VALUES ('report_v2_view', ${session}::uuid, ${JSON.stringify({ archetype: c.archetype, source: c.source })}::jsonb)
      `.catch((e: unknown) => console.warn("[funnel] report_v2_view:", (e as Error).message));
    });
  }

  if (!c) {
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
        <p>Report not found for this session.</p>
      </main>
    );
  }

  const L: React.CSSProperties = { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "#888", margin: "28px 0 6px" };
  const P: React.CSSProperties = { margin: "0 0 10px", fontSize: 16, lineHeight: 1.5 };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px 64px", fontFamily: "system-ui, sans-serif", color: "#111" }}>
      <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>Report v2 · review · source: {c.source}</p>

      {/* §1 headline + gold line */}
      <h1 style={{ fontSize: 24, lineHeight: 1.25, margin: "8px 0 4px" }}>{c.headline}</h1>
      <p style={{ fontStyle: "italic", color: "#b8860b", margin: 0 }}>{c.goldLine}</p>

      {/* card-summary one-liners */}
      <p style={L}>In one line</p>
      <p style={P}><b>Good:</b> {c.shortGood}</p>
      <p style={P}><b>Why:</b> {c.shortWhy}</p>
      <p style={P}><b>Fix:</b> {c.shortFix}</p>

      {/* §2 why it doesn't stick */}
      <p style={L}>Why the {c.worryLabel} doesn’t stick</p>
      {c.whyParas.map((para, i) => <p key={i} style={P}>{para}</p>)}

      {/* §3 what we saw in your answers */}
      <p style={L}>What we saw in your answers</p>
      {c.evidence.map((e, i) => (
        <p key={i} style={P}>{e.leadIn}: <i>“{e.quote}”</i></p>
      ))}
      <p style={{ ...P, color: "#555" }}>{c.evidenceTie}</p>

      {/* §4 archetype card */}
      <p style={L}>{c.childName}’s pattern</p>
      <p style={P}><b>{c.archetype}</b></p>
      <p style={P}>{c.archetypeDesc}</p>

      {/* §5 the one switch */}
      <p style={L}>The one switch</p>
      <p style={P}><b>Instead of:</b> {c.switch.instead}</p>
      <p style={P}><b>Try:</b> {c.switch.try}</p>
      <p style={P}>{c.switch.after}</p>

      {/* §6 try it tonight */}
      <p style={L}>Try it tonight</p>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {c.tonight.map((t, i) => <li key={i} style={P}>{t}</li>)}
      </ol>

      {/* §7 goal */}
      <p style={L}>Your goal</p>
      <p style={P}>{c.goal}</p>

      {/* §8 disclaimer */}
      <p style={{ fontSize: 12, color: "#999", marginTop: 36, lineHeight: 1.5 }}>{c.disclaimer}</p>
    </main>
  );
}
