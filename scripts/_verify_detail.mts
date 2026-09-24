import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Two good contrasting sessions:
// Session A: 9d57f819 - Explorer × Quick Fixer (loop/m_03)
// Session B: f8fb86f2 - All-In Kid × Pusher (loop/m_03) — different archetype AND instinct

const sessions = ["9d57f819-1199-44ad-b2e2-56c7f3c73f1f", "f8fb86f2-0000-0000-0000-000000000000"];

// Get full data for both
for (const partial of ["9d57f819", "f8fb86f2"]) {
  const rows = await sql`
    SELECT
      a.session_id,
      r.archetype,
      r.parent_instinct,
      r.behaviour_signature,
      m_fit.value->>'content' AS fit_content,
      m_fit.value->>'moment_id' AS fit_moment_id
    FROM reports r
    JOIN assessments a ON a.id = r.assessment_id
    LEFT JOIN LATERAL (
      SELECT value FROM jsonb_array_elements(r.narrative_moments)
      WHERE value->>'moment_id' IN ('m_03','m_instinct_interaction_fallback')
      LIMIT 1
    ) AS m_fit(value) ON true
    WHERE a.session_id::text LIKE ${partial + '%'}
      AND r.status = 'published'
    LIMIT 1
  `;
  if (!rows[0]) { console.log(`No result for ${partial}`); continue; }
  const row = rows[0];
  const content = row.fit_content as string ?? "";
  const momentId = row.fit_moment_id as string;
  
  // Extract tension sentence
  const paras = content.replace(/\bThe loop\b/g, "This dynamic").replace(/\bthe loop\b/g, "this dynamic").split(/\n\n+/).filter(Boolean);
  let tension: string;
  if (paras.length > 1) {
    const last = paras[paras.length - 1] ?? "";
    if (last.length < 320) {
      tension = last;
    } else {
      tension = "PULL QUOTE TOO LONG";
    }
  } else {
    const text = paras[0] ?? content;
    const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
    let s2 = sentences[sentences.length - 1] ?? text;
    s2 = s2.replace(/^[…\.]+\s*/, "");
    s2 = s2.replace(/^(But|And|Yet|So|However),?\s+/, "");
    s2 = s2.replace(/^The structural tension here is that\s+/i, "");
    s2 = s2.replace(/^The tension (here is|with this particular pattern is) that\s+/i, "");
    tension = s2.charAt(0).toUpperCase() + s2.slice(1);
  }

  // Snapshot grouping
  const sig = row.behaviour_signature as Record<string, string> ?? {};
  const weakAxes = Object.entries(sig).filter(([,v]) => v === "weak").map(([k]) => k);
  
  console.log(`\n=== ${row.archetype} × ${row.parent_instinct} [${momentId}] ===`);
  console.log(`  Session: ${(row.session_id as string).slice(0,8)}`);
  console.log(`  Tension: "${tension}"`);
  console.log(`  WeakAxes: ${weakAxes.join(", ") || "(none)"}`);
}
