import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { reportsApiKey } from "@/lib/ai/anthropic-keys";
import { reportCostPaise } from "@/lib/report-v2/generate";
import { pricingPromptBlock, PRICING_FACTS } from "./pricing";
import { validateScript } from "./validate";
import type { CallScript, Lang, ScriptKind, ScriptResult } from "./types";

const MODEL = "claude-sonnet-4-6";

export type GenerateInput = {
  kind: ScriptKind;
  lang: Lang;
  callNo: number;
  caller: string;          // the logged-in operator's name (who I am)
  callerGender: "f" | "m" | "n";  // for Hinglish self-forms (rahi/raha hoon)
  banNames?: string[];     // other families' children that must not appear (tests)
  parent: string;
  child: string;
  ageBand: string;
  worry: string;           // display label
  archetype: string;
  assessedDaysAgo: number; // for the gentle old-lead opener
  // v3 facts (Part C): the caller reads these — pattern line / strength / stuck / pull / today→toward /
  // tonight's step (still from report_v2) + the Card-5 tap. No report_v2 seenIt/hardPart/tryLine/goal.
  report: {
    patternLine: string; strength: string; stuck: string; pull: string;
    todayToward: [string, string][]; tonightStep: string;
    tonightTap: "worked" | "mixed" | "didnt_land" | null;
  } | null;
  answersSummary: string;  // compact "Q — A" lines
  lastCall?: { date: string; outcome: string; note: string; nextSteps: string };
  since?: string;          // journey since last call (follow-up) / since report (first)
  trialEligible: boolean;
};

const selfForm = (g: "f" | "m" | "n") => g === "f" ? "rahi hoon" : g === "m" ? "raha hoon" : "rahe hain";
const SYSTEM = (lang: Lang, caller: string, gender: "f" | "m" | "n") => [
  `You write a short PHONE SCRIPT for a human caller named "${caller}" at an Indian parenting company`,
  `to read aloud to a parent. The caller sells a gentle 6-week parenting plan. Output STRICT JSON only — no prose, no markdown.`,
  ``,
  `HARD RULES:`,
  lang === "hinglish"
    ? `- Language: natural spoken HINGLISH in Roman script — the Hindi-English mix Indian urban parents actually speak on the phone. Use "aap" (never "tum"). Warm and respectful. The caller is ${gender === "f" ? "FEMALE" : gender === "m" ? "MALE" : "of unspecified gender"} — self-reference MUST use "${selfForm(gender)}" (e.g. "Main ${caller} baat kar ${selfForm(gender)}…"). Never use the other gender's form.`
    : `- Language: plain, warm spoken Indian English. Short sentences a parent hears clearly on a call.`,
  `- Every fact MUST come from the DATA below. Do NOT invent anything about the child, the parent, or the program.`,
  `- NO promises or guarantees. NO clinical or diagnostic words (never say ADHD, disorder, diagnosis, therapy, spectrum, etc.).`,
  `- NO pressure, NO deadlines, NO discounts. Never say "only this week", "hurry", "limited".`,
  `- BE BRIEF. WORD BUDGET PER PART (hard): opener ≤ 25 words; EACH section's lines total ≤ 20 words; each objection answer ≤ 25 words. One short sentence per line. Never stack two sentences. Staying inside these keeps the whole call under a minute.`,
  `- The caller reads the "lines"; "hint" is a short silent note to the caller (not read aloud, not counted).`,
].join("\n");

function firstCallSchema(trialEligible: boolean): string {
  return [
    `Return JSON: {`,
    `  "opener": "<one line: who you are (${"the caller"}), why you're calling — you read their report about the child — said warmly. If the lead is old, gently acknowledge the delay first; never pretend it's fresh.>",`,
    `  "sections": [`,
    `    {"title":"One line that'll feel true","seconds":15,"lines":["<name the child's strength AND the hard moment, from the report — something the parent will recognise>"]},`,
    `    {"title":"Open them up","seconds":20,"lines":["<one question that gets them talking, e.g. What happens at home when …?>"],"hint":"Then listen."},`,
    `    {"title":"Listen for","lines":[],"hint":"<2–3 short things to listen for — a silent note, NOT read aloud>"},`,
    `    {"title":"The plan, in two lines","seconds":15,"lines":["<what the 6-week plan is, plainly>","<how it fits this child>"]},`,
    `    {"title":"Next step","lines":["${trialEligible ? "<offer the free 4-day Coach trial — no payment>" : "<send the roadmap link or set a callback. NOT eligible for a trial — do NOT mention any trial, free or paid>"}"]}`,
    `  ],`,
    `  "objections": [`,
    `    {"label":"Price","answer":"<answer using ONLY the allowed commercial facts>"},`,
    `    {"label":"It's another course","answer":"<this one starts from THIS child's own answers/report>"},`,
    `    {"label":"Have to ask my husband/wife","answer":"<respect it; offer to share something they can show their spouse; no pressure>"}`,
    `  ]`,
    `}`,
  ].join("\n");
}

