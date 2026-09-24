import { neon } from "@neondatabase/serverless";

// Production endpoint only — ep-green-truth-aqxygaj2
const PROD = "postgresql://neondb_owner:npg_NpKR46krwuBg@ep-green-truth-aqxygaj2.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(PROD);

// ── A2: Loop detection vs m_03 render vs detected-but-fallback ───────────────
console.log("\n=== A2: LOOP / m_03 / FALLBACK COUNTS ===\n");

const countQ = await sql`
  SELECT
    COUNT(*) FILTER (WHERE r.status = 'published')                                           AS total_published,

    COUNT(*) FILTER (
      WHERE r.status = 'published'
        AND (r.family_attention_loop->>'detected')::boolean = true
    )                                                                                         AS loop_detected,

    COUNT(*) FILTER (
      WHERE r.status = 'published'
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m
          WHERE m->>'moment_id' = 'm_03'
        )
    )                                                                                         AS rendered_m03,

    COUNT(*) FILTER (
      WHERE r.status = 'published'
        AND (r.family_attention_loop->>'detected')::boolean = true
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m
          WHERE m->>'moment_id' = 'm_03'
        )
    )                                                                                         AS detected_but_no_m03,

    COUNT(*) FILTER (
      WHERE r.status = 'published'
        AND (r.family_attention_loop->>'detected')::boolean = true
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m
          WHERE m->>'moment_id' = 'm_instinct_interaction_fallback'
        )
    )                                                                                         AS detected_and_fallback

  FROM reports r
` as unknown as {
  total_published: string;
  loop_detected: string;
  rendered_m03: string;
  detected_but_no_m03: string;
  detected_and_fallback: string;
}[];

console.log("Query:");
console.log(`SELECT
  COUNT(*) FILTER (WHERE status = 'published') AS total_published,
  COUNT(*) FILTER (WHERE status='published' AND (family_attention_loop->>'detected')::boolean = true) AS loop_detected,
  COUNT(*) FILTER (WHERE status='published' AND EXISTS (SELECT 1 FROM jsonb_array_elements(narrative_moments) m WHERE m->>'moment_id' = 'm_03')) AS rendered_m03,
  COUNT(*) FILTER (WHERE status='published' AND (family_attention_loop->>'detected')::boolean = true AND NOT EXISTS (...m_03...)) AS detected_but_no_m03,
  COUNT(*) FILTER (WHERE status='published' AND (family_attention_loop->>'detected')::boolean = true AND EXISTS (...m_instinct_interaction_fallback...)) AS detected_and_fallback
FROM reports;`);
console.log("\nResult:", JSON.stringify(countQ[0], null, 2));

// ── A3: Where does the drop happen — examine detected-but-no-m03 sessions ────
console.log("\n=== A3: DETECTED-BUT-NO-M03 DETAIL ===\n");

const dropQ = await sql`
  SELECT
    a.session_id,
    r.id AS report_id,
    r.generated_at,
    r.family_attention_loop->>'detected' AS loop_detected,
    r.family_attention_loop->'loop_tension_point'->>'mechanism' AS mechanism,
    (
      SELECT jsonb_agg(m->>'moment_id' ORDER BY (m->>'moment_id'))
      FROM jsonb_array_elements(r.narrative_moments) m
    ) AS moment_ids,
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m
      WHERE m->>'moment_id' = 'm_instinct_interaction_fallback'
    ) AS has_fallback,
    r.archetype,
    r.parent_pattern
  FROM reports r
  JOIN assessments a ON a.id = r.assessment_id
  WHERE r.status = 'published'
    AND (r.family_attention_loop->>'detected')::boolean = true
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(r.narrative_moments) m
      WHERE m->>'moment_id' = 'm_03'
    )
  ORDER BY r.generated_at DESC
` as unknown as {
  session_id: string;
  report_id: string;
  generated_at: string;
  loop_detected: string;
  mechanism: string;
  moment_ids: string[];
  has_fallback: boolean;
  archetype: string;
  parent_pattern: string;
}[];

console.log(`Detected-but-no-m03 rows: ${dropQ.length}`);
dropQ.forEach((r, i) => {
  console.log(`\n[${i+1}] session=${r.session_id.substring(0,8)} report=${r.report_id.substring(0,8)} generated=${r.generated_at}`);
  console.log(`  archetype=${r.archetype} parent_pattern=${r.parent_pattern}`);
  console.log(`  mechanism=${r.mechanism}`);
  console.log(`  has_fallback=${r.has_fallback}`);
  console.log(`  moment_ids=${JSON.stringify(r.moment_ids)}`);
});

