// Multi-turn conversation evals for the Coach quality rules. Pure, deterministic scorers (no
// network) + the conversation set. The LIVE run (scripts/coach-quality-eval.mts, gated by
// COACH_EVAL_LIVE) feeds each turn through the real Coach + the production guard loop and applies
// these scorers; it ALSO runs an LLM "plain language" judge. The unit test checks the scorers + set
// shape without a network call.
//
// No real parent names: "Parent M" / "Child U" are anonymised; fixture child names only.
import { bannedPhrase, wordCount, primarySayThis, hasQuotedSentence, asksWhatHappened, normalizeQuote, longestSentenceWords, MAX_SENTENCE_WORDS, looksHindi } from "./guards";

export type Check =
  | "checkin_first"        // genuine check-in (new day, no news): ask what happened, no new technique
  | "no_reinterrogate"     // parent already answered → do NOT ask the generic "what happened?" again
  | "concrete_scene"       // confusion: concrete "picture this evening" scene with the child's name, re-ask
  | "offer_call"           // second confusion: offer a call with the team
  | "offer_hindi"          // parent says the language is hard → offer Hindi
  | "five_part"            // an adjustment / step delivery uses the 5 parts
  | "diagnose_q"           // step unclear for this family: ask one concrete question
  | "max_two_questions"    // after 2 coach questions, the reply must give the step (not another question)
  | "no_repeat_question"   // don't re-ask a question already asked earlier
  | "plain_language"       // plain, short, concrete (deterministic proxy; LLM judge runs in the live harness)
  | "reply_in_hindi"       // the reply is in Hindi/Hinglish (parent accepted the Hindi offer / wrote in Hindi)
  | "has_quote"            // the reply gives exact words to say (a quoted sentence)
  | "no_banned"            // no banned idiom / metaphor / drift word
  | "length";              // within the length cap

export type Turn = { parent: string; expect: Check[]; stepDelivery?: boolean };
export type Convo = { id: string; title: string; child: string; turns: Turn[] };
export type ScoreCtx = { child: string; stepDelivery?: boolean; priorReplies?: string[] };

const q = (re: RegExp, s: string) => re.test(s || "");

// The trailing question of a reply (last sentence that ends with "?"), normalised for comparison.
function trailingQuestion(text: string): string | null {
  const m = (text || "").trim().match(/([^.!?]*\?)\s*$/);
  return m ? normalizeQuote(m[1]) : null;
}
function isBareQuestion(text: string): boolean {
  return (text || "").trim().endsWith("?") && !primarySayThis(text);
}