function followupSchema(priorCallNo: number, trialEligible: boolean): string {
  return [
    `Return JSON: {`,
    `  "leftOff": "Where you left off (call ${priorCallNo}, <date>): <last outcome + the gist of the last note, from DATA>",`,
    `  "since": "Since then: <what they did after the last call, from the journey in DATA — or omit if nothing>",`,
    `  "opener": "<warm reconnect line that uses something concrete from the last call>",`,
    `  "sections": [`,
    `    {"title":"Check the step you gave","seconds":30,"lines":["<ask about the specific next step from last call: did you get a chance to … what happened?>"],"hint":"Worked → go to next step. Didn't → ‘that's useful, tell me what happened.’"},`,
    `    {"title":"Next step you planned","lines":["<the next step from the last call's notes/next steps>"]},`,
    `    {"title":"Close","lines":["${trialEligible ? "<offer the free trial link, or set the next callback — no pressure>" : "<set the next callback or offer to send the roadmap. NOT eligible for a trial — do NOT mention any trial>"}"]}`,
    `  ],`,
    `  "objections": [ {"label":"<the objection from the notes, if any>","answer":"<answer with allowed facts only>"} ]`,
    `}`,
  ].join("\n");
}

function buildPrompt(i: GenerateInput): string {
  const lines: string[] = [];
  lines.push(`DATA:`);
  lines.push(`- Caller (you): ${i.caller}`);
  lines.push(`- Parent (the adult you're calling): ${i.parent}`);
  lines.push(`- Child (who the report is about): ${i.child} (${i.ageBand})`);
  lines.push(`  IMPORTANT: ${i.parent} is the parent; ${i.child} is the child. Never swap them. The parent did the assessment ABOUT the child.`);
  lines.push(`- What they worry about: ${i.worry}`);
  lines.push(`- Child's pattern (archetype): ${i.archetype}`);
  lines.push(`- Assessment was done ${i.assessedDaysAgo} day(s) ago.${i.assessedDaysAgo > 3 ? " THIS IS AN OLD LEAD — the opener must gently acknowledge we're only calling now." : ""}`);
  if (i.report) {
    lines.push(`- How ${i.child} focuses (pattern, plain — NEVER say a "type" or label aloud): ${i.report.patternLine}`);
    lines.push(`- ${i.child}'s strength: ${i.report.strength}`);
    lines.push(`- Where ${i.child} gets stuck: ${i.report.stuck}`);
    lines.push(`- What pulls ${i.child} away: ${i.report.pull}`);
    if (i.report.todayToward.length) lines.push(`- Today → what the plan works toward: ${i.report.todayToward.slice(0, 2).map(([a, b]) => `${a} → ${b}`).join("; ")}`);
    if (i.report.tonightStep) lines.push(`- The free step they can try tonight: ${i.report.tonightStep}`);
    if (i.report.tonightTap) lines.push(`- They already tried tonight's step and tapped "${i.report.tonightTap === "worked" ? "Worked" : i.report.tonightTap === "mixed" ? "Partly" : "Didn't work"}" — acknowledge that warmly.`);
  }
  if (i.answersSummary) lines.push(`- Their own answers:\n${i.answersSummary}`);
  if (i.kind === "followup" && i.lastCall) {
    lines.push(`- Last call (${i.lastCall.date}): outcome ${i.lastCall.outcome}. Note: ${i.lastCall.note || "—"}. Planned next: ${i.lastCall.nextSteps || "—"}.`);
  }
  if (i.since) lines.push(`- Journey since: ${i.since}`);
  lines.push(``);
  lines.push(pricingPromptBlock(i.trialEligible));
  lines.push(``);
  lines.push(i.kind === "first" ? firstCallSchema(i.trialEligible) : followupSchema(i.callNo - 1, i.trialEligible));
  return lines.join("\n");
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 ? cleaned.slice(start, end + 1) : cleaned);
}

