import { neon } from "@neondatabase/serverless";
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── B4: 20 raw m_03 outputs ───────────────────────────────────────────────────
console.log("\n=== B4: 20 RAW m_03 OUTPUTS ===\n");

const m03Q = await sql`
  SELECT
    a.session_id,
    r.archetype,
    r.parent_instinct,
    m->>'content' AS content
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id,
  LATERAL jsonb_array_elements(r.narrative_moments) m
  WHERE r.status = 'published'
    AND m->>'moment_id' = 'm_03'
  ORDER BY r.generated_at DESC
  LIMIT 20
` as unknown as {
  session_id: string;
  archetype: string;
  parent_instinct: string;
  content: string;
}[];

console.log(`m_03 rows fetched: ${m03Q.length}`);
m03Q.forEach((r, i) => {
  const hasDoubleNewline = r.content.includes("\n\n");
  const paraCount = r.content.split(/\n\n+/).filter(Boolean).length;
  const lastPara = r.content.split(/\n\n+/).filter(Boolean).at(-1) ?? "";
  console.log(`\n[${i+1}] session=${r.session_id.substring(0,8)} archetype=${r.archetype} instinct=${r.parent_instinct}`);
  console.log(`  has_\\n\\n=${hasDoubleNewline} para_count=${paraCount} last_para_len=${lastPara.length}`);
  console.log(`  FULL:\n${r.content}`);
  console.log(`  LAST_PARA: ${lastPara}`);
});

// summary
const withDN = m03Q.filter(r => r.content.includes("\n\n")).length;
const singlePara = m03Q.filter(r => !r.content.includes("\n\n")).length;
console.log(`\nSUMMARY: ${m03Q.length} total | ${withDN} contain \\n\\n | ${singlePara} single-block (no \\n\\n)`);

// ── B5: single-paragraph m_03 — what extractTensionSentence returns ──────────
const singleParaM03 = m03Q.filter(r => !r.content.includes("\n\n"));
console.log(`\n=== B5: SINGLE-PARAGRAPH m_03 DETAIL (${singleParaM03.length}) ===`);
singleParaM03.forEach((r, i) => {
  const fixed = r.content.replace(/\bThe loop\b/g, "This dynamic").replace(/\bthe loop\b/g, "this dynamic");
  const paras = fixed.split(/\n\n+/).filter(Boolean);
  // paras.length === 1 → falls to sentence split path
  const text = paras[0] ?? r.content;
  const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
  const lastSentence = sentences[sentences.length - 1] ?? text;
  let cleaned = lastSentence
    .replace(/^[…\.]+\s*/, "")
    .replace(/^(But|And|Yet|So|However),?\s+/, "")
    .replace(/^The structural tension here is that\s+/i, "")
    .replace(/^The tension (here is|with this particular pattern is) that\s+/i, "");
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  console.log(`\n[${i+1}] session=${r.session_id.substring(0,8)} archetype=${r.archetype}`);
  console.log(`  FULL: ${r.content}`);
  console.log(`  EXTRACTED: ${cleaned}`);
  console.log(`  sentence_count_in_content: ${sentences.length}`);
});

// ── C6: 3 fallback tension sentences per archetype (all except Explorer) ──────
console.log("\n=== C6: FALLBACK TENSION SENTENCES BY ARCHETYPE ===\n");

const archetypes = [
  "The Storm", "The All-In Kid", "The Inventor",
  "The Magnet", "The Glue", "The Captain", "The Live Wire",
];

for (const arch of archetypes) {
  const rows = await sql`
    SELECT
      a.session_id,
      a.parent_pattern,
      m->>'content' AS content
    FROM reports r
    JOIN assessments a ON a.id = r.assessment_id,
    LATERAL jsonb_array_elements(r.narrative_moments) m
    WHERE r.status = 'published'
      AND r.archetype = ${arch}
      AND m->>'moment_id' = 'm_instinct_interaction_fallback'
    ORDER BY r.generated_at DESC
    LIMIT 3
  ` as unknown as { session_id: string; parent_pattern: string; content: string }[];

  console.log(`\n--- ${arch} (${rows.length} rows) ---`);
  rows.forEach((r, i) => {
    const fixed = r.content.replace(/\bThe loop\b/g, "This dynamic").replace(/\bthe loop\b/g, "this dynamic");
    const paras = fixed.split(/\n\n+/).filter(Boolean);
    let tensionSentence: string;
    if (paras.length > 1) {
      const last = paras[paras.length - 1] ?? "";
      tensionSentence = last.length < 320 ? last : (() => {
        const sents2 = (paras[0] ?? fixed).trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
        return sents2[sents2.length - 1] ?? (paras[0] ?? fixed);
      })();
    } else {
      const text = paras[0] ?? fixed;
      const sents = text.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
      tensionSentence = sents[sents.length - 1] ?? text;
    }
    let cleaned = tensionSentence
      .replace(/^[…\.]+\s*/, "")
      .replace(/^(But|And|Yet|So|However),?\s+/, "")
      .replace(/^The structural tension here is that\s+/i, "")
      .replace(/^The tension (here is|with this particular pattern is) that\s+/i, "");
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    const words = cleaned.trim().split(/\s+/).filter(Boolean);
    const sents2 = cleaned.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).filter(Boolean);
    // forward-reference check
    const forwardRefs = cleaned.match(/\b(that move|that push|that instinct|this move|this push|that approach|it tends to|it can)\b/gi) ?? [];
    console.log(`  [${i+1}] session=${r.session_id.substring(0,8)} instinct=${r.parent_pattern}`);
    console.log(`  TENSION: "${cleaned}"`);
    console.log(`  words=${words.length} sentences=${sents2.length} forward_refs=${forwardRefs.length > 0 ? forwardRefs.join(", ") : "none"}`);
  });
}

console.log("\nDone.");
