// Per-call phone script for the Parents panel. GET = cached-or-generate; POST = regenerate.
// Admin-only (middleware Basic Auth). "Who I am" = the Basic-Auth username (the logged-in caller).
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { personKey } from "@/lib/admin/call-queue";
import { QUESTIONS_BY_ID } from "@/lib/engine/questions";
import { worryLabel } from "@/lib/admin/crm/logic";
import { generateCallScript, type GenerateInput } from "@/lib/call-script/generate";
import type { Lang } from "@/lib/call-script/types";

export const dynamic = "force-dynamic";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 300 * (i + 1))); } }
  throw last;
}

function caller(req: NextRequest): string {
  const auth = req.headers.get("authorization") ?? "";
  try { const d = atob(auth.replace(/^Basic\s+/i, "")); const u = d.slice(0, d.indexOf(":")); return u.trim() || "Admin"; } catch { return "Admin"; }
}
// Caller gender → correct Hinglish self-forms (rahi/raha hoon). Unknown → neutral. Extend as the team grows.
const CALLER_GENDER: Record<string, "f" | "m" | "n"> = { shaily: "f", shalini: "f", neha: "f", shashank: "m", admin: "n" };
const genderOf = (name: string): "f" | "m" | "n" => CALLER_GENDER[name.trim().toLowerCase()] ?? "n";
const daysAgo = (iso: string) => Math.max(0, Math.round((Date.now() - +new Date(iso)) / 86_400_000));
const istDateTime = (s: string) => new Date(s).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const KEY_ANSWERS = ["G3", "D2.1", "D3.1", "G1", "G2"]; // instinct, motivator, obstacle, focus shape, competition

// Operators sometimes jot clinical terms in notes. The script must never carry them (the user's rule),
// so drop any sentence that mentions one before the note reaches the model or the fallback.
const CLINICAL_RE = /\b(adhd|a\.d\.h\.d|autis\w*|asperger\w*|dyslex\w*|dyscalc\w*|disorder|diagnos\w*|syndrome|spectrum|neurodiverg\w*|therap\w*|psychiatr\w*|psycholog\w*|medicat\w*|symptom\w*)\b/i;
function scrubClinical(text: string | null | undefined): string {
  if (!text) return "";
  const kept = text.split(/(?<=[.!?])\s+/).filter((sent) => !CLINICAL_RE.test(sent));
  return kept.join(" ").trim();
}

async function buildContext(sessionId: string, lang: Lang, callerName: string, callerGender: "f" | "m" | "n") {
  const sql = getSql();
  const arows = (await sql`
    SELECT a.id::text, a.session_id::text, a.phone, a.email, a.parent_name, a.child_name, a.age_band,
           a.archetype, a.concerns, a.created_at, a.answers, a.report_v2_goal
    FROM assessments a WHERE a.session_id = ${sessionId}::uuid LIMIT 1
  `) as unknown as { id: string; session_id: string; phone: string | null; email: string | null; parent_name: string | null; child_name: string | null; age_band: string | null; archetype: string | null; concerns: string[] | null; created_at: string; answers: Record<string, unknown> | null; report_v2_goal: string | null }[];
  const a = arows[0];
  if (!a) return null;
  const pkey = personKey(a.phone, a.email) ?? `a:${a.id}`;

  // All of this person's assessments → full call history (matches the desk grouping).
  const all = (await sql`SELECT id::text, phone, email FROM assessments WHERE phone IS NOT NULL OR email IS NOT NULL`) as unknown as { id: string; phone: string | null; email: string | null }[];
  const myIds = all.filter((x) => (personKey(x.phone, x.email) ?? "") === pkey).map((x) => x.id);
  const ids = myIds.length ? myIds : [a.id];
  const calls = (await sql`SELECT outcome, notes, next_steps, created_at FROM call_log WHERE assessment_id = ANY(${ids}::uuid[]) ORDER BY created_at DESC`) as unknown as { outcome: string; notes: string | null; next_steps: string | null; created_at: string }[];
  const callNo = calls.length + 1;
  const kind = calls.length === 0 ? "first" : "followup";

  // Report talking points.
  const cr = (await sql`SELECT content FROM report_v2_content WHERE session_id = ${sessionId}::uuid LIMIT 1`) as unknown as { content: Record<string, unknown> }[];
  const c = cr[0]?.content ?? null;
  const str = (k: string) => (c && typeof c[k] === "string" ? (c[k] as string) : "");
  const sw = (c?.switch ?? {}) as Record<string, unknown>;
  const report = c ? { seenIt: str("seenIt") || str("headline"), hardPart: str("hardPart"), tryLine: typeof sw.try === "string" ? sw.try : "", tonight: Array.isArray(c.tonight) ? (c.tonight as string[]) : [], goal: str("goal") } : null;

  // Answers summary (a few key ones → plain Q — A).
  const ans = a.answers ?? {};
  const answersSummary = KEY_ANSWERS.map((qid) => {
    const q = QUESTIONS_BY_ID.get(qid); const v = ans[qid];
    if (!q || v == null) return null;
    const opt = q.options.find((o) => o.value === v);
    return `  • ${q.text.replace(/\{name\}/g, a.child_name || "your child")} — ${opt ? opt.label : String(v)}`;
  }).filter(Boolean).join("\n");

  // trial eligibility + "since" journey.
  const paid = ((await sql`SELECT 1 FROM purchases WHERE assessment_id = ANY(${ids}::uuid[]) AND status='paid' LIMIT 1`) as unknown as unknown[]).length > 0;
  const trialed = ((await sql`SELECT 1 FROM coach_trials WHERE session_id = ${sessionId}::uuid LIMIT 1`) as unknown as unknown[]).length > 0;
  const sinceAnchor = calls[0]?.created_at ?? a.created_at;
  const planDays = (await sql`
    SELECT count(DISTINCT (fe.created_at AT TIME ZONE 'Asia/Kolkata')::date)::int c
    FROM funnel_events fe LEFT JOIN flow_sessions fs ON fs.session_id = fe.session_id
    WHERE fe.session_id = ${sessionId}::uuid AND fe.event_type='plan_v2_view'
      AND COALESCE(fs.is_internal,false)=false
      AND NOT EXISTS (SELECT 1 FROM admin_view_log av WHERE av.session_id = fe.session_id AND av.kind='plan')
      AND fe.created_at > ${sinceAnchor}::timestamptz
  `) as unknown as { c: number }[];
  const sinceBits: string[] = [];
  if (planDays[0]?.c) sinceBits.push(`opened the plan page on ${planDays[0].c} day${planDays[0].c > 1 ? "s" : ""}`);
  const since = sinceBits.length ? sinceBits.join(", ") : undefined;

  const input: GenerateInput = {
    kind, lang, callNo, caller: callerName, callerGender,
    parent: (a.parent_name || "").split(/\s+/)[0] || "there",
    child: a.child_name || "your child", ageBand: a.age_band || "", worry: worryLabel(a.concerns?.[0] ?? ""),
    archetype: a.archetype || "", assessedDaysAgo: daysAgo(a.created_at),
    report, answersSummary,
    lastCall: calls[0] ? { date: istDateTime(calls[0].created_at), outcome: calls[0].outcome, note: scrubClinical(calls[0].notes), nextSteps: scrubClinical(calls[0].next_steps) } : undefined,
    since, trialEligible: !paid && !trialed,
  };
  const latestActivity = [sinceAnchor, ...(planDays[0]?.c ? [new Date().toISOString()] : [])].sort().pop()!;
  return { input, pkey, assessmentId: a.id, callNo, kind, latestCallAt: calls[0]?.created_at ?? null, latestActivity };
}