function shape(i: GenerateInput, obj: Record<string, unknown>): CallScript {
  const secs = Array.isArray(obj.sections) ? obj.sections : [];
  const objs = Array.isArray(obj.objections) ? obj.objections : [];
  return {
    kind: i.kind, lang: i.lang, callNo: i.callNo,
    header: { caller: i.caller, parent: i.parent, child: i.child, ageBand: i.ageBand, worry: i.worry,
      builtFrom: i.kind === "first" ? ["Report", "Answers"] : ["Report", "Answers", "Call notes", "Journey"] },
    leftOff: typeof obj.leftOff === "string" ? obj.leftOff : undefined,
    since: typeof obj.since === "string" ? obj.since : i.since,
    opener: String(obj.opener ?? ""),
    sections: secs.map((s) => {
      const o = s as Record<string, unknown>;
      return { title: String(o.title ?? ""), seconds: typeof o.seconds === "number" ? o.seconds : undefined,
        lines: Array.isArray(o.lines) ? o.lines.map(String) : [], hint: typeof o.hint === "string" ? o.hint : undefined };
    }),
    objections: objs.map((o) => { const x = o as Record<string, unknown>; return { label: String(x.label ?? ""), answer: String(x.answer ?? "") }; }),
  };
}

function vctx(i: GenerateInput) {
  return { callNo: i.callNo, trialEligible: i.trialEligible, callerGender: i.callerGender, childNames: [i.child], banNames: i.banNames };
}
// Spoken = what's read aloud in sequence (opener + section lines); the minute budget applies to this.
function spokenWords(s: CallScript): number {
  return [s.opener, ...s.sections.flatMap((x) => x.lines)].join(" ").trim().split(/\s+/).filter(Boolean).length;
}
// Length is the only "failure" that's safe to fix WITHOUT another model call: trim extra lines from the
// wordiest multi-line section until it fits. Keeps ≥1 line per section (the key sentence).
function trimToFit(s: CallScript, budget = 225): CallScript {
  const c: CallScript = JSON.parse(JSON.stringify(s));
  while (spokenWords(c) > budget) {
    let idx = -1, max = 0;
    c.sections.forEach((sec, i) => { if (sec.lines.length > 1) { const w = sec.lines.join(" ").split(/\s+/).length; if (w > max) { max = w; idx = i; } } });
    if (idx === -1) break; // nothing left to trim
    c.sections[idx].lines.pop();
  }
  return c;
}
// For an ineligible parent, replace any trial-mentioning line with the roadmap line — in code, no model
// call (the model occasionally offers a trial despite the instruction).
const TRIAL_RE = /\b(trial|free 4-day|4-din|4 din|free coach|muft)\b/i;
function scrubTrial(s: CallScript, i: GenerateInput): CallScript {
  const hin = s.lang === "hinglish";
  const det = i.callerGender === "f" ? "deti hoon" : i.callerGender === "m" ? "deta hoon" : "dete hain";
  const roadmap = hin ? `Main aapko ${i.child} ka roadmap bhej ${det} dekhne ke liye.` : `I can send you ${i.child}'s roadmap to look at.`;
  const c: CallScript = JSON.parse(JSON.stringify(s));
  const drop = (t?: string) => (t && TRIAL_RE.test(t) ? "" : t);
  if (TRIAL_RE.test(c.opener)) c.opener = roadmap;
  c.leftOff = drop(c.leftOff); c.since = drop(c.since);
  c.sections.forEach((sec) => { sec.lines = sec.lines.map((l) => (TRIAL_RE.test(l) ? roadmap : l)); });
  c.objections.forEach((o) => { if (TRIAL_RE.test(o.answer)) o.answer = roadmap; });
  return c;
}
// All safe in-code repairs for a failed draft — never a model call. Only genuinely unsafe content
// (promise/clinical/pressure the model invented) is left to one retry, then the deterministic fallback.
function repairScript(s: CallScript, i: GenerateInput, fails: string[]): CallScript {
  let c: CallScript = JSON.parse(JSON.stringify(s));
  if (fails.some((f) => f.startsWith("too long"))) c = trimToFit(c);
  if (!i.trialEligible && fails.some((f) => /trial mentioned/.test(f))) c = scrubTrial(c, i);
  if (fails.some((f) => /wrong call number/.test(f)) && c.leftOff) c.leftOff = c.leftOff.replace(/call\s+\d+/i, `call ${i.callNo - 1}`);
  if (fails.some((f) => /does not name the real child/.test(f)) && !new RegExp(i.child, "i").test(c.opener + (c.leftOff ?? ""))) {
    c.opener = c.opener.replace(/\s*$/, "") + ` It's about ${i.child}.`;
  }
  return c;
}
// All call-script LLM spend is logged under one feature tag so it can be grepped/aggregated.
function logSpend(i: GenerateInput, inTok: number, outTok: number, outcome: string) {
  console.log(`[spend] feature=call_script kind=${i.kind} lang=${i.lang} callNo=${i.callNo} in=${inTok} out=${outTok} paise=${reportCostPaise(inTok, outTok)} outcome=${outcome}`);
}

