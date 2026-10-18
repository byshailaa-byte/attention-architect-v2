// Gold-example retrieval. Picks the 2–3 most similar approved/seed conversations for the current
// situation and formats them for the Coach's context. Matching is keyword/tag based (no embeddings
// yet) over a small curated library — good enough for a library of tens of examples; revisit with
// embeddings if it grows large.
import { getSql } from "@/lib/db/client";

export type GoldExample = {
  slug: string;
  title: string;
  situation: string;
  archetype: string | null;
  worry: string | null;
  ageBand: string | null;
  language: string;
  tags: string[];
  conversation: { role: "coach" | "parent"; text: string }[];
};

export type RetrieveOpts = {
  worry?: string | null;
  archetype?: string | null;
  ageBand?: string | null;
  language?: string;
  signals?: string[];   // situation tags derived from the latest parent message
  limit?: number;
};

// Cheap signal detection from the parent's latest message → tags that bias retrieval.
export function situationSignals(text: string): string[] {
  const t = (text || "").toLowerCase();
  const out: string[] = [];
  if (/\b(didn'?t work|did not work|ignored|no change|same as|nothing changed|refused?)\b/.test(t)) out.push("tried_didnt_work");
  if (/\b(worked|better|went well|she started|he started|did it (herself|himself))\b/.test(t)) out.push("tried_partly");
  if (/\b(tired|exhausted|nothing works|fed up|can'?t (do this|cope)|at my wits)\b/.test(t)) out.push("frustrated");
  if (/\b(hindi|हिंदी|hinglish)\b/.test(t)) out.push("hindi");
  if (/\b(what if|agar.*to|suppose|what happens if)\b/.test(t)) out.push("what_if");
  if (/\b(price|cost|how much|₹|rupees|fee|charge)\b/.test(t)) out.push("price");
  if (/\b(sad|depress|won'?t eat|not eating|sleep|self[- ]?harm|hurt (herself|himself)|diagnos|adhd|medication|counsell?or)\b/.test(t)) out.push("medical");
  if (/\b(don'?t understand|confus|not sure what|samajh nahi)\b/.test(t)) out.push("confusion");
  return out;
}

export async function retrieveGold(opts: RetrieveOpts): Promise<GoldExample[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT slug, title, situation, archetype, worry, age_band, language, tags, conversation
    FROM gold_examples WHERE status IN ('seed','approved')
  `) as unknown as {
    slug: string; title: string; situation: string; archetype: string | null; worry: string | null;
    age_band: string | null; language: string; tags: string[]; conversation: { role: "coach" | "parent"; text: string }[];
  }[];

  const signals = new Set(opts.signals ?? []);
  const scored = rows.map((r) => {
    let score = 0;
    if (opts.worry && r.worry && r.worry === opts.worry) score += 2;
    if (opts.archetype && r.archetype && r.archetype === opts.archetype) score += 2;
    if (opts.ageBand && r.age_band && r.age_band === opts.ageBand) score += 1;
    if (opts.language && r.language === opts.language) score += 1;
    for (const tag of r.tags) if (signals.has(tag)) score += 3; // situation match is the strongest signal
    return { r, score };
  });
  // When there are signals, only keep examples that match at least one; otherwise fall back to the
  // generic day0/checkin examples so the Coach always has grounding.
  const haveSignalMatch = scored.some((s) => s.score >= 3);
  const pool = haveSignalMatch ? scored.filter((s) => s.score >= 3) : scored;
  pool.sort((a, b) => b.score - a.score);
  return pool.slice(0, opts.limit ?? 3).map(({ r }) => ({
    slug: r.slug, title: r.title, situation: r.situation, archetype: r.archetype, worry: r.worry,
    ageBand: r.age_band, language: r.language, tags: r.tags, conversation: r.conversation,
  }));
}

// Format for the system prompt — shown as reference, explicitly "do not copy verbatim".
export function formatGoldForPrompt(examples: GoldExample[]): string {
  if (!examples.length) return "";
  const blocks = examples.map((ex) => {
    const lines = ex.conversation.map((t) => `${t.role === "coach" ? "Coach" : "Parent"}: ${t.text}`).join("\n");
    return `Example — ${ex.title} (${ex.situation})\n${lines}`;
  });
  return `\n\n## Examples of the voice and method (reference only — match the STYLE and approach; do NOT copy the words, and use this family's own details)\n${blocks.join("\n\n")}`;
}
