// Glue the routes share: build a normalised CoachSubjectInput (trial + paid), generate/cache the
// speak-first opener (once per parent per day), and stream a coaching turn as JSON lines while
// persisting messages + updating memory. Keeps the three routes thin.
import { getSql } from "@/lib/db/client";
import { readCachedReportV2 } from "@/lib/report-v2/service";
import { archetypeDesc, composeFallback } from "@/content/report-v2/fallbacks";
import { CONCERN_CARD_LABELS } from "@/lib/concerns";
import { ENTITY } from "@/lib/entity";
import { fillLmsContent } from "@/lib/lms/render";
import { resolveTrialDays } from "@/lib/coach-trial/content";
import { buildCoachContext } from "@/lib/lms/coach/context";
import type { LmsUserContext } from "@/lib/lms/user-context";
import type { CoachTrial } from "@/lib/coach-trial/trial";
import type { AgeBand } from "@/content/types";
import { assembleCoachContext, type CoachSubjectInput, type AssembledContext } from "@/lib/coach/context";
import { runCoachTurn } from "@/lib/coach/engine";
import { summariseParentMemory } from "@/lib/coach/memory";
import { isShortNonAnswer } from "@/lib/coach/lang";
import { extractOutcome, readOutcomes, recordPaidOutcome, recordTrialOutcome } from "@/lib/lms/coach/outcomes";
import type { ToolCallRecord } from "@/lib/coach/tools";
import type { CoachTurn } from "@/lib/lms/coach/llm";

