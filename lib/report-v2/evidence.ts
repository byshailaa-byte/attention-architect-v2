// Deterministic evidence selection for Report v2 §3: the 3 of the parent's OWN answers
// that most drove the archetype. Pure + deterministic: same inputs → same 3, in the same
// order. "Most drove the archetype" = the dimensions ranked by winning_votes (how strongly
// that dimension pointed), tie-broken by dimension name; one answer per dimension, in that
// order, backfilled in sequence order if fewer than 3 distinct dimensions answered.
import { displayChildName, buildPronounTokens, type Gender } from "@/lib/report/pronouns";
import { bareArchetype } from "./v3-copy";
import type { EvidenceItem } from "./types";

export type AnsweredQuestion = { id: string; dimension: string; label: string; value?: string };
export type DimScore = { dimension: string; winning_votes: number };

// ════════════════════════════════════════════════════════════════════════════════
// EVIDENCE SELECTION RULE (card 3 must BACK the conclusion "{Name} needs {NEED}")
// ────────────────────────────────────────────────────────────────────────────────
// Card 3 concludes "{Name} needs {NEED[archetype]}". The 3 "YOU TOLD US" lines shown above it
// MUST point at that same need — never at a different archetype's need (which previously let
// e.g. an All-In Kid ["time to go deep"] show "light up when people notice" + "a new idea pulls
// them away", directly contradicting the conclusion).
//
// Selection, per archetype:
//   1. PREFER answers whose (qid, optionValue) is in that archetype's SUPPORTING set — the
//      option values that directly express its NEED/mechanism (derived from the scorer's
//      shape×driver grid + WHY_BOXES). Keep them in dimension-rank order.
//   2. NEVER include an answer whose (qid, optionValue) is in that archetype's CONTRADICTING set
//      — a value that points to a DIFFERENT archetype's need/mechanism.
//   3. If ≥3 supporting answers exist → show the top 3. If exactly 2 → show 2. If <2 → fall back
//      to the current top-dimension picks, but STILL drop any contradicting answer.
// The number shown (3 or 2) is echoed by card 3's closing count ("Three/Two different answers").
// ════════════════════════════════════════════════════════════════════════════════

// The archetype each option VALUE most expresses, per dimension group. Keyed by the shared
// option value; drives both the supporting and contradicting sets below.
//   attention_shape (G1, D1.1, D1.2): narrow-deep → deep-focus archetypes; wide-shifting →
//     roving; social-anchored → people-anchored; sensation-seeking → stimulation-driven.
//   reward_driver (D2.*): mastery / novelty / social / autonomy.
//   recovery_response (R1-R3): autonomous/responsive → self-restarts (deep, in-charge needs).
// A value "supports" an archetype when it is one of that archetype's defining mechanism values;
// it "contradicts" when it is a DIFFERENT archetype's defining value in the SAME dimension.
const SHAPE_Q = ["G1", "D1.1", "D1.2"];
const DRIVER_Q = ["D2.1", "D2.2", "D2.3", "D2.confirm"];
const RECOVERY_Q = ["R1", "R2", "R3"];
const FRICTION_Q = ["D3.1", "D3.2", "D3.3", "D3.confirm"];
const RECHARGE_Q = ["D6.1", "D6.2", "D6.3", "D6.confirm"];

