import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

// Loop sessions (m_03)
const loopRows = await sql`
  SELECT
    r.assessment_id,
    r.archetype,
    r.parent_instinct,
    m.value->>'content' AS content
  FROM reports r
  CROSS JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value)
  WHERE m.value->>'moment_id' = 'm_03'
    AND r.status = 'published'
    AND m.value->>'content' IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 5
`;

// Fallback sessions
const fallbackRows = await sql`
  SELECT
    r.assessment_id,
    r.archetype,
    r.parent_instinct,
    m.value->>'content' AS content
  FROM reports r
  CROSS JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value)
  WHERE m.value->>'moment_id' = 'm_instinct_interaction_fallback'
    AND r.status = 'published'
    AND m.value->>'content' IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 5
`;

console.log(`=== LOOP (m_03) — ${loopRows.length} sessions ===\n`);
for (const row of loopRows) {
  const content = row.content as string;
  const paragraphs = content.split(/\n\n+/).filter(Boolean);
  const lastPara = paragraphs[paragraphs.length - 1] ?? "";
  const isPullQuote = paragraphs.length > 1 && lastPara.length < 320;
  console.log(`[${(row.assessment_id as string).slice(0,8)}] ${row.archetype} × ${row.parent_instinct}`);
  console.log(`  paragraphs=${paragraphs.length} | last_len=${lastPara.length} | isPullQuote=${isPullQuote}`);
  console.log(`  LAST PARA: "${lastPara}"`);
  console.log();
}

console.log(`=== FALLBACK (m_instinct_interaction_fallback) — ${fallbackRows.length} sessions ===\n`);
for (const row of fallbackRows) {
  const content = row.content as string;
  const sentences = content.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
  const last = sentences[sentences.length - 1] ?? "";
  console.log(`[${(row.assessment_id as string).slice(0,8)}] ${row.archetype} × ${row.parent_instinct}`);
  console.log(`  sentences_detected=${sentences.length}`);
  console.log(`  FULL:\n  "${content}"`);
  console.log(`  LAST S: "${last}"`);
  console.log();
}
