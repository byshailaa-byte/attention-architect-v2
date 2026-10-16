// Multi-turn conversation evals for the Coach quality rules. Pure, deterministic scorers (no
// network) + the conversation set. The LIVE run (scripts/coach-quality-eval.mts, gated by
// COACH_EVAL_LIVE) feeds each turn through the real Coach and applies these scorers; the unit test
// (__tests__/coach-quality-eval.test.ts) checks the scorers + set shape without a network call.
//
// No real parent names: "Parent M" / "Child U" are anonymised; the fixture child name is "Uma".
import { bannedPhrase, wordCount, primarySayThis, hasQuotedSentence } from "./guards";

export type Check =
  | "checkin_first"     // after a missed / didn't-work turn: ask what happened, do NOT dump a new technique
  | "concrete_scene"    // after confusion: a concrete "picture this evening" scene with the child's name, re-ask unclear
  | "offer_call"        // second confusion in the same day: offer a call with the team
  | "five_part"         // a step delivery uses the 5 parts
  | "diagnose_q"        // step unclear for this family: ask one concrete question before advising
  | "no_banned"         // no banned metaphor / drift words
  | "length";           // within the length cap

export type Turn = { parent: string; expect: Check[]; stepDelivery?: boolean };
export type Convo = { id: string; title: string; child: string; turns: Turn[] };

// ── Pure scorers: each takes the coach reply + context, returns pass/fail + reason. ──
const q = (re: RegExp, s: string) => re.test(s || "");

export function scoreCheck(check: Check, reply: string, ctx: { child: string; stepDelivery?: boolean }): { pass: boolean; reason: string } {
  const r = reply || "";
  const name = ctx.child;
  const hasName = new RegExp(`\\b${name}\\b`, "i").test(r);
  const asksQuestion = r.includes("?");
  const newTechnique = !!primarySayThis(r); // a fresh "say this" ≥3-word quote = a new technique handed over

  switch (check) {
    case "checkin_first": {
      const asksWhatHappened = q(/\b(did you (get to )?try|were you able to try|what happened|how did (it|that|yesterday|the step) go|what got in the way|what stopped)\b/i, r);
      // Must ask what happened AND not hand over a brand-new technique in the same breath.
      return { pass: asksWhatHappened && !newTechnique, reason: asksWhatHappened ? (newTechnique ? "asked, but also handed a new technique" : "asked what happened, no new technique") : "did not ask what happened first" };
    }
    case "concrete_scene": {
      const scene = q(/\b(picture this|imagine (this )?(evening|tonight)|tonight,? when|here'?s tonight|say it'?s tonight|this evening,)\b/i, r);
      const reAsk = q(/\b(which part|still unclear|is any part|make sense)\b/i, r);
      return { pass: scene && hasName && reAsk, reason: `scene:${scene} name:${hasName} reask:${reAsk}` };
    }
    case "offer_call": {
      const call = q(/\b(call with (us|our team|the team)|hop on a (quick )?call|book a call|jump on a call|set up a call|talk to (us|our team) on a call)\b/i, r);
      return { pass: call, reason: call ? "offered a call" : "did not offer a call on 2nd confusion" };
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

// ── The conversation set (≥10). Parent M (anonymised) is required: missed day → "didn't get it" →
// "it didn't work" → "unable to comprehend". ──
export const CONVERSATIONS: Convo[] = [
  {
    id: "parent_m", title: "Parent M — missed, confused, didn't work, can't comprehend", child: "Uma",
    turns: [
      { parent: "Sorry, I missed yesterday — didn't get a chance to try it.", expect: ["checkin_first", "no_banned", "length"] },
      { parent: "Honestly I didn't really get what I was supposed to do.", expect: ["concrete_scene", "no_banned", "length"] },
      { parent: "Okay I tried it last night but it didn't work, she still wouldn't start.", expect: ["checkin_first", "no_banned", "length"] },
      { parent: "I'm still unable to comprehend this, sorry.", expect: ["offer_call", "no_banned", "length"] },
    ],
  },
  {
    id: "give_me_step", title: "Asks for today's step → 5-part delivery", child: "Aarav",
    turns: [
      { parent: "What's today's step and how do I do it?", expect: ["five_part", "no_banned", "length"], stepDelivery: true },
    ],
  },
  {
    id: "new_day_checkin", title: "Opens a new day → check-in first", child: "Diya",
    turns: [
      { parent: "Good morning, I'm here for today.", expect: ["checkin_first", "no_banned", "length"] },
    ],
  },
  {
    id: "didnt_work_then_ask", title: "It didn't work → ask before adjusting", child: "Reyan",
    turns: [
      { parent: "It didn't work at all yesterday.", expect: ["checkin_first", "no_banned", "length"] },
      { parent: "He just ignored me and kept watching his tablet.", expect: ["no_banned", "length"] },
    ],
  },
  {
    id: "confused_once", title: "Single confusion → concrete scene", child: "Sara",
    turns: [
      { parent: "I don't understand what you mean by giving her the choice.", expect: ["concrete_scene", "no_banned", "length"] },
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
      { parent: "Can you give me three or four techniques to try this week?", expect: ["no_banned", "length"] },
    ],
  },
  {
    id: "metaphor_bait", title: "Parent uses jargon → coach stays plain", child: "Anaya",
    turns: [
      { parent: "How do I anchor this habit so it really locks in?", expect: ["no_banned", "length"] },
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
    id: "worked_then_next", title: "It worked → acknowledge, stay on the day", child: "Mira",
    turns: [
      { parent: "It actually worked yesterday, she started on her own!", expect: ["no_banned", "length"] },
    ],
  },
  {
    id: "partly_worked", title: "Partly worked → one small adjustment only", child: "Dev",
    turns: [
      { parent: "It sort of worked — he started but gave up halfway.", expect: ["checkin_first", "no_banned", "length"] },
    ],
  },
];

export function parentMConvo(): Convo {
  return CONVERSATIONS.find((c) => c.id === "parent_m")!;
}
