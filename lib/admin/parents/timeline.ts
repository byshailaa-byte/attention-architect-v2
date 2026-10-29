import "server-only";
import { getSql } from "@/lib/db/client";
import type { TlEvent, TlSource, TimelineResult, TlVisit } from "./timeline-types";

// ── Parent timeline: one merged, de-noised feed per parent from every source we actually track.
// Site events are attached ONLY via the parent's own assessment session_ids (so a shared device /
// anon_id never pulls in another parent). WhatsApp matches by normalised phone. Internal sessions and
// operator/admin-view rows are never included (that log table is never queried here). Grouped by day → by visit (new visit on a new
// session_id OR a >30-min gap). Honest: approximate values are flagged `approx` ("~") in the UI.

const CAP_MS = 300_000;            // per-card dwell cap (5 min)
const VISIT_GAP_MS = 30 * 60_000;  // >30 min → new visit
const PAGE = 100;

export type TimelineInput = {
  assessments: { id: string; sessionId: string; childName: string; createdAt: string }[];
  phone: string | null;
  multiChild: boolean;
};

const istKey = (s: string) => new Date(s).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const istDayLabel = (s: string) => new Date(s).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).toUpperCase().replace(/,/g, "");
const istTime = (s: string) => new Date(s).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }).toLowerCase();
// Normalise a phone to its last 10 digits so +91, a leading 0, and spaces all match one parent
// (the same grouping the desk uses). Exported for the test.
export const normalizePhoneCore = (p: string | null) => (p ?? "").replace(/\D/g, "").slice(-10);
const last10 = normalizePhoneCore;
const mkEvent = (e: Partial<TlEvent> & { t: string; source: TlSource; icon: string; title: string }): TlEvent => ({
  id: `${e.source}:${e.t}:${Math.round(Math.random() * 1e6)}`, timeLabel: istTime(e.t),
  dayKey: istKey(e.t), dayLabel: istDayLabel(e.t), ...e,
} as TlEvent);

// Noise events that must collapse into ONE progress row per visit (never one row per question).
const NOISE = new Set(["question_view", "q_answered", "assessment_question_complete", "assessment_dimension_complete",
  "start_age", "start_age_view", "start_worry", "start_child", "start_oob", "start_oob_submit", "start_phone",
  "landing_step_concern", "landing_step_followup", "landing_step_age", "halfway_view", "assessment_intro_view",
  "answer_changed", "view_item", "question_complete"]);
const LEAD = new Set(["generate_lead", "phone_captured", "details_submitted", "handbook_lead", "start_oob_submit"]);

type FeRow = { event_type: string; session_id: string; created_at: string; metadata: Record<string, unknown> | null };

