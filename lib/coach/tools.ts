// The six Coach tools: structured data WITHOUT regex. The model decides when to call these; the
// server validates every input and writes to the existing stores (outcomes, tracked numbers, call
// list, memory, language pref). A validation failure returns an error string to the model (so it can
// correct) — it never throws into the reply path. Child data (parent words/notes) stays in the DB:
// never logged, never sent to analytics/ads.
import type Anthropic from "@anthropic-ai/sdk";
import { OUTCOMES, TRIGGERS, type Outcome, type Trigger, recordPaidOutcome, recordTrialOutcome } from "@/lib/lms/coach/outcomes";
import { recordTrackedNumber } from "@/lib/coach/numbers";
import { appendMemoryNote, setLanguagePref } from "@/lib/coach/memory";
import { getSql } from "@/lib/db/client";
import { getLmsWeekContent, getDayCard } from "@/lib/lms/content";
import { fillLmsContent } from "@/lib/lms/render";
import { fallbackStep } from "@/lib/plan-adjust/fallback";
import { writeCoachOverride, nextPlanDay } from "@/lib/plan-adjust/resolve";
import type { AdjustedStep } from "@/lib/plan-adjust/types";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";

export type ToolSubject = {
  kind: "paid" | "trial";
  subjectId: string;        // user_id (paid) or trial_id (trial)
  assessmentId: string | null;
  week: number;             // paid week (1 for trial)
  day: number;              // current day
  // Child facts for adjust_next_step (paid only): used to build the base step for the next day.
  archetype?: string;
  ageBand?: string;
  childName?: string;
  childGender?: Gender;
};

// Anthropic tool definitions (JSON Schema inputs).
export const COACH_TOOLS: Anthropic.Tool[] = [
  {
    name: "record_outcome",
    description:
      "Record how a step you gave actually went. Call when the parent reports the result of trying a step. Use 'not_tried' if they haven't tried it yet, had no time, or ask a 'what if' before trying — NEVER 'tried_didnt_work' for those. Do NOT call it for pure venting.",
    input_schema: {
      type: "object",
      properties: {
        value: { type: "string", enum: [...OUTCOMES], description: "tried_worked / tried_partly / tried_didnt_work / missed / not_tried / unclear" },
        parent_words: { type: "string", description: "the parent's own words that reported this, verbatim" },
        trigger: { type: "string", enum: [...TRIGGERS], description: "why the child stopped, IF the parent said: hard / boring / didnt_know / upset / unknown" },
      },
      required: ["value", "parent_words"],
    },
  },
  {
    name: "record_baseline",
    description:
      "Record the agreed starting measure and number, once you and the parent settle on the real thing to watch (e.g. arguments per homework session) and they give a starting number.",
    input_schema: {
      type: "object",
      properties: {
        metric: { type: "string", description: "short machine-ish name of the measure, e.g. 'arguments_per_session'" },
        min: { type: "number", description: "low end of the number the parent said (= max for a single number)" },
        max: { type: "number", description: "high end; if they said '4 or 5', min=4 max=5" },
        unit: { type: "string", description: "optional plain unit, e.g. 'arguments', 'minutes'" },
        parent_words: { type: "string", description: "the parent's exact words, e.g. 'maybe 4 or 5'" },
      },
      required: ["metric", "min", "max", "parent_words"],
    },
  },
  {
    name: "record_number",
    description: "Record a later count the parent gives for the SAME measure as the baseline (e.g. '2 today'). Never a number they didn't say.",
    input_schema: {
      type: "object",
      properties: {
        metric: { type: "string" },
        min: { type: "number" },
        max: { type: "number" },
        unit: { type: "string" },
        parent_words: { type: "string" },
      },
      required: ["metric", "min", "max", "parent_words"],
    },
  },
  {
    name: "set_language",
    description: "Switch the reply language when the parent switches or asks for one. After this, reply fully in that language and keep it.",
    input_schema: {
      type: "object",
      properties: { lang: { type: "string", enum: ["en", "hinglish", "hi"] } },
      required: ["lang"],
    },
  },
  {
    name: "flag_for_call",
    description: "Ask our human team to call this parent. urgency 'urgent' for medical/safety worries; 'normal' when they're stuck or worn out and a person could help.",
    input_schema: {
      type: "object",
      properties: {
        urgency: { type: "string", enum: ["urgent", "normal"] },
        reason: { type: "string", description: "short reason (no diagnosis), for the team's calling list" },
      },
      required: ["urgency", "reason"],
    },
  },
  {
    name: "note_for_memory",
    description: "Save one short durable note to remember next time (what was tried, what happened, the child's triggers, the parent's constraints). Never medical or safety details.",
    input_schema: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
    },
  },
  {
    name: "adjust_next_step",
    description:
      "Change the parent's NEXT plan day when you and they have agreed a better version of the step — smaller, a different moment, or different wording. Only call this AFTER you've understood what went wrong. The parent will see 'Updated by your Coach: <reason>' on that day. Give the full step so it stands on its own. Keep the same skill and week; ≤5 minutes; plain words; no clinical terms, no promises, no invented numbers.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "one short line the parent will see, e.g. 'we're trying the warning before a new level starts'" },
        step_patch: {
          type: "object",
          description: "the fields of the next step to change (anything you omit keeps the base step's version)",
          properties: {
            title: { type: "string" },
            moment: { type: "string", description: "the everyday moment, e.g. 'at screen-off'" },
            exact_words: { type: "array", items: { type: "string" }, description: "1–2 lines the parent says, verbatim" },
            notice: { type: "string", description: "what to watch for" },
            minutes: { type: "number", description: "1 to 5" },
          },
        },
      },
      required: ["reason", "step_patch"],
    },
  },
];

