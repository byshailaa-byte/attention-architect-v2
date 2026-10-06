// Server data for the admin "Coach chats" screen (Part F / A5). Reads the coach_* tables.
import { getSql } from "@/lib/db/client";

export type CoachFilter = "needs_look" | "all" | "safety" | "thumbsdown";

export type CoachStats = {
  paidUsed: number; totalPaid: number; parentMessages: number;
  thumbsUp: number; thumbsDown: number; helpfulPct: number | null;
  safetyFlags: number; costRupees: number;
};

export async function getCoachStats(): Promise<CoachStats> {
  const sql = getSql();
  const q = async <T>(s: Promise<unknown>) => (await s) as unknown as T[];
  const [pm] = await q<{ c: number }>(sql`SELECT COUNT(*)::int c FROM coach_messages WHERE role='parent' AND created_at > now() - interval '7 days'`);
  const [pu] = await q<{ c: number }>(sql`SELECT COUNT(DISTINCT user_id)::int c FROM coach_messages WHERE role='parent' AND created_at > now() - interval '7 days'`);
  const [tp] = await q<{ c: number }>(sql`SELECT COUNT(DISTINCT user_id)::int c FROM purchases WHERE status='paid'`);
  const [fb] = await q<{ up: number; down: number }>(sql`SELECT COUNT(*) FILTER (WHERE feedback=1)::int up, COUNT(*) FILTER (WHERE feedback=-1)::int down FROM coach_messages WHERE created_at > now() - interval '7 days'`);
  const [sf] = await q<{ c: number }>(sql`SELECT COUNT(*)::int c FROM coach_messages WHERE safety_flag=true AND role='safety' AND created_at > now() - interval '7 days'`);
  const [cost] = await q<{ c: number }>(sql`SELECT COALESCE(SUM(cost_paise),0)::int c FROM coach_messages WHERE created_at > now() - interval '7 days'`);
  const up = fb?.up ?? 0, down = fb?.down ?? 0;
  return {
    paidUsed: pu?.c ?? 0, totalPaid: tp?.c ?? 0, parentMessages: pm?.c ?? 0,
    thumbsUp: up, thumbsDown: down, helpfulPct: up + down > 0 ? Math.round((up / (up + down)) * 100) : null,
    safetyFlags: sf?.c ?? 0, costRupees: Math.round((cost?.c ?? 0) / 100),
  };
}

export type CoachThreadRow = {
  userId: string; parent: string; child: string;
  kind: "safety" | "down" | "normal"; line: string; lastAt: Date;
  needsLook: boolean;
};

