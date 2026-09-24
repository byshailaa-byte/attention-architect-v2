import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Loop sessions (m_03 exists)
const loopRows = await sql`
  SELECT
    a.session_id,
    a.archetype,
    a.parent_pattern,
    m.value->>'content' AS content
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value) ON true
  WHERE m.value->>'moment_id' = 'm_03'
    AND r.status = 'promoted'
    AND m.value->>'content' IS NOT NULL
  ORDER BY a.created_at DESC
  LIMIT 5
`;

// Fallback sessions (m_instinct_interaction_fallback exists)
const fallbackRows = await sql`
  SELECT
    a.session_id,
    a.archetype,
    a.parent_pattern,
    m.value->>'content' AS content
  FROM assessments a
  JOIN reports r ON r.assessment_id = a.id
  JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value) ON true
  WHERE m.value->>'moment_id' = 'm_instinct_interaction_fallback'
    AND r.status = 'promoted'
    AND m.value->>'content' IS NOT NULL
  ORDER BY a.created_at DESC
  LIMIT 5
`;

console.log("=== LOOP (m_03) — 5 sessions ===\n");
for (const row of loopRows) {
  const paragraphs = (row.content as string).split(/\n\n+/).filter(Boolean);
  const lastPara = paragraphs[paragraphs.length - 1] ?? "";
  const isPullQuote = paragraphs.length > 1 && lastPara.length < 320;
  console.log(`[${(row.session_id as string).slice(0,8)}] ${row.archetype} × ${row.parent_pattern}`);
  console.log(`  paragraphs=${paragraphs.length} | last_len=${lastPara.length} | isPullQuote=${isPullQuote}`);
  console.log(`  LAST PARA: "${lastPara}"`);
  console.log();
}

console.log("=== FALLBACK (m_instinct_interaction_fallback) — 5 sessions ===\n");
for (const row of fallbackRows) {
  const content = row.content as string;
  // Simple sentence split on . followed by space or end
  const sentences = content.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
  const last = sentences[sentences.length - 1] ?? "";
  console.log(`[${(row.session_id as string).slice(0,8)}] ${row.archetype} × ${row.parent_pattern}`);
  console.log(`  sentences=${sentences.length}`);
  console.log(`  FULL:\n    "${content}"`);
  console.log(`  LAST S: "${last}"`);
  console.log();
}