// Per-archetype supporting values, by dimension group. Derived from the scorer grid
// (lib/engine/scorer.ts ARCHETYPE_GRID: shape×driver) and NEED/WHY_BOXES meaning.
type Support = { shape?: string[]; driver?: string[]; recovery?: string[]; friction?: string[]; recharge?: string[] };
const SUPPORT: Record<string, Support> = {
  // narrow-deep × mastery; "time to go deep" — deep focus + self-restart.
  "All-In Kid": { shape: ["narrow-deep"], driver: ["mastery"], recovery: ["autonomous", "responsive"] },
  // narrow-deep × autonomy; "room to do things his own way".
  "Inventor":   { shape: ["narrow-deep"], driver: ["autonomy"], recovery: ["autonomous"] },
  // wide-shifting × novelty; "room to follow ideas".
  "Explorer":   { shape: ["wide-shifting"], driver: ["novelty"] },
  // wide-shifting × social; "someone nearby".
  "Magnet":     { shape: ["wide-shifting", "social-anchored"], driver: ["social"], friction: ["support-seek"] },
  // social-anchored × social; "calm and connection first".
  "Glue":       { shape: ["social-anchored"], driver: ["social"], friction: ["support-seek"], recharge: ["social-connection"] },
  // social-anchored × mastery; "something truly his to run" — in-charge + autonomy.
  "Captain":    { shape: ["social-anchored"], driver: ["mastery", "autonomy"], recovery: ["autonomous"] },
  // sensation-seeking × novelty; "something happening right now".
  "Live Wire":  { shape: ["sensation-seeking"], driver: ["novelty"], friction: ["energized"] },
  // sensation-seeking × autonomy; "a real say".
  "Storm":      { shape: ["sensation-seeking"], driver: ["autonomy"], recovery: ["autonomous"] },
};

// Build the {qid:value} membership sets for an archetype: SUPPORTING = that archetype's own
// values across the relevant question ids; CONTRADICTING = every OTHER value in a dimension the
// archetype cares about (a value that points to a different archetype's need). We only mark a
// dimension's non-supporting values as contradicting when the archetype actually has supporting
// values in that dimension (so we don't penalise dimensions the archetype is neutral on).
const SHAPE_VALUES = ["narrow-deep", "wide-shifting", "social-anchored", "sensation-seeking"];
const DRIVER_VALUES = ["mastery", "novelty", "social", "autonomy"];
const RECOVERY_VALUES = ["autonomous", "responsive", "dependent", "stopped"];
const FRICTION_VALUES = ["avoid", "solo-push", "support-seek", "emotional-derail", "energized"];
const RECHARGE_VALUES = ["sensory-quiet", "social-connection", "cognitive-displacement", "autonomous-unstructured"];

function membershipSets(bare: string): { supporting: Set<string>; contradicting: Set<string> } {
  const s = SUPPORT[bare] ?? {};
  const supporting = new Set<string>();
  const contradicting = new Set<string>();
  const add = (qids: string[], values: string[], target: Set<string>) => {
    for (const q of qids) for (const v of values) target.add(`${q}:${v}`);
  };
  const group = (qids: string[], allValues: string[], supportVals: string[] | undefined) => {
    if (!supportVals || supportVals.length === 0) return; // archetype neutral on this dimension
    add(qids, supportVals, supporting);
    add(qids, allValues.filter((v) => !supportVals.includes(v)), contradicting);
  };
  group(SHAPE_Q, SHAPE_VALUES, s.shape);
  group(DRIVER_Q, DRIVER_VALUES, s.driver);
  group(RECOVERY_Q, RECOVERY_VALUES, s.recovery);
  group(FRICTION_Q, FRICTION_VALUES, s.friction);
  group(RECHARGE_Q, RECHARGE_VALUES, s.recharge);
  return { supporting, contradicting };
}

const LEAD_IN: Record<string, string> = {
  attention_shape:       "You said what pulls {Name} in is",
  reward_driver:         "You said what lights {Name} up is",
  friction_response:     "You said when it gets hard, {Name}",
  recharge_type:         "You said {Name} resets by",
  attention_competition: "You said what pulls {Name} away is",
};

export function rankDimensions(dims: DimScore[]): string[] {
  return [...dims]
    .sort((a, b) => b.winning_votes - a.winning_votes || a.dimension.localeCompare(b.dimension))
    .map((d) => d.dimension);
}