export type ToolCallRecord = { name: string; input: unknown; ok: boolean; detail: string };

// Execute one tool call. Returns a short result string for the model + a record for logging/evals.
export async function runCoachTool(subject: ToolSubject, name: string, input: Record<string, unknown>): Promise<ToolCallRecord> {
  try {
    switch (name) {
      case "record_outcome": {
        const value = String(input.value ?? "");
        if (!(OUTCOMES as readonly string[]).includes(value)) return bad(name, input, `invalid value '${value}'`);
        const note = typeof input.parent_words === "string" ? input.parent_words.slice(0, 200) : null;
        const trigger = (TRIGGERS as readonly string[]).includes(String(input.trigger)) ? (input.trigger as Trigger) : null;
        // source='model' — the Coach decided to record this (vs the server-side 'backstop').
        if (subject.kind === "paid") await recordPaidOutcome(subject.subjectId, subject.week, subject.day, value as Outcome, note, "model", trigger);
        else await recordTrialOutcome(subject.subjectId, subject.day, value as Outcome, note, "model", trigger);
        return ok(name, input, `outcome ${value}${trigger ? ` (trigger ${trigger})` : ""} recorded for day ${subject.day}`);
      }
      case "record_baseline":
      case "record_number": {
        const metric = String(input.metric ?? "").trim();
        const min = Number(input.min), max = Number(input.max);
        if (!metric) return bad(name, input, "missing metric");
        if (!Number.isFinite(min) || !Number.isFinite(max)) return bad(name, input, "min/max must be numbers you were told — never invent one");
        if (max < min) return bad(name, input, "max < min");
        const phase = name === "record_baseline" ? "baseline" : "checkin";
        await recordTrackedNumber(subject.kind, subject.subjectId, {
          metric, min, max,
          unit: typeof input.unit === "string" ? input.unit.slice(0, 40) : null,
          parentWords: typeof input.parent_words === "string" ? input.parent_words.slice(0, 160) : null,
          phase, day: phase === "baseline" ? 0 : subject.day,
        });
        return ok(name, input, `${phase} ${metric}=${min === max ? min : `${min}-${max}`} recorded`);
      }
      case "set_language": {
        const lang = String(input.lang ?? "");
        if (!["en", "hinglish", "hi"].includes(lang)) return bad(name, input, `invalid lang '${lang}'`);
        await setLanguagePref(subject.kind, subject.subjectId, lang as "en" | "hinglish" | "hi");
        return ok(name, input, `language set to ${lang}`);
      }
      case "flag_for_call": {
        const urgency = String(input.urgency ?? "");
        if (!["urgent", "normal"].includes(urgency)) return bad(name, input, `invalid urgency '${urgency}'`);
        const reason = typeof input.reason === "string" ? input.reason.slice(0, 200) : "";
        await requestCall(subject.kind, subject.subjectId, subject.assessmentId, urgency as "urgent" | "normal", reason, "coach_flag");
        return ok(name, input, `call flagged (${urgency})`);
      }
      case "note_for_memory": {
        const note = typeof input.note === "string" ? input.note : "";
        if (!note.trim()) return bad(name, input, "empty note");
        await appendMemoryNote(subject.kind, subject.subjectId, note);
        return ok(name, input, "noted");
      }
      case "adjust_next_step": {
        // Paid only — the trial has a fixed 4-day quick start, not the adjustable plan.
        if (subject.kind !== "paid") return bad(name, input, "the adjustable plan is only on the full plan, not the trial");
        const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 160) : "";
        if (!reason) return bad(name, input, "a short reason is required (the parent sees it)");
        if (!subject.archetype || !subject.ageBand || !subject.childName) return bad(name, input, "missing child context");

        const target = nextPlanDay(subject.week, subject.day);
        if (!target) return bad(name, input, "there is no next day to adjust");

        // Base step for the NEXT day → merge the coach's patch → validate on write.
        const content = getLmsWeekContent(subject.archetype, target.week, subject.ageBand as AgeBand);
        const dayCard = content ? getDayCard(content, target.day) : null;
        if (!dayCard) return bad(name, input, "could not load the next day's base step");
        const fill = (s: string) => fillLmsContent(s, subject.childName!, subject.childGender ?? null);
        const baseTitle = fill(dayCard.title);
        const baseText = fill(dayCard.content[subject.ageBand as AgeBand] ?? "");
        const base = fallbackStep(baseTitle, baseText);

        const patch = (input.step_patch ?? {}) as Record<string, unknown>;
        const merged: AdjustedStep = {
          title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim() : base.title,
          moment: typeof patch.moment === "string" && patch.moment.trim() ? patch.moment.trim() : base.moment,
          exactWords: Array.isArray(patch.exact_words) && patch.exact_words.length
            ? patch.exact_words.map((w) => String(w).trim()).filter(Boolean)
            : base.exactWords,
          notice: typeof patch.notice === "string" && patch.notice.trim() ? patch.notice.trim() : base.notice,
          minutes: Number.isFinite(Number(patch.minutes)) ? Number(patch.minutes) : base.minutes,
        };

        const res = await writeCoachOverride({
          userId: subject.subjectId, assessmentId: subject.assessmentId,
          week: target.week, day: target.day, step: merged, reason, baseText,
        });
        if (!res.ok) return bad(name, input, `step not saved (${res.issue ?? "invalid"}) — do NOT tell the parent it's updated`);
        return ok(name, input, `next step (Week ${target.week} Day ${target.day}) updated for the parent`);
      }
      default:
        return bad(name, input, "unknown tool");
    }
  } catch (e) {
    return bad(name, input, `error: ${(e as Error).message}`);
  }
}