export async function needsLookCount(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT COUNT(DISTINCT user_id)::int c FROM coach_messages
    WHERE reviewed_at IS NULL AND (safety_flag = true OR feedback = -1)
  `) as unknown as { c: number }[];
  return rows[0]?.c ?? 0;
}

export async function getCoachThreads(filter: CoachFilter): Promise<CoachThreadRow[]> {
  const sql = getSql();
  const agg = (await sql`
    SELECT cm.user_id,
      MAX(cm.created_at) AS last_at,
      COUNT(*) FILTER (WHERE cm.role='parent')::int AS parent_msgs,
      COUNT(*) FILTER (WHERE cm.feedback=1)::int AS ups,
      COUNT(*) FILTER (WHERE cm.safety_flag=true)::int AS safety_n,
      COUNT(*) FILTER (WHERE cm.feedback=-1)::int AS down_n,
      bool_or(cm.safety_flag AND cm.reviewed_at IS NULL) AS unrev_safety,
      bool_or(cm.feedback=-1 AND cm.reviewed_at IS NULL) AS unrev_down,
      (array_agg(cm.week ORDER BY cm.created_at DESC))[1] AS week,
      (array_agg(cm.day ORDER BY cm.created_at DESC))[1] AS day
    FROM coach_messages cm GROUP BY cm.user_id
  `) as unknown as Record<string, unknown>[];

  const ids = agg.map((r) => r.user_id as string);
  if (ids.length === 0) return [];
  const names = (await sql`
    SELECT DISTINCT ON (p.user_id) p.user_id, a.parent_name, a.child_name
    FROM purchases p JOIN assessments a ON a.id = p.assessment_id
    WHERE p.user_id = ANY(${ids}) AND p.status='paid' ORDER BY p.user_id, p.created_at DESC
  `) as unknown as { user_id: string; parent_name: string | null; child_name: string | null }[];
  const nameMap = new Map(names.map((n) => [n.user_id, n]));
  const reasons = (await sql`
    SELECT DISTINCT ON (user_id) user_id, feedback_reason FROM coach_messages
    WHERE feedback = -1 AND user_id = ANY(${ids}) ORDER BY user_id, created_at DESC
  `) as unknown as { user_id: string; feedback_reason: string | null }[];
  const reasonMap = new Map(reasons.map((r) => [r.user_id, r.feedback_reason]));
  const lastParent = (await sql`
    SELECT DISTINCT ON (user_id) user_id, content FROM coach_messages
    WHERE role='parent' AND user_id = ANY(${ids}) ORDER BY user_id, created_at DESC
  `) as unknown as { user_id: string; content: string }[];
  const lastParentMap = new Map(lastParent.map((r) => [r.user_id, r.content]));

  let rows: CoachThreadRow[] = agg.map((r) => {
    const uid = r.user_id as string;
    const nm = nameMap.get(uid);
    const unrevSafety = !!r.unrev_safety, unrevDown = !!r.unrev_down;
    const safetyN = (r.safety_n as number) ?? 0, downN = (r.down_n as number) ?? 0;
    const kind: CoachThreadRow["kind"] = unrevSafety ? "safety" : unrevDown ? "down" : "normal";
    let line: string;
    if (unrevSafety) line = "Helplines shown, no AI reply.";
    else if (unrevDown) line = reasonMap.get(uid) ? `"${reasonMap.get(uid)}"` : (lastParentMap.get(uid) ?? "").slice(0, 60);
    else line = `${(r.parent_msgs as number) ?? 0} messages · W${r.week ?? "?"} D${r.day ?? "?"} · 👍 ${(r.ups as number) ?? 0}`;
    return {
      userId: uid, parent: (nm?.parent_name ?? "").trim().split(/\s+/)[0] || "Parent",
      child: nm?.child_name ?? "—", kind, line, lastAt: new Date(r.last_at as string),
      needsLook: unrevSafety || unrevDown,
      // carried for filtering:
      ...( { _safetyN: safetyN, _downN: downN } as object ),
    } as CoachThreadRow & { _safetyN: number; _downN: number };
  });

  if (filter === "needs_look") rows = rows.filter((r) => r.needsLook);
  else if (filter === "safety") rows = rows.filter((r) => (r as unknown as { _safetyN: number })._safetyN > 0);
  else if (filter === "thumbsdown") rows = rows.filter((r) => (r as unknown as { _downN: number })._downN > 0);

  rows.sort((a, b) => (a.needsLook === b.needsLook ? b.lastAt.getTime() - a.lastAt.getTime() : a.needsLook ? -1 : 1));
  return rows;
}

export type CoachThreadMsg = { id: string; role: string; content: string; source: string | null; week: number | null; day: number | null; feedback: number | null; feedbackReason: string | null; safetyFlag: boolean; outputTokens: number | null; costPaise: number | null; createdAt: Date };
export type CoachThreadDetail = {
  userId: string; parent: string; child: string; archetype: string; ageBand: string; tier: string | null;
  week: number | null; day: number | null;
  messages: CoachThreadMsg[];
  facts: string[]; summary: string; note: string;
  usedToday: number; totalParent: number; daysDone: number; lastActive: Date | null;
};

export async function getCoachThreadDetail(userId: string): Promise<CoachThreadDetail | null> {
  const sql = getSql();
  const info = (await sql`
    SELECT a.parent_name, a.child_name, a.archetype, a.age_band, p.tier
    FROM purchases p JOIN assessments a ON a.id = p.assessment_id
    WHERE p.user_id = ${userId} AND p.status='paid' ORDER BY p.created_at DESC LIMIT 1
  `) as unknown as { parent_name: string | null; child_name: string | null; archetype: string | null; age_band: string | null; tier: string | null }[];
  if (info.length === 0) return null;
  const i = info[0];

  const messages = (await sql`
    SELECT id, role, content, source, week, day, feedback, feedback_reason, safety_flag, output_tokens, cost_paise, created_at
    FROM coach_messages WHERE user_id = ${userId} ORDER BY created_at ASC
  `) as unknown as Record<string, unknown>[];
  const mem = (await sql`SELECT facts, summary FROM coach_memory WHERE user_id = ${userId}`) as unknown as { facts: string[]; summary: string }[];
  const note = (await sql`SELECT note FROM coach_team_notes WHERE user_id = ${userId}`) as unknown as { note: string }[];
  const [today] = (await sql`SELECT COUNT(*)::int c FROM coach_messages WHERE user_id=${userId} AND role='parent' AND (created_at AT TIME ZONE 'Asia/Kolkata')::date=(now() AT TIME ZONE 'Asia/Kolkata')::date`) as unknown as { c: number }[];
  const [total] = (await sql`SELECT COUNT(*)::int c FROM coach_messages WHERE user_id=${userId} AND role='parent'`) as unknown as { c: number }[];
  const [days] = (await sql`SELECT COUNT(*)::int c FROM lms_progress WHERE user_id=${userId} AND day BETWEEN 1 AND 5`) as unknown as { c: number }[];

  const last = messages.length ? new Date(messages[messages.length - 1].created_at as string) : null;
  const latestWeek = messages.length ? (messages[messages.length - 1].week as number | null) : null;
  const latestDay = messages.length ? (messages[messages.length - 1].day as number | null) : null;

  return {
    userId, parent: (i.parent_name ?? "").trim().split(/\s+/)[0] || "Parent", child: i.child_name ?? "—",
    archetype: i.archetype ?? "", ageBand: i.age_band ?? "", tier: i.tier, week: latestWeek, day: latestDay,
    messages: messages.map((m) => ({
      id: m.id as string, role: m.role as string, content: m.content as string, source: m.source as string | null,
      week: m.week as number | null, day: m.day as number | null, feedback: m.feedback as number | null,
      feedbackReason: m.feedback_reason as string | null, safetyFlag: !!m.safety_flag,
      outputTokens: m.output_tokens as number | null, costPaise: m.cost_paise as number | null, createdAt: new Date(m.created_at as string),
    })),
    facts: Array.isArray(mem[0]?.facts) ? mem[0].facts : [], summary: mem[0]?.summary ?? "", note: note[0]?.note ?? "",
    usedToday: today?.c ?? 0, totalParent: total?.c ?? 0, daysDone: days?.c ?? 0, lastActive: last,
  };
}