// Deterministic backstop: if the parent's message reports how a step went but the model didn't call
// record_outcome, record it server-side from the parent's OWN words (extractOutcome, never invented),
// once per day. Guarantees an outcome report is never silently dropped.
async function outcomeBackstop(key: OpenerKey, subject: CoachSubjectInput, userMessage: string, toolCalls: ToolCallRecord[]): Promise<void> {
  if (toolCalls.some((t) => t.name === "record_outcome" && t.ok)) return;
  const ex = extractOutcome(userMessage);
  if (!ex) return;
  // Positives are only backstopped from the parent's OWN clear words, and NEVER when the message also
  // carries distress/venting — so "she started crying" / "nothing works, I'm tired" can't become a
  // positive. Negatives / missed / not_tried always backstop (they matter for follow-up).
  const positive = ex.outcome === "tried_worked" || ex.outcome === "tried_partly";
  if (positive && /\b(cried|crying|tired|exhausted|nothing works|threw|upset|can'?t cope|fed up|overwhelm|hate|angry)\b/i.test(userMessage)) return;
  const prior = await readOutcomes(key.kind, subject.subjectId).catch(() => []);
  if (prior.some((o) => o.day === key.day)) return;
  // source='backstop' — recorded by the server because the model didn't; kept separable in stats.
  if (key.kind === "trial" && key.trialId) await recordTrialOutcome(key.trialId, key.day, ex.outcome, ex.note, "backstop");
  else if (key.kind === "paid") await recordPaidOutcome(key.userId, subject.week, key.day, ex.outcome, ex.note, "backstop");
}

// The Coach's previous reply + whether this is a repeat-risk turn — fed to the engine's no-repeat backstop.
function repeatGuardFor(history: CoachTurn[], userMessage: string): { previousReply?: string; guardRepeat: boolean } {
  const previousReply = [...history].reverse().find((h) => h.role === "assistant")?.content;
  return { previousReply, guardRepeat: isShortNonAnswer(userMessage) };
}

// Inputs for the engine's Hindi-language backstop: the child's gender (for verb agreement) + whether
// the parent has ever used "tu" or an emoji (so the Coach may mirror them).
function hindiGuardFor(subject: CoachSubjectInput, history: CoachTurn[], userMessage: string) {
  const parentMsgs = [...history.filter((h) => h.role === "user").map((h) => h.content), userMessage];
  const parentUsedTu = parentMsgs.some((m) => /(^|[^a-z])(tu|tujhe|tera|teri|tere)([^a-z]|$)/i.test(m));
  const parentUsedEmoji = parentMsgs.some((m) => /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(m));
  return { childGender: subject.childGender, parentUsedTu, parentUsedEmoji };
}

// ── Subject builders ───────────────────────────────────────────────────────────────
export async function buildTrialSubject(trial: CoachTrial, userCtx: LmsUserContext, day: number): Promise<CoachSubjectInput> {
  const sql = getSql();
  const sessionId = trial.session_id ?? "";
  const report = sessionId ? await readCachedReportV2(sql, sessionId).catch(() => null) : null;
  const rows = (await sql`SELECT parent_name FROM assessments WHERE session_id = ${sessionId}::uuid LIMIT 1`) as unknown as { parent_name: string | null }[];
  const parentFirst = (rows[0]?.parent_name ?? "").trim().split(/\s+/)[0] || "there";

  const cards = await resolveTrialDays({
    sessionId, archetype: userCtx.archetype, ageBand: userCtx.ageBand as AgeBand,
    childName: userCtx.childName, gender: userCtx.childGender,
  });
  const today = cards[Math.min(Math.max(day, 1), 4) - 1];
  const stepSourceRaw = today?.source === "report"
    ? [today.instead ? `Instead of: ${today.instead}` : "", today.say ? `Try: ${today.say}` : "", ...(today.steps ?? [])].filter(Boolean).join(" ")
    : (today?.body ?? "");

  const worryKey = trial.worry ?? userCtx.weakestTwo?.[0] ?? null;
  const worryLabel = (worryKey && CONCERN_CARD_LABELS[worryKey]) || report?.worryLabel || "staying focused";
  const hardPartRaw = report?.hardPart
    || composeFallback(userCtx.archetype, worryKey ?? "", userCtx.childName, userCtx.childGender).hardPart;

  return {
    kind: "trial", subjectId: trial.id, assessmentId: userCtx.assessmentId ?? null,
    mode: "trial", parentFirst, child: userCtx.childName, childGender: userCtx.childGender,
    ageBand: userCtx.ageBand, archetype: userCtx.archetype, worryKey, worryLabel,
    parentPattern: userCtx.parentPattern,
    hardPartRaw, archetypeDescRaw: archetypeDesc(userCtx.archetype, userCtx.childName, userCtx.childGender),
    stepSourceRaw, stepTitleRaw: today?.title ?? "", supportEmail: ENTITY.supportEmail, week: 1, day,
  };
}

export async function buildPaidSubject(ctx: LmsUserContext, message: string): Promise<CoachSubjectInput> {
  const sql = getSql();
  // Reuse the (LLM-free) position/step assembly; discard its old system string.
  const old = await buildCoachContext(ctx, "coach", undefined, message);
  const rows = (await sql`
    SELECT a.parent_name, a.session_id::text AS session_id, a.concerns
    FROM assessments a JOIN purchases p ON p.assessment_id = a.id
    WHERE p.user_id = ${ctx.userId} AND p.status = 'paid' ORDER BY p.created_at DESC LIMIT 1
  `) as unknown as { parent_name: string | null; session_id: string; concerns: string[] | null }[];
  const r = rows[0];
  const parentFirst = (r?.parent_name ?? "").trim().split(/\s+/)[0] || old.parent || "there";
  const report = r?.session_id ? await readCachedReportV2(sql, r.session_id).catch(() => null) : null;
  const worryKey = (r?.concerns ?? [])[0] ?? null;
  const worryLabel = report?.worryLabel || (worryKey && CONCERN_CARD_LABELS[worryKey]) || "staying focused";
  const hardPartRaw = report?.hardPart || composeFallback(ctx.archetype, worryKey ?? "", ctx.childName, ctx.childGender).hardPart;

  return {
    kind: "paid", subjectId: ctx.userId, assessmentId: ctx.assessmentId ?? null,
    mode: "paid", parentFirst, child: ctx.childName, childGender: ctx.childGender,
    ageBand: ctx.ageBand, archetype: ctx.archetype, worryKey, worryLabel,
    parentPattern: ctx.parentPattern,
    hardPartRaw, archetypeDescRaw: archetypeDesc(ctx.archetype, ctx.childName, ctx.childGender),
    stepSourceRaw: fillLmsContent(old.dayText, ctx.childName, ctx.childGender), stepTitleRaw: old.tonightStep,
    supportEmail: ENTITY.supportEmail, week: old.week, day: old.day,
  };
}

// ── Opener (cached once per parent per day) ──────────────────────────────────────────
type OpenerKey = { kind: "paid" | "trial"; userId: string; trialId: string | null; day: number };

export async function getOrCreateOpener(subject: CoachSubjectInput, key: OpenerKey, regenerate = false): Promise<{ text: string; messageId: string | null }> {
  const sql = getSql();
  const existing = key.trialId
    ? (await sql`SELECT id, content FROM coach_messages WHERE trial_id=${key.trialId}::uuid AND origin='opener' AND day=${key.day} ORDER BY created_at DESC LIMIT 1`)
    : (await sql`SELECT id, content FROM coach_messages WHERE user_id=${key.userId} AND trial_id IS NULL AND origin='opener' AND day=${key.day} ORDER BY created_at DESC LIMIT 1`);
  const rows = existing as unknown as { id: string; content: string }[];
  if (rows[0] && !regenerate) return { text: rows[0].content, messageId: rows[0].id };

  // Had any prior conversation this run? → ask how the last step went before anything new.
  const priorCount = key.trialId
    ? ((await sql`SELECT count(*)::int c FROM coach_messages WHERE trial_id=${key.trialId}::uuid AND role='parent'`) as unknown as { c: number }[])[0].c
    : ((await sql`SELECT count(*)::int c FROM coach_messages WHERE user_id=${key.userId} AND trial_id IS NULL AND role='parent'`) as unknown as { c: number }[])[0].c;

  const ctx: AssembledContext = await assembleCoachContext(subject, "");
  const instruction = (subject.day <= 1 && priorCount === 0)
    ? `(${subject.parentFirst} just opened the app for the first time. Greet them warmly in ONE short message and begin by asking, in their own words, what usually happens — do not give a step yet.)`
    : `(${subject.parentFirst} just opened the app for day ${subject.day}. Greet them briefly and ask how the last step went BEFORE anything new. One short message. Do not give a new step yet.)`;

  const res = await runCoachTurn({
    system: ctx.system, history: ctx.history, userMessage: instruction, tools: [],
    toolSubject: ctx.toolSubject, language: ctx.language, maxTokens: 200,
  });
  const ins = key.trialId
    ? (await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, model, input_tokens, output_tokens, cost_paise)
         VALUES (${key.userId}, ${key.trialId}::uuid, 'coach', ${res.text}, 'coach', 'opener', ${key.day}, ${res.model}, ${res.inputTokens}, ${res.outputTokens}, ${res.costPaise}) RETURNING id`)
    : (await sql`INSERT INTO coach_messages (user_id, role, content, source, origin, day, model, input_tokens, output_tokens, cost_paise)
         VALUES (${key.userId}, 'coach', ${res.text}, 'coach', 'opener', ${key.day}, ${res.model}, ${res.inputTokens}, ${res.outputTokens}, ${res.costPaise}) RETURNING id`);
  const id = (ins as unknown as { id: string }[])[0]?.id ?? null;
  return { text: res.text, messageId: id };
}

// Persist the parent message + the coach reply; returns the coach message id.
async function persistTurn(k: OpenerKey, userMessage: string, res: { text: string; model: string; inputTokens: number; outputTokens: number; costPaise: number }): Promise<string | null> {
  const sql = getSql();
  if (k.trialId) {
    await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day) VALUES (${k.userId}, ${k.trialId}::uuid, 'parent', ${userMessage}, 'coach', 'llm', ${k.day})`;
    const ins = await sql`INSERT INTO coach_messages (user_id, trial_id, role, content, source, origin, day, model, input_tokens, output_tokens, cost_paise) VALUES (${k.userId}, ${k.trialId}::uuid, 'coach', ${res.text}, 'coach', 'llm', ${k.day}, ${res.model}, ${res.inputTokens}, ${res.outputTokens}, ${res.costPaise}) RETURNING id`;
    return (ins as unknown as { id: string }[])[0]?.id ?? null;
  }
  await sql`INSERT INTO coach_messages (user_id, role, content, source, origin, day) VALUES (${k.userId}, 'parent', ${userMessage}, 'coach', 'llm', ${k.day})`;
  const ins = await sql`INSERT INTO coach_messages (user_id, role, content, source, origin, day, model, input_tokens, output_tokens, cost_paise) VALUES (${k.userId}, 'coach', ${res.text}, 'coach', 'llm', ${k.day}, ${res.model}, ${res.inputTokens}, ${res.outputTokens}, ${res.costPaise}) RETURNING id`;
  return (ins as unknown as { id: string }[])[0]?.id ?? null;
}

// Non-streaming turn (paid UI expects JSON). Same engine, persistence and memory as the streaming path.
export async function jsonCoachTurn(args: PersistArgs): Promise<{ reply: string; messageId: string | null; costPaise: number; errored: boolean }> {
  const res = await runCoachTurn({
    system: args.ctx.system, history: args.ctx.history, userMessage: args.userMessage,
    tools: args.ctx.tools, toolSubject: args.ctx.toolSubject, language: args.ctx.language, model: args.model,
    ...repeatGuardFor(args.ctx.history, args.userMessage),
    ...{ hindiGuard: hindiGuardFor(args.subject, args.ctx.history, args.userMessage) },
  });
  const messageId = await persistTurn(args.key, args.userMessage, res);
  await outcomeBackstop(args.key, args.subject, args.userMessage, res.toolCalls).catch(() => {});
  if (args.onDone) await args.onDone({ text: res.text, errored: res.errored, toolNames: res.toolCalls.map((t) => t.name) });
  summariseParentMemory(args.key.kind, args.subject.subjectId).catch(() => {});
  return { reply: res.text, messageId, costPaise: res.costPaise, errored: res.errored };
}

// ── Streaming turn ───────────────────────────────────────────────────────────────────
export type PersistArgs = {
  ctx: AssembledContext;
  subject: CoachSubjectInput;
  userMessage: string;
  key: OpenerKey;              // reuse for user/trial ids + day
  model?: string;
  onDone?: (info: { text: string; errored: boolean; toolNames: string[] }) => Promise<void> | void;
};

// Returns a streaming Response: JSON lines {"delta":"…"} then a final {"done":{…}}.
export function streamCoachTurn(args: PersistArgs): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(JSON.stringify(obj) + "\n"));
      try {
        const res = await runCoachTurn({
          system: args.ctx.system, history: args.ctx.history, userMessage: args.userMessage,
          tools: args.ctx.tools, toolSubject: args.ctx.toolSubject, language: args.ctx.language,
          model: args.model, onDelta: (t) => send({ delta: t }),
          ...repeatGuardFor(args.ctx.history, args.userMessage),
    ...{ hindiGuard: hindiGuardFor(args.subject, args.ctx.history, args.userMessage) },
        });
        // Persist parent + coach messages.
        const messageId = await persistTurn(args.key, args.userMessage, res);
        await outcomeBackstop(args.key, args.subject, args.userMessage, res.toolCalls).catch(() => {});
        if (args.onDone) await args.onDone({ text: res.text, errored: res.errored, toolNames: res.toolCalls.map((t) => t.name) });
        send({ done: { messageId, costPaise: res.costPaise, errored: res.errored, tools: res.toolCalls.map((t) => ({ name: t.name, ok: t.ok })) } });
      } catch (e) {
        console.error("[coach/runtime] stream failed:", (e as Error).message);
        send({ done: { messageId: null, errored: true } });
      } finally {
        controller.close();
        // Memory summarisation after the turn (best-effort, never blocks the reply).
        summariseParentMemory(args.key.kind, args.subject.subjectId).catch(() => {});
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
