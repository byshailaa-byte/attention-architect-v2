// Per-parent memory for the conversational Coach. Keyed (kind, subject_id) so it covers BOTH trial
// and paid. Read FIRST every turn; written after each session and via the note_for_memory tool.
// NEVER stores diagnoses, medical/medication, or safety details, and only ever reflects what the
// PARENT said (a coach suggestion is not a family fact). Backfilled for existing parents before they
// move to the new Coach, so nobody is greeted as a stranger.
import { getSql } from "@/lib/db/client";
import { callCoach, COACH_MEMORY_MODEL } from "@/lib/lms/coach/llm";

export type MemKind = "paid" | "trial";
export type ParentMemory = { facts: string[]; summary: string };

const MAX_FACTS = 14;

export async function readParentMemory(kind: MemKind, subjectId: string): Promise<ParentMemory> {
  const sql = getSql();
  const rows = (await sql`SELECT facts, summary FROM parent_memory WHERE kind=${kind} AND subject_id=${subjectId}`) as unknown as { facts: string[]; summary: string }[];
  const facts = Array.isArray(rows[0]?.facts) ? rows[0].facts : [];
  return { facts, summary: rows[0]?.summary ?? "" };
}

// Stored reply-language preference (set by the set_language tool; read into context each turn).
export async function getLanguagePref(kind: MemKind, subjectId: string): Promise<"en" | "hinglish" | "hi" | null> {
  const sql = getSql();
  const rows = (await sql`SELECT language FROM parent_memory WHERE kind=${kind} AND subject_id=${subjectId}`) as unknown as { language: string | null }[];
  const l = rows[0]?.language;
  return l === "en" || l === "hinglish" || l === "hi" ? l : null;
}
export async function setLanguagePref(kind: MemKind, subjectId: string, lang: "en" | "hinglish" | "hi"): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO parent_memory (kind, subject_id, language, updated_at)
    VALUES (${kind}, ${subjectId}, ${lang}, now())
    ON CONFLICT (kind, subject_id) DO UPDATE SET language=EXCLUDED.language, updated_at=now()
  `;
}

export async function writeParentMemory(kind: MemKind, subjectId: string, mem: ParentMemory): Promise<void> {
  const sql = getSql();
  const facts = mem.facts.filter((f) => typeof f === "string" && f.trim()).slice(0, MAX_FACTS);
  await sql`
    INSERT INTO parent_memory (kind, subject_id, facts, summary, updated_at)
    VALUES (${kind}, ${subjectId}, ${JSON.stringify(facts)}::jsonb, ${mem.summary.slice(0, 600)}, now())
    ON CONFLICT (kind, subject_id) DO UPDATE SET facts=EXCLUDED.facts, summary=EXCLUDED.summary, updated_at=now()
  `;
}

// The note_for_memory tool: append one short durable note (deduped), keep the summary as-is.
export async function appendMemoryNote(kind: MemKind, subjectId: string, note: string): Promise<void> {
  const clean = (note || "").trim();
  if (!clean) return;
  const mem = await readParentMemory(kind, subjectId);
  if (mem.facts.some((f) => f.toLowerCase() === clean.toLowerCase())) return;
  mem.facts.push(clean.slice(0, 200));
  await writeParentMemory(kind, subjectId, mem);
}

// Load the PARENT's own non-safety messages for a subject (never coach replies, never safety rows).
async function loadParentMessages(kind: MemKind, subjectId: string, limit = 40): Promise<string[]> {
  const sql = getSql();
  const rows = kind === "trial"
    ? (await sql`SELECT content FROM coach_messages WHERE trial_id=${subjectId}::uuid AND role='parent' AND safety_flag=false ORDER BY created_at DESC LIMIT ${limit}`)
    : (await sql`SELECT content FROM coach_messages WHERE user_id=${subjectId} AND trial_id IS NULL AND role='parent' AND safety_flag=false ORDER BY created_at DESC LIMIT ${limit}`);
  return (rows as unknown as { content: string }[]).map((r) => r.content).reverse();
}

const EXTRACT_SYSTEM =
  `You maintain a small memory about one family using a parenting plan. The input is ONLY the parent's own messages. ` +
  `Extract durable, concrete facts the PARENT stated — never advice or a plan (anything a coach proposed is not a fact about the family). ` +
  `KEEP SPECIFICS VERBATIM: exact times ("homework at 6 pm"), places ("dining table"), people ("sister distracts him"), the child's triggers, and exactly what the parent said worked or didn't. ` +
  `Return ONLY JSON: {"facts": string[], "summary": string}. facts: at most 12, each short and concrete. summary: at most 3 sentences about what the parent reported. ` +
  `Do NOT include diagnoses, medical/medication details, or anything about harm, abuse, self-harm or danger. If nothing durable, return {"facts": [], "summary": ""}.`;

function parseLoose(text: string): ParentMemory {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m ? m[0] : text);
    const facts = Array.isArray(o.facts) ? o.facts.filter((f: unknown) => typeof f === "string" && f.trim()).slice(0, 12) : [];
    let summary = typeof o.summary === "string" ? o.summary.trim() : "";
    summary = summary.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    return { facts, summary };
  } catch { return { facts: [], summary: "" }; }
}

// Summarise a subject's conversation into parent_memory (called after a session; also by backfill).
// Merges any existing note_for_memory facts so manual notes aren't lost.
export async function summariseParentMemory(kind: MemKind, subjectId: string): Promise<void> {
  const msgs = await loadParentMessages(kind, subjectId);
  if (msgs.length === 0) return;
  const convo = msgs.map((m) => `Parent: ${m}`).join("\n");
  let out: ParentMemory;
  try {
    const res = await callCoach(EXTRACT_SYSTEM, [{ role: "user", content: convo }], 400, COACH_MEMORY_MODEL);
    out = parseLoose(res.text);
  } catch (e) {
    console.error("[coach/memory] extraction failed:", (e as Error).message);
    return;
  }
  const existing = await readParentMemory(kind, subjectId);
  // Keep any hand-added note_for_memory facts that the extractor wouldn't reproduce.
  const merged = [...new Set([...out.facts, ...existing.facts])].slice(0, MAX_FACTS);
  await writeParentMemory(kind, subjectId, { facts: merged, summary: out.summary || existing.summary });
}