function ok(name: string, input: unknown, detail: string): ToolCallRecord { return { name, input, ok: true, detail }; }
function bad(name: string, input: unknown, detail: string): ToolCallRecord { return { name, input, ok: false, detail }; }

// Queue a call request in coach_call_request (covers trial + paid; keyed kind+subject_id). Deduped:
// one OPEN request of the same urgency per subject at a time, so we never stack duplicates. Shared by
// the flag_for_call tool and the paid "needs a call" rule (source distinguishes them).
export async function requestCall(
  kind: "paid" | "trial", subjectId: string, assessmentId: string | null,
  urgency: "urgent" | "normal", reason: string, source: "coach_flag" | "needs_a_call",
): Promise<void> {
  const sql = getSql();
  const existing = (await sql`
    SELECT 1 FROM coach_call_request WHERE kind = ${kind} AND subject_id = ${subjectId}
      AND urgency = ${urgency} AND status = 'open' LIMIT 1
  `) as unknown as unknown[];
  if (existing.length > 0) return;
  await sql`
    INSERT INTO coach_call_request (kind, subject_id, assessment_id, urgency, reason, source)
    VALUES (${kind}, ${subjectId}, ${assessmentId ? assessmentId : null}, ${urgency}, ${reason}, ${source})
  `;
}