// ── B4: 20 raw m_03 outputs — count \n\n ─────────────────────────────────────
console.log("\n=== B4: 20 RAW m_03 OUTPUTS ===\n");

const m03Q = await sql`
  SELECT
    a.session_id,
    r.archetype,
    r.parent_pattern,
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
  parent_pattern: string;
  content: string;
}[];

console.log(`m_03 rows fetched: ${m03Q.length}`);
m03Q.forEach((r, i) => {
  const hasDoubleNewline = r.content.includes("\n\n");
  const paraCount = r.content.split(/\n\n+/).filter(Boolean).length;
  const lastPara = r.content.split(/\n\n+/).filter(Boolean).at(-1) ?? "";
  console.log(`\n[${i+1}] session=${r.session_id.substring(0,8)} archetype=${r.archetype} parent=${r.parent_pattern}`);
  console.log(`  has_\\n\\n: ${hasDoubleNewline} | para_count: ${paraCount} | last_para_len: ${lastPara.length}`);
  console.log(`  CONTENT:\n${r.content}`);
  console.log(`  ---`);
  console.log(`  LAST PARA (what .at(-1) returns):\n${lastPara}`);
});

// ── B5: single-paragraph m_03 — what extractTensionSentence returns ──────────
const singleParaM03 = m03Q.filter(r => !r.content.includes("\n\n"));
console.log(`\n=== B5: SINGLE-PARAGRAPH m_03 (no \\n\\n): ${singleParaM03.length} ===`);
singleParaM03.forEach((r, i) => {
  // Replicate extractTensionSentence logic
  const fixed = r.content.replace(/\bThe loop\b/g, "This dynamic").replace(/\bthe loop\b/g, "this dynamic");
  const paras = fixed.split(/\n\n+/).filter(Boolean);
  // paras.length === 1 → falls to sentence split path
  const text = paras[0] ?? r.content;
  const sentences = text.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
  const lastSentence = sentences[sentences.length - 1] ?? text;
  // cleanTensionOpener
  let cleaned = lastSentence
    .replace(/^[…\.]+\s*/, "")
    .replace(/^(But|And|Yet|So|However),?\s+/, "")
    .replace(/^The structural tension here is that\s+/i, "")
    .replace(/^The tension (here is|with this particular pattern is) that\s+/i, "");
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  console.log(`\n[${i+1}] session=${r.session_id.substring(0,8)} archetype=${r.archetype}`);
  console.log(`  FULL CONTENT: ${r.content}`);
  console.log(`  EXTRACTED TENSION: ${cleaned}`);
});

// ── C6: 3 fallback tension sentences per archetype (excluding Explorer) ───────
console.log("\n=== C6: FALLBACK TENSION SENTENCES BY ARCHETYPE ===\n");

const archetypes = [
  "The Storm", "The All-In Kid", "The Inventor",
  "The Magnet", "The Glue", "The Captain", "The Live Wire",
];

for (const arch of archetypes) {
  const rows = await sql`
    SELECT
      a.session_id,
      r.parent_pattern,
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
    // Apply extractTensionSentence
    const fixed = r.content.replace(/\bThe loop\b/g, "This dynamic").replace(/\bthe loop\b/g, "this dynamic");
    const paras = fixed.split(/\n\n+/).filter(Boolean);
    let tensionSentence: string;
    if (paras.length > 1) {
      const last = paras[paras.length - 1] ?? "";
      if (last.length < 320) {
        tensionSentence = last;
      } else {
        const text2 = paras[0] ?? fixed;
        const sents2 = text2.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).map((s: string) => s.trim()).filter(Boolean);
        tensionSentence = sents2[sents2.length - 1] ?? text2;
      }
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

    const words = cleaned.split(/\s+/).filter(Boolean);
    const sentences = cleaned.trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).filter(Boolean);
    console.log(`  [${i+1}] session=${r.session_id.substring(0,8)} instinct=${r.parent_pattern}`);
    console.log(`  RAW S2: "${cleaned}"`);
    console.log(`  words=${words.length} sentences=${sentences.length}`);
  });
}

// ── D8: PARENT_OFFERS — already confirmed from source, but also verify no per-session feed ─
console.log("\n=== D8: PARENT_OFFERS LOOKUP (from source, reported here for completeness) ===");
console.log(`"The Quick Fixer": "A faster way through"`);
console.log(`"The Pusher":      "Pressure to keep going"`);
console.log(`"The Negotiator":  "A deal both sides can take"`);
console.log(`"The Steady Hand": "Calm and space to wait"`);
console.log("Source: app/preview/simplified-v1/client.tsx:450-455");

console.log("\nDone.");