export async function getParentTimeline(input: TimelineInput): Promise<TimelineResult> {
  const sql = getSql();
  const sids = input.assessments.map((a) => a.sessionId).filter(Boolean);
  const aids = input.assessments.map((a) => a.id);
  const childBySession = new Map(input.assessments.map((a) => [a.sessionId, a.childName]));
  const core = last10(input.phone);
  const tag = (sid: string): string | undefined => (input.multiChild ? childBySession.get(sid) : undefined);

  // ── one query per source (internal sessions excluded; admin_view_log never touched) ──
  const [fe, fs, calls, waOut, waIn, trials, purch] = await Promise.all([
    sids.length ? sql`SELECT event_type, session_id::text, created_at, metadata FROM funnel_events fe
       WHERE fe.session_id = ANY(${sids}::uuid[])
         AND NOT EXISTS (SELECT 1 FROM flow_sessions s WHERE s.session_id = fe.session_id AND s.is_internal = true)
       ORDER BY created_at ASC` as unknown as Promise<FeRow[]>
      : Promise.resolve([] as FeRow[]),
    sids.length ? sql`SELECT session_id::text, utm, device, created_at FROM flow_sessions WHERE session_id = ANY(${sids}::uuid[])` as unknown as Promise<{ session_id: string; utm: Record<string, unknown> | null; device: string | null; created_at: string }[]>
      : Promise.resolve([] as { session_id: string; utm: Record<string, unknown> | null; device: string | null; created_at: string }[]),
    aids.length ? sql`SELECT id::text, assessment_id::text, outcome, notes, duration_sec, created_at FROM call_log WHERE assessment_id = ANY(${aids}::uuid[]) ORDER BY created_at ASC` as unknown as Promise<{ id: string; assessment_id: string; outcome: string; notes: string | null; duration_sec: number | null; created_at: string }[]>
      : Promise.resolve([] as { id: string; assessment_id: string; outcome: string; notes: string | null; duration_sec: number | null; created_at: string }[]),
    core ? sql`SELECT kind, template, status, created_at, sent_at, delivered_at, read_at FROM whatsapp_outbox WHERE right(regexp_replace(to_phone, '\\D', '', 'g'), 10) = ${core} ORDER BY created_at ASC` as unknown as Promise<{ kind: string; template: string | null; status: string; created_at: string; sent_at: string | null; delivered_at: string | null; read_at: string | null }[]>
      : Promise.resolve([] as { kind: string; template: string | null; status: string; created_at: string; sent_at: string | null; delivered_at: string | null; read_at: string | null }[]),
    core ? sql`SELECT event_type, created_at FROM wa_events WHERE right(regexp_replace(phone, '\\D', '', 'g'), 10) = ${core} AND event_type = 'inbound' ORDER BY created_at ASC` as unknown as Promise<{ event_type: string; created_at: string }[]>
      : Promise.resolve([] as { event_type: string; created_at: string }[]),
    sids.length ? sql`SELECT id::text, session_id::text, started_at FROM coach_trials WHERE session_id = ANY(${sids}::uuid[])` as unknown as Promise<{ id: string; session_id: string; started_at: string }[]>
      : Promise.resolve([] as { id: string; session_id: string; started_at: string }[]),
    aids.length ? sql`SELECT amount_paise, created_at FROM purchases WHERE assessment_id = ANY(${aids}::uuid[]) AND status = 'paid' ORDER BY created_at ASC` as unknown as Promise<{ amount_paise: number; created_at: string }[]>
      : Promise.resolve([] as { amount_paise: number; created_at: string }[]),
  ]);

  // Coach messages for this parent's trials, grouped into one row per (trial, day).
  const trialIds = trials.map((t) => t.id);
  const coachMsgs = trialIds.length
    ? (await sql`SELECT trial_id::text, day, language, created_at FROM coach_messages WHERE trial_id = ANY(${trialIds}::uuid[]) ORDER BY created_at ASC` as unknown as { trial_id: string; day: number | null; language: string | null; created_at: string }[])
    : [];
  const trialSession = new Map(trials.map((t) => [t.id, t.session_id]));

  const events: TlEvent[] = [];
  const num = (m: Record<string, unknown> | null, k: string) => (m && typeof m[k] === "number" ? (m[k] as number) : null);

  // ── SITE events, per session, with collapse of noise + report-card + lead ──
  const bySession = new Map<string, FeRow[]>();
  for (const r of fe) (bySession.get(r.session_id) ?? bySession.set(r.session_id, []).get(r.session_id)!).push(r);

  // visit assignment over all site+coach rows (session + 30-min gap), chronological
  type Visitable = { sessionId: string; t: string };
  const visitOf = new Map<string, string>(); // `${sessionId}@${t}` → visitId
  const visits: Record<string, TlVisit> = {};

  for (const [sid, rows] of bySession) {
    // group rows into visits within the session by 30-min gap
    let vStart = 0;
    const flow = fs.find((f) => f.session_id === sid);
    const utm = (flow?.utm ?? {}) as Record<string, unknown>;
    const srcLabel = typeof utm.utm_source === "string" && utm.utm_source
      ? `${utm.utm_source}${typeof utm.utm_content === "string" && utm.utm_content ? ` · ${utm.utm_content}` : ""}`
      : "Direct";
    let group: FeRow[] = [];
    const flush = () => {
      if (!group.length) return;
      const vid = `${sid}@${group[0].created_at}`;
      const start = group[0].created_at, end = group[group.length - 1].created_at;
      visits[vid] = { id: vid, index: 0, source: srcLabel, range: `${istTime(start)}–${istTime(end)}` };
      for (const g of group) visitOf.set(`${sid}@${g.created_at}`, vid);

      // ----- collapse within this visit -----
      const noise = group.filter((g) => NOISE.has(g.event_type));
      const cards = group.filter((g) => g.event_type === "report_card_view").map((g) => ({ card: num(g.metadata, "card") ?? 1, t: g.created_at }));
      const dwell = group.filter((g) => g.event_type === "card_dwell_ms");
      const complete = group.find((g) => g.event_type === "assessment_complete");
      const started = group.find((g) => g.event_type === "assessment_started" || g.event_type === "landing_view");
      const lead = group.find((g) => LEAD.has(g.event_type));

      if (started) events.push(mkEvent({ t: started.created_at, source: "site", icon: "assess", title: "Started assessment", sub: "Landing page", child: tag(sid), visitId: vid }));
      if (noise.length) {
        const idxs = noise.map((n) => num(n.metadata, "question_idx") ?? num(n.metadata, "index")).filter((x): x is number => x != null);
        const lo = idxs.length ? Math.min(...idxs) + 1 : null, hi = idxs.length ? Math.max(...idxs) + 1 : null;
        const title = lo && hi ? `Answered Q${lo}–Q${hi}` : "Went through the assessment";
        events.push(mkEvent({ t: noise[noise.length - 1].created_at, source: "site", icon: "assess", title, sub: complete ? undefined : hi ? `paused at Q${hi}` : undefined, child: tag(sid), visitId: vid }));
      }
      if (complete) events.push(mkEvent({ t: complete.created_at, source: "site", icon: "done", title: "Finished assessment", sub: num(complete.metadata, "questions") ? `${num(complete.metadata, "questions")} questions` : undefined, child: tag(sid), visitId: vid }));
      if (cards.length) {
        const nums = cards.map((c) => c.card); const lo = Math.min(...nums), hi = Math.max(...nums);
        const total = hi >= 7 ? 7 : 6;
        let secs = 0, approx = true;
        if (dwell.length) { secs = dwell.reduce((s, d) => s + Math.min(num(d.metadata, "ms") ?? 0, CAP_MS), 0) / 1000; approx = false; }
        else { // old data: gap to next event, capped
          const sorted = [...group].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
          for (let i = 0; i < sorted.length; i++) if (sorted[i].event_type === "report_card_view") {
            const next = sorted[i + 1]; const gap = next ? +new Date(next.created_at) - +new Date(sorted[i].created_at) : 0;
            secs += Math.min(gap, CAP_MS) / 1000;
          }
        }
        const mins = Math.max(1, Math.round(secs / 60));
        events.push(mkEvent({ t: cards[cards.length - 1].t, source: "site", icon: "report", title: `Read report · cards ${lo}–${hi} of ${total}`, sub: `${approx ? "~" : ""}${mins} min · last card ${hi}`, approx, child: tag(sid), visitId: vid }));
      } else if (group.some((g) => g.event_type === "report_view" || g.event_type === "report_v2_view")) {
        const rv = group.find((g) => g.event_type === "report_view" || g.event_type === "report_v2_view")!;
        events.push(mkEvent({ t: rv.created_at, source: "site", icon: "report", title: "Opened report", child: tag(sid), visitId: vid }));
      }
      // These collapse to ONE row per visit (a parent who re-opens the plan 30× is one "Opened plan").
      {
        const planE = group.find((g) => g.event_type === "plan_v2_view");
        if (planE) events.push(mkEvent({ t: planE.created_at, source: "site", icon: "plan", title: "Opened plan", child: tag(sid), visitId: vid }));
        const roadE = group.find((g) => g.event_type === "roadmap_cta_click" || (g.event_type === "scroll_milestone" && g.metadata?.page === "roadmap"));
        if (roadE) {
          const depth = Math.max(0, ...group.filter((g) => g.event_type === "scroll_milestone" && g.metadata?.page === "roadmap").map((g) => num(g.metadata, "depth") ?? 0));
          events.push(mkEvent({ t: roadE.created_at, source: "site", icon: "roadmap", title: "Opened roadmap", sub: depth ? `scrolled ${depth}%` : undefined, child: tag(sid), visitId: vid }));
        }
        const g = group.find((x) => x.event_type === "checkout_modal_opened" || x.event_type === "begin_checkout");
        if (g) {
          const val = num(g.metadata, "value");
          const dismiss = group.find((x) => x.event_type === "checkout_modal_dismissed" && +new Date(x.created_at) >= +new Date(g.created_at));
          const secs = dismiss ? Math.round((+new Date(dismiss.created_at) - +new Date(g.created_at)) / 1000) : null;
          events.push(mkEvent({ t: g.created_at, source: "site", icon: "checkout", title: `Opened checkout${val ? ` · ₹${val.toLocaleString("en-IN")} plan` : ""}`, sub: secs != null ? `left after ${secs}s, no payment attempt` : undefined, child: tag(sid), visitId: vid }));
        }
      }
      if (lead) events.push(mkEvent({ t: lead.created_at, source: "site", icon: "lead", title: "Lead captured", child: tag(sid), visitId: vid }));
      group = [];
    };
    for (let i = 0; i < rows.length; i++) {
      if (i > 0 && +new Date(rows[i].created_at) - +new Date(rows[i - 1].created_at) > VISIT_GAP_MS) flush();
      group.push(rows[i]);
      void vStart;
    }
    flush();
  }

  // ── PURCHASE (site) ──
  for (const p of purch) events.push(mkEvent({ t: p.created_at, source: "site", icon: "purchase", title: `Purchased · ₹${Math.round(p.amount_paise / 100).toLocaleString("en-IN")}` }));

  // ── CALLS ──
  calls.forEach((c, i) => {
    const mins = c.duration_sec != null ? (c.duration_sec < 60 ? `${c.duration_sec}s` : `${Math.round(c.duration_sec / 60)} min`) : null;
    events.push(mkEvent({ t: c.created_at, source: "call", icon: "call", title: `Call ${i + 1} · ${c.outcome.replace(/_/g, " ")}${mins ? ` · ${mins}` : ""}`, sub: c.notes?.slice(0, 120) ?? undefined }));
  });

  // ── WHATSAPP ──
  for (const w of waOut) {
    const bits = [w.status];
    if (w.delivered_at) bits.push(`delivered`);
    if (w.read_at) bits.push(`read ${istTime(w.read_at)}`);
    events.push(mkEvent({ t: w.sent_at ?? w.created_at, source: "message", icon: "message", title: `WhatsApp sent${w.kind ? ` · ${w.kind}` : ""}`, sub: bits.join(" · ") }));
  }
  for (const w of waIn) events.push(mkEvent({ t: w.created_at, source: "message", icon: "message", title: "WhatsApp reply from parent" }));

  // ── COACH (one row per trial-day) ──
  const coachGroups = new Map<string, { trial: string; day: number | null; lang: string | null; first: string; last: string; n: number }>();
  for (const m of coachMsgs) {
    const k = `${m.trial_id}:${m.day ?? 0}`;
    const g = coachGroups.get(k);
    if (!g) coachGroups.set(k, { trial: m.trial_id, day: m.day, lang: m.language, first: m.created_at, last: m.created_at, n: 1 });
    else { g.n++; g.last = m.created_at; if (!g.lang && m.language) g.lang = m.language; }
  }
  const LANG = { en: "English", hi: "Hindi", hinglish: "Hinglish" } as const;
  for (const g of coachGroups.values()) {
    const sid = trialSession.get(g.trial);
    const vid = sid ? visitOf.get(`${sid}@${g.first}`) : undefined;
    const langLabel = g.lang ? (LANG as Record<string, string>)[g.lang] ?? g.lang : null;
    events.push(mkEvent({ t: g.last, source: "coach", icon: "coach", title: `Coach · ${g.n} message${g.n > 1 ? "s" : ""}`, sub: [g.day ? `Day ${g.day}` : null, langLabel].filter(Boolean).join(" · ") || undefined, href: `/admin/coach-review?trial=${g.trial}`, child: sid ? tag(sid) : undefined, visitId: vid }));
  }

  // ── drop-off: last meaningful step not completed ──
  const hasPurchase = purch.length > 0;
  const openedCheckout = events.find((e) => e.icon === "checkout");
  if (openedCheckout && !hasPurchase) openedCheckout.dropOff = "Dropped here · checkout, no payment";

  // index visits chronologically (oldest = 1)
  const vStarts = Object.values(visits).map((v) => ({ v, t: v.id.split("@")[1] })).sort((a, b) => +new Date(a.t) - +new Date(b.t));
  vStarts.forEach((x, i) => (visits[x.v.id].index = i + 1));

  // ── summary + first-came ──
  const reportRows = events.filter((e) => e.icon === "report" && /min/.test(e.sub ?? ""));
  const reportMinutes = reportRows.reduce((s, e) => s + (parseInt((e.sub ?? "").replace("~", "")) || 0), 0);
  const reportApprox = reportRows.some((e) => e.approx);
  const lastCard = events.filter((e) => e.icon === "report").map((e) => { const m = (e.title.match(/of (\d)/)); const h = (e.title.match(/–(\d+)/)); return h ? parseInt(h[1]) : null; }).filter((x): x is number => x != null).sort((a, b) => b - a)[0] ?? null;
  const totalCardsSeen = events.some((e) => /of 7/.test(e.title)) ? 7 : 6;
  const firstFlow = [...fs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0];
  const futm = (firstFlow?.utm ?? {}) as Record<string, unknown>;
  const firstCame = firstFlow && (typeof futm.utm_source === "string" || firstFlow.device)
    ? { source: typeof futm.utm_source === "string" ? futm.utm_source : "direct", adName: typeof futm.utm_content === "string" ? futm.utm_content : null, device: firstFlow.device ?? null }
    : null;

  events.sort((a, b) => +new Date(b.t) - +new Date(a.t));
  const counts = { all: events.length, site: events.filter((e) => e.source === "site").length, call: events.filter((e) => e.source === "call").length, message: events.filter((e) => e.source === "message").length, coach: events.filter((e) => e.source === "coach").length };
  const total = events.length;
  const paged = events.slice(0, PAGE);

  return {
    summary: { visits: Object.keys(visits).length, reportMinutes, reportApprox, lastCard, totalCards: totalCardsSeen, calls: calls.length },
    firstCame, events: paged, visits, counts, total, truncated: total > PAGE,
  };
}
