import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT r.assessment_id, r.archetype, r.parent_instinct,
    m.value->>'content' AS content
  FROM reports r
  CROSS JOIN LATERAL jsonb_array_elements(r.narrative_moments) AS m(value)
  WHERE m.value->>'moment_id' = 'm_instinct_interaction_fallback'
    AND r.status = 'published'
    AND m.value->>'content' IS NOT NULL
  ORDER BY r.created_at DESC
  LIMIT 5
`;

function extractS2(content: string): string {
  const sentences = content.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
  return sentences[sentences.length - 1] ?? content;
}

function cleanS2(s: string): string {
  // Strip leading "…" or "..." 
  s = s.replace(/^[…\.]+\s*/, "");
  // Strip leading conjunctions: But, And, Yet, So, However
  s = s.replace(/^(But|And|Yet|So|However),?\s+/, "");
  // Strip "The structural tension here is that "
  s = s.replace(/^The structural tension here is that\s+/, "");
  // Strip "The tension with this particular pattern is that "
  s = s.replace(/^The tension with this particular pattern is that\s+/, "");
  // Strip "The tension here is that "
  s = s.replace(/^The tension here is that\s+/, "");
  // Capitalize first letter
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

for (const row of rows) {
  const s2 = extractS2(row.content as string);
  const cleaned = cleanS2(s2);
  const standsAlone = !cleaned.match(/\b(that move|that push|that pause|that moment|that instinct)\b/i);
  console.log(`[${(row.assessment_id as string).slice(0,8)}] ${row.archetype} × ${row.parent_instinct}`);
  console.log(`  RAW S2:     "${s2}"`);
  console.log(`  CLEANED:    "${cleaned}"`);
  console.log(`  Stands alone: ${standsAlone ? "YES" : "NEEDS CONTEXT (forward ref)"}`);
  console.log();
}