export function selectEvidence(
  answered: AnsweredQuestion[],
  dimRank: string[],
  name: string,
  gender: Gender,
  archetype?: string | null,
): EvidenceItem[] {
  const nm = name.trim() ? displayChildName(name) : "your child";
  const t = buildPronounTokens(gender, nm);
  const leadFor = (dim: string) =>
    (LEAD_IN[dim] ?? "You said {Name}")
      .replace(/\{Name\}/g, nm)
      .replace(/\{they\}/g, t.child_pronoun_subj);

  // Card 3 shows the CHILD's own answers — never the parent_instinct question (about the parent).
  const childAnswers = answered.filter((a) => a.dimension !== "parent_instinct");
  const childRank = dimRank.filter((d) => d !== "parent_instinct");

  // SELECTION RULE (see header): prefer the archetype's SUPPORTING answers, never show a
  // CONTRADICTING one, show 3 if ≥3 support else 2 if exactly 2, else backfill top-dimension
  // picks (minus contradictors). `archetype` is optional so legacy callers keep the old pick.
  const { supporting, contradicting } = archetype
    ? membershipSets(bareArchetype(archetype))
    : { supporting: new Set<string>(), contradicting: new Set<string>() };
  const key = (a: AnsweredQuestion) => `${a.id}:${a.value ?? ""}`;
  const isSupporting = (a: AnsweredQuestion) => supporting.has(key(a));
  const isContradicting = (a: AnsweredQuestion) => contradicting.has(key(a));
  // A "foreign signature" = a shape/driver signature value (narrow-deep, novelty, social, …) that
  // is NOT one of THIS archetype's own values — it points to a different archetype's need REGARDLESS
  // of which question it came from (e.g. G2's "novelty" for an All-In Kid, a dimension the
  // contradicting set doesn't cover). Never backfill card 3 with these.
  const ownSigVals = new Set<string>(archetype ? Object.values(SUPPORT[bareArchetype(archetype)] ?? {}).flat() : []);
  const SIGNATURE_VALUES = new Set<string>([...SHAPE_VALUES, ...DRIVER_VALUES]);
  const isForeignSignature = (a: AnsweredQuestion) =>
    !!archetype && a.value != null && SIGNATURE_VALUES.has(a.value) && !ownSigVals.has(a.value);

  // Rank-ordered, one-per-dimension sweep over a candidate pool (drops contradictors).
  const sweep = (pool: AnsweredQuestion[], picked: AnsweredQuestion[], used: Set<string>, cap: number) => {
    for (const dim of childRank) {
      if (picked.length >= cap) break;
      const hit = pool.find((a) => a.dimension === dim && !used.has(a.id));
      if (hit) { picked.push(hit); used.add(hit.id); }
    }
    for (const a of pool) { // backfill in sequence order
      if (picked.length >= cap) break;
      if (!used.has(a.id)) { picked.push(a); used.add(a.id); }
    }
  };

  let picked: AnsweredQuestion[];
  if (archetype) {
    const supportPool = childAnswers.filter((a) => isSupporting(a) && !isContradicting(a));
    const supportPicked: AnsweredQuestion[] = [];
    sweep(supportPool, supportPicked, new Set<string>(), 3);
    if (supportPicked.length >= 2) {
      // ≥3 → show 3, exactly 2 → show 2.
      picked = supportPicked.slice(0, supportPicked.length >= 3 ? 3 : 2);
    } else {
      // <2 supporting → fall back to top-dimension picks, dropping contradictors AND any
      // foreign-signature answer (so card 3 never shows a value pointing to another archetype).
      const safePool = childAnswers.filter((a) => !isContradicting(a) && !isForeignSignature(a));
      const fb: AnsweredQuestion[] = [];
      const used = new Set<string>();
      sweep(safePool, fb, used, 3);
      picked = fb.slice(0, 3);
    }
  } else {
    const fb: AnsweredQuestion[] = [];
    sweep(childAnswers, fb, new Set<string>(), 3);
    picked = fb.slice(0, 3);
  }

  // qid + optionValue thread the pick's question id and chosen option value onto the item for
  // v3's card-3 PLAIN_ANSWER lookup; leadIn/quote/dim stay for the v1/v2 consumers.
  return picked.map((a) => ({
    leadIn: leadFor(a.dimension), quote: a.label, dim: a.dimension, qid: a.id, optionValue: a.value,
  }));
}