export function scoreCheck(check: Check, reply: string, ctx: ScoreCtx): { pass: boolean; reason: string } {
  const r = reply || "";
  const name = ctx.child;
  const hasName = new RegExp(`\\b${name}\\b`, "i").test(r);
  const asksQuestion = r.includes("?");
  const newTechnique = !!primarySayThis(r);
  const prior = ctx.priorReplies ?? [];

  switch (check) {
    case "checkin_first": {
      const asked = asksWhatHappened(r);
      return { pass: asked && !newTechnique, reason: asked ? (newTechnique ? "asked, but also handed a new technique" : "asked what happened, no new technique") : "did not ask what happened first" };
    }
    case "no_reinterrogate": {
      // The parent already told us how it went — the reply must NOT ask the generic "what happened?"
      // again. A specific diagnostic question or an adjustment is fine.
      const reinterrogates = /\bwhat happened\b/i.test(r) || /\bdid you (get (a )?chance|get to)\b/i.test(r);
      return { pass: !reinterrogates, reason: reinterrogates ? "re-asked 'what happened' after the parent answered" : "did not re-interrogate" };
    }
    case "concrete_scene": {
      const scene = q(/\b(picture this|imagine (this )?(evening|tonight)|tonight,? when|here'?s tonight|say it'?s tonight|this evening,)\b/i, r);
      const reAsk = q(/\b(which part|still unclear|is any part|make sense)\b/i, r);
      return { pass: scene && hasName && reAsk, reason: `scene:${scene} name:${hasName} reask:${reAsk}` };
    }
    case "offer_call": {
      const call = q(/\b(call with (us|our team|the team)|hop on a (quick )?call|book a call|jump on a call|set up a call|talk to (us|our team) on a call)\b/i, r);
      return { pass: call, reason: call ? "offered a call" : "did not offer a call" };
    }
    case "offer_hindi": {
      const hindi = /\bhindi\b/i.test(r);
      return { pass: hindi, reason: hindi ? "offered Hindi" : "did not offer Hindi" };
    }
    case "five_part": {
      const whatToDo = hasQuotedSentence(r);
      const makeSense = q(/\b(does that make sense|any part unclear|is any part)\b/i, r);
      const tomorrow = q(/\b(tomorrow|check (in|back)|how it went|let you know|i'?ll ask)\b/i, r);
      return { pass: whatToDo && makeSense && tomorrow, reason: `quote:${whatToDo} makeSense:${makeSense} tomorrow:${tomorrow}` };
    }
    case "diagnose_q": {
      const diag = q(/\b(does (he|she|they|.*) .*(or|start|stop|begin|never|freeze|refuse)|what (happens|does .* do)|when (does|do)|which bit|is it (that|when|more))\b/i, r);
      return { pass: diag && asksQuestion && !newTechnique, reason: `diagnostic:${diag} q:${asksQuestion} noNewTech:${!newTechnique}` };
    }
    case "max_two_questions": {
      const priorQuestions = prior.filter(isBareQuestion).length;
      // Once 2 bare questions have been asked, this reply must give the step (a technique), not ask again.
      const ok = priorQuestions < 2 || newTechnique || !isBareQuestion(r);
      return { pass: ok, reason: `priorQ:${priorQuestions} nowBareQ:${isBareQuestion(r)} hasStep:${newTechnique}` };
    }
    case "no_repeat_question": {
      const tq = trailingQuestion(r);
      if (!tq) return { pass: true, reason: "no trailing question" };
      const repeat = prior.map(trailingQuestion).some((p) => p && (p === tq || (p.length > 12 && tq.includes(p)) || (tq.length > 12 && p.includes(tq))));
      return { pass: !repeat, reason: repeat ? "repeated a question already asked" : "fresh question" };
    }
    case "plain_language": {
      // Deterministic proxy: no banned idioms + short sentences. "Is there a concrete action?" is
      // left to the LLM judge (plain_language_llm), since a check-in/question turn has no action yet.
      const bp = bannedPhrase(r);
      const longest = longestSentenceWords(r);
      const ok = bp === null && longest <= MAX_SENTENCE_WORDS;
      return { pass: ok, reason: `banned:${bp ?? "none"} longestSentence:${longest}` };
    }
    case "reply_in_hindi": {
      const hindi = looksHindi(r);
      return { pass: hindi, reason: hindi ? "reply in Hindi/Hinglish" : "reply not in Hindi" };
    }
    case "has_quote": {
      return { pass: hasQuotedSentence(r), reason: hasQuotedSentence(r) ? "has exact words to say" : "no quoted words" };
    }
    case "no_banned": {
      const bp = bannedPhrase(r);
      return { pass: bp === null, reason: bp ? `banned "${bp}"` : "no banned words" };
    }
    case "length": {
      const cap = ctx.stepDelivery ? 160 : 90;
      const wc = wordCount(r);
      return { pass: wc <= cap, reason: `${wc} words (cap ${cap})` };
    }
  }
}

// ── The conversation set. Includes the anonymised real transcript (task 26) + Parent M. ──
export const CONVERSATIONS: Convo[] = [
  {
    id: "real_didnt_work", title: "Real transcript — 'it did not work' then 'complicated language'", child: "Uma",
    turns: [
      // A stated outcome IS the answer → acknowledge, at most one short question, no re-interrogation.
      { parent: "It did not work.", expect: ["no_reinterrogate", "no_repeat_question", "no_banned", "plain_language", "length"] },
      { parent: "She just ignored me and did not start at all.", expect: ["max_two_questions", "five_part", "no_reinterrogate", "no_banned", "plain_language", "length"] },
      { parent: "You are using very complicated language.", expect: ["offer_hindi", "no_reinterrogate", "no_banned", "plain_language", "length"] },
    ],
  },
  {
    id: "hindi_accept", title: "Parent accepts the Hindi offer → Coach continues in Hindi", child: "Aditi",
    turns: [
      { parent: "You are using very complicated language.", expect: ["offer_hindi", "no_banned"] },
      { parent: "haan, Hindi mein batao", expect: ["reply_in_hindi", "has_quote", "no_banned"] },      // step in Hindi, exact words in Hindi
      { parent: "theek hai, aur agar woh phir bhi na kare?", expect: ["reply_in_hindi", "no_banned"] }, // next Hindi message stays Hindi
    ],
  },
  {
    id: "parent_m", title: "Parent M — missed, confused, didn't work, can't comprehend", child: "Mira",
    turns: [
      { parent: "Sorry, I missed yesterday — didn't get a chance to try it.", expect: ["no_reinterrogate", "no_banned", "plain_language", "length"] },
      { parent: "Honestly I didn't really get what I was supposed to do.", expect: ["concrete_scene", "no_banned", "plain_language", "length"] },
      { parent: "Okay I tried it last night but it didn't work, she still wouldn't start.", expect: ["no_reinterrogate", "max_two_questions", "no_banned", "plain_language", "length"] },
      { parent: "I'm still unable to comprehend this, sorry.", expect: ["offer_call", "no_banned", "length"] },
    ],
  },
  {
    id: "give_me_step", title: "Asks for today's step → 5-part delivery", child: "Aarav",
    turns: [
      { parent: "What's today's step and how do I do it?", expect: ["five_part", "no_banned", "plain_language", "length"], stepDelivery: true },
    ],
  },
  {
    id: "new_day_checkin", title: "Opens a new day with no news → check-in first", child: "Diya",
    turns: [
      { parent: "Good morning, I'm here for today.", expect: ["checkin_first", "no_banned", "length"] },
    ],
  },
  {
    id: "didnt_work_then_adjust", title: "It didn't work → don't loop, then adjust", child: "Reyan",
    turns: [
      { parent: "It didn't work at all yesterday.", expect: ["no_reinterrogate", "no_banned", "plain_language", "length"] },
      { parent: "He just ignored me and kept watching his tablet.", expect: ["max_two_questions", "no_banned", "plain_language", "length"] },
    ],
  },
  {
    id: "confused_once", title: "Single confusion → concrete scene", child: "Sara",
    turns: [
      { parent: "I don't understand what you mean by giving her the choice.", expect: ["concrete_scene", "no_banned", "plain_language", "length"] },
    ],
  },
  {
    id: "unclear_fit", title: "Step unclear for this child → diagnose first", child: "Ira",
    turns: [
      { parent: "I'm not sure this fits my daughter, it doesn't seem right for her.", expect: ["diagnose_q", "no_banned", "length"] },
    ],
  },
  {
    id: "wants_more_techniques", title: "Asks for extra tricks → stay on one step", child: "Kabir",
    turns: [
      { parent: "Can you give me three or four techniques to try this week?", expect: ["no_banned", "plain_language", "length"] },
    ],
  },
  {
    id: "metaphor_bait", title: "Parent uses jargon → coach stays plain", child: "Anaya",
    turns: [
      { parent: "How do I anchor this habit so it really locks in?", expect: ["no_banned", "plain_language", "length"] },
    ],
  },
  {
    id: "double_confusion", title: "Two confusions same day → offer a call", child: "Veer",
    turns: [
      { parent: "I don't get it.", expect: ["concrete_scene", "no_banned", "length"] },
      { parent: "No, I still don't understand it at all.", expect: ["offer_call", "no_banned", "length"] },
    ],
  },
  {
    id: "worked_then_next", title: "It worked → acknowledge, stay on the day", child: "Noor",
    turns: [
      { parent: "It actually worked yesterday, she started on her own!", expect: ["no_reinterrogate", "no_banned", "plain_language", "length"] },
    ],
  },
  {
    id: "partly_worked", title: "Partly worked → one small adjustment only", child: "Dev",
    turns: [
      { parent: "It sort of worked — he started but gave up halfway.", expect: ["no_reinterrogate", "no_banned", "plain_language", "length"] },
    ],
  },
];

export function parentMConvo(): Convo {
  return CONVERSATIONS.find((c) => c.id === "parent_m")!;
}
export function realTranscriptConvo(): Convo {
  return CONVERSATIONS.find((c) => c.id === "real_didnt_work")!;
}
export function hindiConvo(): Convo {
  return CONVERSATIONS.find((c) => c.id === "hindi_accept")!;
}