export async function generateCallScript(i: GenerateInput): Promise<ScriptResult> {
  const client = new Anthropic({ apiKey: reportsApiKey() });
  const ctx = vctx(i);
  let inTok = 0, outTok = 0;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await client.messages.create({
        model: MODEL, max_tokens: 1400, temperature: 0.3,
        system: SYSTEM(i.lang, i.caller, i.callerGender),
        messages: [{ role: "user", content: buildPrompt(i) }],
      });
      inTok += res.usage?.input_tokens ?? 0; outTok += res.usage?.output_tokens ?? 0;
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      let script: CallScript;
      try { script = shape(i, parseJson(text)); } catch { if (attempt === 0) continue; throw new Error("bad_json"); }
      const v = validateScript(script, ctx);
      if (v.ok) { logSpend(i, inTok, outTok, "ok"); return { script, source: "llm", model: MODEL, inTok, outTok, costPaise: reportCostPaise(inTok, outTok), outcome: "ok", reason: null }; }
      // Safe in-code repairs (NO extra model call): length, ineligible-trial, call-no, child-name.
      const repaired = repairScript(script, i, v.fails);
      if (validateScript(repaired, ctx).ok) {
        console.log(`[call_script] repaired in code (${v.fails.join("; ")}) — shipping`);
        logSpend(i, inTok, outTok, "ok");
        return { script: repaired, source: "llm", model: MODEL, inTok, outTok, costPaise: reportCostPaise(inTok, outTok), outcome: "ok", reason: "repaired in code" };
      }
      console.log(`[call_script] validator caught: ${v.fails.join("; ")} — attempt ${attempt + 1}${attempt === 0 ? ", retrying" : ", falling back"}`);
      if (attempt === 0) continue; // one retry for anything in-code repair couldn't fix, then fall back
      logSpend(i, inTok, outTok, "validator_fail");
      return { script: fallbackScript(i), source: "fallback", model: MODEL, inTok, outTok, costPaise: reportCostPaise(inTok, outTok), outcome: "validator_fail", reason: v.fails.join("; ") };
    }
    logSpend(i, inTok, outTok, "validator_fail");
    return { script: fallbackScript(i), source: "fallback", model: MODEL, inTok, outTok, costPaise: reportCostPaise(inTok, outTok), outcome: "validator_fail", reason: "no valid draft" };
  } catch (e) {
    logSpend(i, inTok, outTok, "api_error");
    return { script: fallbackScript(i), source: "fallback", model: null, inTok, outTok, costPaise: reportCostPaise(inTok, outTok), outcome: "api_error", reason: String((e as Error)?.message ?? e).slice(0, 120) };
  }
}

