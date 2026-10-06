// Coach memory: after every 6th parent message and after any after_done conversation, one extra
// cheap call distils durable facts + a short summary. NEVER stores diagnoses, abuse/safety details,
// or anything from safety-flagged messages (those are excluded from the input here).
import { getSql } from "@/lib/db/client";
import { callCoach } from "./llm";

export type CoachRow = { role: string; content: string; safety_flag?: boolean };

// The ONLY rows allowed into memory: never a safety reply, never a safety-flagged parent message.
export function memorableRows(rows: CoachRow[]): CoachRow[] {
  return rows.filter((r) => !r.safety_flag && r.role !== "safety");
}

const EXTRACT_SYSTEM =
  `You maintain a small memory about a family using a parenting plan. From the conversation, extract durable, concrete facts that will help coach them next time. ` +
  `KEEP SPECIFIC DETAILS VERBATIM: exact times (e.g. "homework at 6 pm"), places (e.g. "dining table"), people and relationships (e.g. "sister distracts him"), and exactly what worked or didn't. Prefer the parent's concrete words over generic summaries. ` +
  `Return ONLY JSON: {"facts": string[], "summary": string}. ` +
  `facts: at most 12, each short and concrete. summary: at most 3 sentences. ` +
  `Do NOT include diagnoses, medical/medication details, or anything about harm, abuse, self-harm or danger. If nothing durable, return {"facts": [], "summary": ""}.`;

function parseLoose(text: string): { facts: string[]; summary: string } {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    const o = JSON.parse(m ? m[0] : text);
    const facts = Array.isArray(o.facts) ? o.facts.filter((f: unknown) => typeof f === "string" && f.trim()).slice(0, 12) : [];
    let summary = typeof o.summary === "string" ? o.summary.trim() : "";
    summary = summary.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    return { facts, summary };
  } catch {
    return { facts: [], summary: "" };
  }
}

export async function updateCoachMemory(userId: string): Promise<void> {
  const sql = getSql();
  const rows = (await sql`
    SELECT role, content, safety_flag FROM coach_messages
    WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT 24
  `) as unknown as CoachRow[];
  // Belt-and-suspenders: strip any safety content before it can reach the extractor.
  const kept = memorableRows(rows);
  if (kept.length === 0) return;
  const convo = kept.reverse().map((m) => `${m.role === "parent" ? "Parent" : "Coach"}: ${m.content}`).join("\n");

  let out: { facts: string[]; summary: string };
  try {
    const res = await callCoach(EXTRACT_SYSTEM, [{ role: "user", content: convo }], 400);
    out = parseLoose(res.text);
  } catch (e) {
    console.error("[coach/memory] extraction failed:", (e as Error).message);
    return; // leave existing memory as-is
  }

  await sql`
    INSERT INTO coach_memory (user_id, facts, summary, updated_at)
    VALUES (${userId}, ${JSON.stringify(out.facts)}::jsonb, ${out.summary}, now())
    ON CONFLICT (user_id) DO UPDATE SET facts = EXCLUDED.facts, summary = EXCLUDED.summary, updated_at = now()
  `;
}