async function handle(req: NextRequest, regenerate: boolean) {
  const sp = req.nextUrl.searchParams;
  const sessionId = (sp.get("sessionId") ?? "").trim();
  const lang: Lang = sp.get("lang") === "hinglish" ? "hinglish" : "en";
  if (!UUID_RE.test(sessionId)) return NextResponse.json({ error: "bad_session" }, { status: 400 });

  const sql = getSql();
  const callerName = caller(req);
  const callerGender = genderOf(callerName);
  const ctx = await withRetry(() => buildContext(sessionId, lang, callerName, callerGender));
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // The script is stale if a newer call was logged OR the parent's REPORT was regenerated after it.
  const reportAt = ((await withRetry(() => sql`SELECT created_at FROM report_v2_content WHERE session_id=${sessionId}::uuid ORDER BY created_at DESC LIMIT 1`)) as unknown as { created_at: string }[])[0]?.created_at ?? null;

  // Cache lookup — keyed per caller too (the script says the caller's name + gendered self-forms).
  const cached = (await withRetry(() => sql`SELECT script, source, model, cost_paise, created_at FROM call_script_cache WHERE parent_key=${ctx.pkey} AND call_no=${ctx.callNo} AND lang=${lang} AND caller=${callerName} LIMIT 1`)) as unknown as { script: unknown; source: string; model: string | null; cost_paise: number; created_at: string }[];
  if (cached[0] && !regenerate) {
    const since = +new Date(cached[0].created_at);
    const stale = !!((ctx.latestCallAt && +new Date(ctx.latestCallAt) > since) || (reportAt && +new Date(reportAt) > since));
    return NextResponse.json({ script: cached[0].script, source: cached[0].source, model: cached[0].model, costPaise: cached[0].cost_paise, cachedAt: cached[0].created_at, stale, callNo: ctx.callNo, kind: ctx.kind });
  }

  const r = await generateCallScript(ctx.input);
  await withRetry(() => sql`
    INSERT INTO call_script_cache (parent_key, session_id, assessment_id, call_no, kind, lang, caller, script, source, model, input_tokens, output_tokens, cost_paise, outcome, reason)
    VALUES (${ctx.pkey}, ${sessionId}::uuid, ${ctx.assessmentId}::uuid, ${ctx.callNo}, ${ctx.kind}, ${lang}, ${callerName}, ${JSON.stringify(r.script)}::json, ${r.source}, ${r.model}, ${r.inTok}, ${r.outTok}, ${r.costPaise}, ${r.outcome}, ${r.reason})
    ON CONFLICT (parent_key, call_no, lang, caller) DO UPDATE SET
      script=EXCLUDED.script, source=EXCLUDED.source, model=EXCLUDED.model, input_tokens=EXCLUDED.input_tokens,
      output_tokens=EXCLUDED.output_tokens, cost_paise=EXCLUDED.cost_paise, outcome=EXCLUDED.outcome, reason=EXCLUDED.reason, updated_at=now(), created_at=now()
  `);
  return NextResponse.json({ script: r.script, source: r.source, model: r.model, costPaise: r.costPaise, cachedAt: new Date().toISOString(), stale: false, callNo: ctx.callNo, kind: ctx.kind });
}

export async function GET(req: NextRequest) {
  try { return await handle(req, false); } catch (e) { console.error("[admin/parents/script GET]", e); return NextResponse.json({ error: "failed" }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try { return await handle(req, true); } catch (e) { console.error("[admin/parents/script POST]", e); return NextResponse.json({ error: "failed" }, { status: 500 }); }
}