// Deterministic fallback — correct and safe (no LLM), from the stored data + allowed facts.
export function fallbackScript(i: GenerateInput): CallScript {
  const hin = i.lang === "hinglish";
  const g = i.callerGender;
  const sakHoon = g === "f" ? "sakti hoon" : g === "m" ? "sakta hoon" : "sakte hain";
  const detHoon = g === "f" ? "deti hoon" : g === "m" ? "deta hoon" : "dete hain";
  const iAm = hin ? `Namaste, main ${i.caller} baat kar ${selfForm(i.callerGender)}` : `Hi, this is ${i.caller}`;
  const base: CallScript = {
    kind: i.kind, lang: i.lang, callNo: i.callNo,
    header: { caller: i.caller, parent: i.parent, child: i.child, ageBand: i.ageBand, worry: i.worry,
      builtFrom: i.kind === "first" ? ["Report", "Answers"] : ["Report", "Answers", "Call notes", "Journey"] },
    opener: "", sections: [], objections: [],
  };
  const trialLine = i.trialEligible
    ? (hin ? `Main aapko ${i.child} ke liye 4-din ka free Coach trial bhej ${sakHoon} — koi payment nahi.` : `I can send you a free 4-day Coach trial for ${i.child} — no payment.`)
    : (hin ? `Main aapko ${i.child} ka roadmap bhej ${detHoon} dekhne ke liye.` : `I can send you ${i.child}'s roadmap to look at.`);
  const priceLine = hin
    ? `Plan ek baar ka hai — ${PRICING_FACTS.planOnly} (${PRICING_FACTS.perDayOnly}), ya calls ke saath ${PRICING_FACTS.planWithCalls}. ${PRICING_FACTS.refund}.`
    : `The plan is one-time — ${PRICING_FACTS.planOnly} (${PRICING_FACTS.perDayOnly}), or ${PRICING_FACTS.planWithCalls} with guided calls. ${PRICING_FACTS.refund}.`;

  if (i.kind === "first") {
    const oldAck = i.assessedDaysAgo > 3 ? (hin ? ` Sorry, hum aapko thoda late call kar rahe hain ${i.child} ki report ke baare mein.` : ` Sorry we're only calling now about ${i.child}'s report.`) : "";
    base.opener = `${iAm}${hin ? "" : ","} ${hin ? "The Human Decision se" : "from The Human Decision"}.${oldAck} ${hin ? `Aapne ${i.child} ke liye jo assessment bhara tha, uski report main dekh raha tha.` : `I was looking at the report from the assessment you did for ${i.child}.`}`;
    base.sections = [
      { title: hin ? "Ek baat jo sach lagegi" : "One line that'll feel true", seconds: 15, lines: [i.report?.stuck || (hin ? `${i.child} ko ${i.worry} mein dikkat hoti hai.` : `${i.child} finds ${i.worry} hard.`)] },
      { title: hin ? "Baat shuru karein" : "Open them up", seconds: 20, lines: [hin ? `Ghar pe kya hota hai jab ${i.child} ${i.worry} ke time atak jaate hain?` : `What happens at home when ${i.child} gets stuck at ${i.worry}?`], hint: hin ? "Phir suniye." : "Then listen." },
      { title: hin ? "Plan, do line mein" : "The plan, in two lines", seconds: 15, lines: [hin ? `Ye 6-hafte ka plan aapke liye hai — har hafte ek chhota kadam.` : `It's a 6-week plan for you — one small step each week.`, i.report?.patternLine || (hin ? `${i.child} ke apne pattern se shuru hota hai.` : `It starts from ${i.child}'s own pattern.`)] },
      { title: hin ? "Agla kadam" : "Next step", lines: [trialLine] },
    ];
    base.objections = [
      { label: hin ? "Price" : "Price", answer: priceLine },
      { label: hin ? "Ye bhi ek course hai" : "It's another course", answer: hin ? `Ye ${i.child} ke apne jawabon se banta hai — aapne report mein khud dekha.` : `This one starts from ${i.child}'s own answers — you saw it in the report.` },
      { label: hin ? "Pati/patni se poochna hoga" : "Have to ask my spouse", answer: hin ? `Bilkul. Main aapko report ka link bhej ${detHoon} jo aap unhe dikha sakte hain. Koi jaldi nahi.` : `Of course. I'll send the report link you can show them. No rush.` },
    ];
  } else {
    const lc = i.lastCall;
    base.leftOff = lc ? `Where you left off (call ${i.callNo - 1}, ${lc.date}): ${lc.outcome}. ${lc.note || ""}`.trim() : undefined;
    base.since = i.since;
    base.opener = `${iAm}${hin ? " wapas" : " again"}, The Human Decision se.${lc?.note ? (hin ? ` Pichhli baar aapne bataya tha: ${lc.note}` : ` Last time you mentioned: ${lc.note}`) : ""}`;
    base.sections = [
      { title: hin ? "Jo step diya tha, poochein" : "Check the step you gave", seconds: 30, lines: [hin ? `${i.child} ke saath wo try kar paaye? Kya hua?` : `Did you get a chance to try it with ${i.child}? What happened?`], hint: hin ? "Hua → aage badhein. Nahi hua → 'theek hai, bataiye kya hua.'" : "Worked → move on. Didn't → 'that's useful, tell me what happened.'" },
      { title: hin ? "Agla kadam" : "Next step you planned", lines: [lc?.nextSteps || trialLine] },
      { title: hin ? "Band karein" : "Close", lines: [trialLine] },
    ];
    base.objections = lc?.note ? [{ label: hin ? "Pichhli baat se" : "From last note", answer: priceLine }] : [];
  }
  return base;
}
