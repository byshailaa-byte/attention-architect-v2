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

// "Write a better reply" for a flagged coach message → a PENDING gold example (approved later).
export async function draftBetterReply(opts: {
  sourceMessageId: string; parentMessage: string; betterReply: string; situation: string; tags: string[]; createdBy: string;
}): Promise<void> {
  const sql = getSql();
  const slug = `better-${opts.sourceMessageId.slice(0, 8)}-${Date.now().toString(36)}`;
  const conversation = [{ role: "parent", text: opts.parentMessage }, { role: "coach", text: opts.betterReply }];
  await sql`
    INSERT INTO gold_examples (slug, title, situation, language, tags, conversation, status, source, source_message_id, created_by)
    VALUES (${slug}, ${"Better reply (" + opts.situation.slice(0, 40) + ")"}, ${opts.situation}, 'en', ${opts.tags},
            ${JSON.stringify(conversation)}::jsonb, 'pending', 'admin', ${opts.sourceMessageId}::uuid, ${opts.createdBy})
  `;
}
