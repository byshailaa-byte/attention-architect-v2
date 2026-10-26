// Data for the weekly Coach review (/admin/coach-review): open call requests, flagged + thumbs-down
// replies, and pending gold examples. Read-only aggregation; all writes go through the review API.
import { getSql } from "@/lib/db/client";

export type CallRequest = { id: string; kind: string; subjectId: string; urgency: string; reason: string | null; source: string; createdAt: string; child: string | null };
export type FlaggedReply = { id: string; content: string; note: string | null; flaggedAt: string | null; feedback: number | null; day: number | null; kind: "paid" | "trial" };
export type PendingGold = { id: string; title: string; situation: string; tags: string[]; conversation: { role: string; text: string }[]; sourceMessageId: string | null; createdBy: string | null; createdAt: string };

export async function openCallRequests(): Promise<CallRequest[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT r.id, r.kind, r.subject_id, r.urgency, r.reason, r.source, r.created_at,
           COALESCE(ta.child_name, pa.child_name) AS child
    FROM coach_call_request r
    LEFT JOIN coach_trials t ON r.kind='trial' AND t.id::text = r.subject_id
    LEFT JOIN assessments ta ON ta.session_id = t.session_id
    LEFT JOIN assessments pa ON r.kind='paid' AND pa.id = r.assessment_id
    WHERE r.status='open'
    ORDER BY (r.urgency='urgent') DESC, r.created_at DESC LIMIT 100
  `) as unknown as { id: string; kind: string; subject_id: string; urgency: string; reason: string | null; source: string; created_at: string; child: string | null }[];
  return rows.map((r) => ({ id: r.id, kind: r.kind, subjectId: r.subject_id, urgency: r.urgency, reason: r.reason, source: r.source, createdAt: r.created_at, child: r.child }));
}

// Replies an operator flagged in preview, OR a parent thumbs-downed. Newest first.
export async function flaggedReplies(limit = 50): Promise<FlaggedReply[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, content, admin_flag_note AS note, admin_flagged_at AS flagged_at, feedback, day,
           CASE WHEN trial_id IS NULL THEN 'paid' ELSE 'trial' END AS kind
    FROM coach_messages
    WHERE role='coach' AND (admin_flagged_at IS NOT NULL OR feedback < 0)
    ORDER BY COALESCE(admin_flagged_at, created_at) DESC LIMIT ${limit}
  `) as unknown as { id: string; content: string; note: string | null; flagged_at: string | null; feedback: number | null; day: number | null; kind: "paid" | "trial" }[];
  return rows.map((r) => ({ id: r.id, content: r.content, note: r.note, flaggedAt: r.flagged_at, feedback: r.feedback, day: r.day, kind: r.kind }));
}

export type ClientStall = { id: string; kind: string | null; subjectId: string | null; turnId: string | null; ms: number | null; bytes: number | null; deltas: number | null; done: boolean | null; lastEvent: string | null; reason: string | null; userAgent: string | null; createdAt: string };

// Client-side stall reports (the chat UI's 20s watchdog fired, or a stream closed with no {done}).
// Tolerant of the table not existing yet (pre-migration) — returns [] so the page still renders.
export async function clientStalls(limit = 50): Promise<ClientStall[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, kind, subject_id, turn_id, ms, bytes, deltas, done, last_event, reason, user_agent, created_at
    FROM coach_client_stall ORDER BY created_at DESC LIMIT ${limit}
  `.catch(() => [])) as unknown as { id: string; kind: string | null; subject_id: string | null; turn_id: string | null; ms: number | null; bytes: number | null; deltas: number | null; done: boolean | null; last_event: string | null; reason: string | null; user_agent: string | null; created_at: string }[];
  return rows.map((r) => ({ id: r.id, kind: r.kind, subjectId: r.subject_id, turnId: r.turn_id, ms: r.ms, bytes: r.bytes, deltas: r.deltas, done: r.done, lastEvent: r.last_event, reason: r.reason, userAgent: r.user_agent, createdAt: r.created_at }));
}

export async function pendingGold(): Promise<PendingGold[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, situation, tags, conversation, source_message_id, created_by, created_at
    FROM gold_examples WHERE status='pending' ORDER BY created_at DESC LIMIT 100
  `) as unknown as { id: string; title: string; situation: string; tags: string[]; conversation: { role: string; text: string }[]; source_message_id: string | null; created_by: string | null; created_at: string }[];
  return rows.map((r) => ({ id: r.id, title: r.title, situation: r.situation, tags: r.tags, conversation: r.conversation, sourceMessageId: r.source_message_id, createdBy: r.created_by, createdAt: r.created_at }));
}

// ── Writes (from the review API) ──
export async function resolveCall(id: string, status: "done" | "dismissed", by: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE coach_call_request SET status=${status}, resolved_at=now(), resolved_by=${by} WHERE id=${id}::uuid`;
}

export async function approveGold(id: string, by: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE gold_examples SET status='approved', approved_by=${by}, approved_at=now() WHERE id=${id}::uuid AND status='pending'`;
}

export async function rejectGold(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM gold_examples WHERE id=${id}::uuid AND status='pending'`;
}

// Strip identifying details before a real chat becomes a (shared) gold example: the child's and
// parent's first names → neutral placeholders, and any email / phone-like number → a token. Gold
// examples are retrieved into OTHER families' context, so they must never carry one family's details.
function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export function scrubForGold(text: string, names: { childName?: string | null; parentName?: string | null }): string {
  let t = text || "";
  t = t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]");       // emails
  t = t.replace(/\+?\d[\d\s-]{6,}\d/g, "[number]");            // phone-like runs (7+ digits; small counts like "4 or 5" are untouched)
  const first = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0];
  const c = first(names.childName), p = first(names.parentName);
  if (c && c.length >= 2) t = t.replace(new RegExp(`\\b${escapeRegex(c)}\\b`, "gi"), "the child");
  if (p && p.length >= 2) t = t.replace(new RegExp(`\\b${escapeRegex(p)}\\b`, "gi"), "you");
  return t;
}

// "Write a better reply" for a flagged coach message → a PENDING gold example (approved later).
// All free text is PII-scrubbed here, so an unscrubbed row can never be written even if a caller forgets.
export async function draftBetterReply(opts: {
  sourceMessageId: string; parentMessage: string; betterReply: string; situation: string; tags: string[]; createdBy: string;
  childName?: string | null; parentName?: string | null;
}): Promise<void> {
  const sql = getSql();
  const scrub = (s: string) => scrubForGold(s, { childName: opts.childName, parentName: opts.parentName });
  const slug = `better-${opts.sourceMessageId.slice(0, 8)}-${Date.now().toString(36)}`;
  const situation = scrub(opts.situation);
  const conversation = [{ role: "parent", text: scrub(opts.parentMessage) }, { role: "coach", text: scrub(opts.betterReply) }];
  await sql`
    INSERT INTO gold_examples (slug, title, situation, language, tags, conversation, status, source, source_message_id, created_by)
    VALUES (${slug}, ${"Better reply (" + situation.slice(0, 40) + ")"}, ${situation}, 'en', ${opts.tags},
            ${JSON.stringify(conversation)}::jsonb, 'pending', 'admin', ${opts.sourceMessageId}::uuid, ${opts.createdBy})
  `;
}
