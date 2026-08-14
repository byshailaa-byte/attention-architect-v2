// Quality Engine checks — §15 / spec Part 8.
// All functions are pure: no DB, no LLM, no async.
// Each check returns null (passed) or a CheckFailure.
// Multiple failures per check are returned as arrays where noted.
//
// Run order in engine.ts: cheapest structural checks first, expensive last.

import type { AttentionMoment } from "@/lib/narrative/types";
import type { FamilyAttentionLoop } from "@/lib/graph/loop";
import type { HumanDecisionGraph } from "@/lib/graph/types";
import type { CheckFailure } from "./types";

// ── Hedge language patterns (Writing Engine Rule 4) ───────────────────────────
// Used by both checkHypothesisHedge (hypothesis-tier moments)
// and checkUnvalidatedDimensionRouting (unvalidated dimensions in Where We Are Less Certain).
const HEDGE_PATTERNS = [
  /\bit appears\b/i,
  /\bit seems\b/i,
  /\bin the situations\b/i,
  /\bat least sometimes\b/i,
  /\bwhen this happens\b/i,
  /\bmight\b/i,
  /\bcould be\b/i,
  /\bpossibly\b/i,
  /\bit looks like\b/i,
  /\bsuggests\b/i,
  /\btends to\b/i,
  /\bwhat (the evidence|this) (shows|suggests|points)\b/i,
];

function hasHedge(text: string): boolean {
  return HEDGE_PATTERNS.some(p => p.test(text));
}

function countLabel(text: string, label: string): number {
  if (!label) return 0;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(escaped, "gi")) ?? []).length;
}

// ── Check 1: Traceability ─────────────────────────────────────────────────────
// Every generated moment must have at least one cited node.
// A moment at insufficient_evidence tier with substantial content has no traceable basis.
export function checkTraceability(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments) {
    if (m.human_decision_refs.length === 0 && m.behaviour_node_refs.length === 0) {
      return {
        check: "traceability",
        moment_id: m.moment_id,
        reason: `"${m.section}" (${m.moment_id}) has no cited nodes — nothing to trace the prose to`,
      };
    }
    if (m.confidence_tier === "insufficient_evidence" && m.content.trim().length > 50) {
      return {
        check: "traceability",
        moment_id: m.moment_id,
        reason: `"${m.section}" has confidence_tier=insufficient_evidence but contains generated prose`,
      };
    }
  }
  return null;
}

// ── Check 2: Hypothesis hedge ─────────────────────────────────────────────────
// Any moment with confidence_tier="hypothesis" must contain hedge language.
// Direct-evidence tier is not checked in the reverse direction — false positives
// are too common (e.g., "Where We Are Less Certain" naturally hedges).
export function checkHypothesisHedge(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments) {
    if (m.confidence_tier === "hypothesis" && !hasHedge(m.content)) {
      return {
        check: "hypothesis_hedge",
        moment_id: m.moment_id,
        reason: `"${m.section}" is hypothesis-tier but contains no hedge language (Rule 4)`,
      };
    }
  }
  return null;
}

// ── Check 3: Label once ───────────────────────────────────────────────────────
// Archetype label: must NOT appear anywhere in generated moment.content.
// The Behaviour Pattern template (NarrativeReportView BehaviourPatternSection) injects
// "We call this pattern {archetype} — ..." as a hardcoded JSX label line — that is the
// one canonical occurrence. Any mention in LLM prose creates a visible duplicate that
// the quality check would otherwise miss, because the template is outside moment.content.
//
// Parent instinct label:
//   - primary / secondary: must appear exactly once, in the correct section
//     (Family Attention Loop if that section exists; otherwise What This Explains)
//   - weak: may be absent; if present must not appear more than once
//   - no_clear_fit: must not appear at all
export function checkLabelOnce(
  moments: AttentionMoment[],
  archetypeLabel: string,
  parentInstinctLabel: string,
  parentInstinctFitTier: string = "no_clear_fit",
): CheckFailure[] {
  const failures: CheckFailure[] = [];
  const allContent = moments.map(m => m.content).join("\n");

  // Archetype label must be absent from all moment.content — the template adds it.
  const archetypeCount = countLabel(allContent, archetypeLabel);
  if (archetypeCount > 0) {
    // Find the moment(s) containing the label so the engine can regenerate surgically.
    const offendingMoments = moments.filter(m => countLabel(m.content, archetypeLabel) > 0);
    for (const m of offendingMoments) {
      failures.push({
        check: "label_once",
        moment_id: m.moment_id,
        reason: `Archetype label "${archetypeLabel}" must not appear in generated prose — the template provides it as a label line. Found in "${m.section}".`,
      });
    }
  }

  // Parent instinct label checks
  const piCount = countLabel(allContent, parentInstinctLabel);

  // Determine expected section for the parent instinct label
  const hasLoopSection = moments.some(m => m.section === "Family Attention Loop");
  const expectedPiSection = hasLoopSection ? "Family Attention Loop" : "What This Explains";

  if (parentInstinctFitTier === "no_clear_fit") {
    if (piCount > 0) {
      const piMoment = moments.find(m => countLabel(m.content, parentInstinctLabel) > 0);
      failures.push({
        check: "label_once",
        moment_id: piMoment?.moment_id ?? null,
        reason: `no_clear_fit: parent instinct label "${parentInstinctLabel}" must not appear anywhere — found in "${piMoment?.section}"`,
      });
    }
  } else if (parentInstinctFitTier === "primary" || parentInstinctFitTier === "secondary") {
    if (piCount === 0) {
      // Label is required but absent
      const expectedMoment = moments.find(m => m.section === expectedPiSection);
      failures.push({
        check: "label_once",
        moment_id: expectedMoment?.moment_id ?? null,
        reason: `Parent instinct label "${parentInstinctLabel}" must appear exactly once in "${expectedPiSection}" — currently absent from all moments`,
      });
    } else if (piCount > 1) {
      // Appears too many times — find the extra occurrences
      const allPiMoments = moments.filter(m => countLabel(m.content, parentInstinctLabel) > 0);
      const extraPiMoments = allPiMoments.filter(m => m.section !== expectedPiSection);
      if (extraPiMoments.length > 0) {
        for (const m of extraPiMoments) {
          failures.push({
            check: "label_once",
            moment_id: m.moment_id,
            reason: `Parent instinct label "${parentInstinctLabel}" must appear only in "${expectedPiSection}" — found extra occurrence in "${m.section}"`,
          });
        }
      } else {
        // Multiple occurrences within the expected section
        const piMoment = moments.find(m => m.section === expectedPiSection);
        failures.push({
          check: "label_once",
          moment_id: piMoment?.moment_id ?? null,
          reason: `Parent instinct label "${parentInstinctLabel}" appears ${piCount} times in "${expectedPiSection}" — must appear at most once`,
        });
      }
    } else {
      // Exactly once — verify it's in the correct section
      const correctMoment = moments.find(m => m.section === expectedPiSection);
      if (correctMoment && countLabel(correctMoment.content, parentInstinctLabel) === 0) {
        const wrongMoment = moments.find(m => countLabel(m.content, parentInstinctLabel) > 0);
        failures.push({
          check: "label_once",
          moment_id: wrongMoment?.moment_id ?? null,
          reason: `Parent instinct label "${parentInstinctLabel}" must appear in "${expectedPiSection}" — found in "${wrongMoment?.section}" instead`,
        });
      }
    }
  } else {
    // weak tier: optional, but if present must be at most once
    if (piCount > 1) {
      const piExtraMoments = moments.filter(
        m => m.section !== expectedPiSection && countLabel(m.content, parentInstinctLabel) > 0,
      );
      for (const m of piExtraMoments) {
        failures.push({
          check: "label_once",
          moment_id: m.moment_id,
          reason: `Parent instinct label "${parentInstinctLabel}" must appear at most once — found extra occurrence in "${m.section}"`,
        });
      }
    }
  }

  return failures;
}

// ── Check 4: fit_tier compliance ──────────────────────────────────────────────
// Inspects actual generated prose (not the prompt instruction) for tier compliance.
//   no_clear_fit  → archetype name must not appear anywhere in the rendered text
//   weak          → archetype name must not appear in prose (template omits label line for weak)
//   secondary     → archetype name must NOT appear in prose (template provides the label line)
//   primary       → archetype name must NOT appear in prose (template provides the label line)
//
// The label-line ("We call this pattern {archetype}…") is rendered by the template for
// primary/secondary/weak tiers, not by the LLM. checkLabelOnce enforces absence from prose.
// This check only needs to handle no_clear_fit (label forbidden everywhere).
export function checkFitTierCompliance(
  moments: AttentionMoment[],
  archetypeLabel: string,
  fitTier: string,
): CheckFailure | null {
  if (fitTier !== "no_clear_fit") return null;

  const allContent = moments.map(m => m.content).join("\n");
  const labelInFull = countLabel(allContent, archetypeLabel) > 0;
  if (labelInFull) {
    const offending = moments.find(m => countLabel(m.content, archetypeLabel) > 0);
    return {
      check: "fit_tier_compliance",
      moment_id: offending?.moment_id ?? null,
      reason: `no_clear_fit: archetype label "${archetypeLabel}" must not appear anywhere in the prose`,
    };
  }
  return null;
}

// ── Check 5: No week-number roadmap ──────────────────────────────────────────
// Roadmap beat prose must not contain "Week N" / "Week 1" etc.
// This checks actual generated content, not the prompt instruction.
const WEEK_NUMBER = /\bWeek\s*\d+\b/i;

export function checkNoWeekNumberRoadmap(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments.filter(m => m.section.startsWith("Roadmap"))) {
    const match = m.content.match(WEEK_NUMBER);
    if (match) {
      return {
        check: "no_week_number_roadmap",
        moment_id: m.moment_id,
        reason: `Roadmap "${m.section}" contains week-number structure: "${match[0]}"`,
      };
    }
  }
  return null;
}

// ── Check 6: Single pull-quote cap ────────────────────────────────────────────
// A pull-quote is a full paragraph that is entirely wrapped in quotation marks.
// Maximum one across the entire composed report.
const PULLQUOTE_RE = /^[""“”][^""“”\n]{10,}[""“”]$/m;

export function checkSinglePullquote(moments: AttentionMoment[]): CheckFailure | null {
  let count = 0;
  let firstMomentId: string | null = null;

  for (const m of moments) {
    for (const para of m.content.split(/\n+/)) {
      if (PULLQUOTE_RE.test(para.trim())) {
        count++;
        if (firstMomentId === null) firstMomentId = m.moment_id;
      }
    }
  }

  if (count > 1) {
    return {
      check: "single_pullquote",
      moment_id: firstMomentId,
      reason: `${count} pull-quotes detected; maximum is 1 per report`,
    };
  }
  return null;
}

// ── Check 7: Roadmap beat → loop citation ─────────────────────────────────────
// When a loop is detected, every roadmap beat must cite the loop's child_dimension
// via behaviour_node_refs (structural, not prose).
export function checkRoadmapLoopCitation(
  moments: AttentionMoment[],
  loop: FamilyAttentionLoop,
): CheckFailure | null {
  if (!loop.detected || !loop.loop_tension_point) return null;

  const loopDim = loop.loop_tension_point.child_dimension;
  const roadmapMoments = moments.filter(m => m.section.startsWith("Roadmap"));

  for (const m of roadmapMoments) {
    const cited = m.behaviour_node_refs.some(ref => ref.includes(loopDim));
    if (!cited) {
      return {
        check: "roadmap_loop_citation",
        moment_id: m.moment_id,
        reason: `Roadmap "${m.section}" missing loop citation for dimension "${loopDim}"`,
      };
    }
  }
  return null;
}

// ── Check 8: No objective picker ─────────────────────────────────────────────
// The old report had an interactive objective picker. Generated content must not
// include selection UI patterns or invitation to choose objectives.
const OBJECTIVE_PICKER_PATTERNS = [
  /which.{0,20}(matters?|concerns?|bothers?|worries?).{0,20}most/i,
  /select (one|your|an) (objective|concern|topic|goal)/i,
  /choose from (the following|these|below)/i,
  /\[ ?[xX ]? ?\]/,   // checkbox syntax [ ] or [x]
  /^\d+\.\s+\[/m,     // numbered checkbox list
];

export function checkNoObjectivePicker(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments) {
    for (const pattern of OBJECTIVE_PICKER_PATTERNS) {
      if (pattern.test(m.content)) {
        return {
          check: "no_objective_picker",
          moment_id: m.moment_id,
          reason: `"${m.section}" contains objective-picker pattern: ${pattern.toString()}`,
        };
      }
    }
  }
  return null;
}

// ── Check 9: Out-of-scope node reference ─────────────────────────────────────
// Structural safeguard for the relevantQ enforcement fix.
// After the prompt-filtering change, each moment's LLM call only receives HDG nodes
// in its declared scope. This check verifies the output didn't copy verbatim trigger
// or choice text from out-of-scope nodes — catching regressions where the filtering
// breaks. Paraphrases from scoped nodes are expected and not flagged.
//
// dimensionValues: the always-visible BEHAVIOUR DIMENSIONS text (expression.value strings).
// HDG trigger/choice text is often identical to dimension values (the dimension is derived
// from the HDG answer). A match that is also present in dimensionValues is a false positive
// — the LLM saw it through the legitimate dimension block, not the restricted HDG section.
//
// Only checks choice/trigger phrases longer than MIN_PHRASE_LEN to avoid false positives
// from short common phrases (e.g. "avoid", "push through").
const MIN_PHRASE_LEN = 20;

export function checkOutOfScopeNodeReference(
  moments: AttentionMoment[],
  hdg: HumanDecisionGraph,
  dimensionValues: string[] = [],
): CheckFailure | null {
  const dimValuesLower = dimensionValues.map(v => v.toLowerCase());

  for (const m of moments) {
    const scopedIds = new Set(m.human_decision_refs);
    const outOfScopeNodes = hdg.nodes.filter(n => !scopedIds.has(n.id));
    const contentLower = m.content.toLowerCase();

    for (const node of outOfScopeNodes) {
      const choice = node.choice.toLowerCase();
      const trigger = node.trigger.toLowerCase();

      // Skip if the phrase is also in the always-visible dimension block — the LLM
      // legitimately receives that text even when the HDG node is out of scope.
      const choiceInDims = dimValuesLower.some(v => v.includes(choice));
      const triggerInDims = dimValuesLower.some(v => v.includes(trigger));

      if (choice.length >= MIN_PHRASE_LEN && contentLower.includes(choice) && !choiceInDims) {
        return {
          check: "out_of_scope_node_reference",
          moment_id: m.moment_id,
          reason: `"${m.section}" contains verbatim text from out-of-scope node [${node.id}] (source: ${node.source_question}): "${node.choice.slice(0, 60)}…"`,
        };
      }
      if (trigger.length >= MIN_PHRASE_LEN && contentLower.includes(trigger) && !triggerInDims) {
        return {
          check: "out_of_scope_node_reference",
          moment_id: m.moment_id,
          reason: `"${m.section}" contains verbatim trigger text from out-of-scope node [${node.id}] (source: ${node.source_question}): "${node.trigger.slice(0, 60)}…"`,
        };
      }
    }
  }
  return null;
}

// ── Check 11: Unvalidated dimension routing ───────────────────────────────────
// Any dimension with real evidence but validated:false must:
//   (a) appear by label in "Where We Are Less Certain" (routing check), and
//   (b) that section must contain hedge language (assertion check).
// This is the same category as checkHypothesisHedge: a prompt instruction to hedge
// is not a guarantee — the rendered output must be verified independently.
export function checkUnvalidatedDimensionRouting(
  moments: AttentionMoment[],
  unvalidatedActiveDimLabels: string[],
): CheckFailure | null {
  if (unvalidatedActiveDimLabels.length === 0) return null;

  const uncertainMoment = moments.find(m => m.section === "Where We Are Less Certain");
  if (!uncertainMoment) {
    return {
      check: "unvalidated_dimension_routing",
      moment_id: null,
      reason: `Unvalidated dimension(s) [${unvalidatedActiveDimLabels.join(", ")}] have real evidence but "Where We Are Less Certain" section is missing`,
    };
  }

  for (const label of unvalidatedActiveDimLabels) {
    if (!uncertainMoment.content.toLowerCase().includes(label.toLowerCase())) {
      return {
        check: "unvalidated_dimension_routing",
        moment_id: uncertainMoment.moment_id,
        reason: `Unvalidated dimension "${label}" has real evidence but does not appear in "Where We Are Less Certain" — may be asserting unhedged in another section`,
      };
    }
  }

  if (!hasHedge(uncertainMoment.content)) {
    return {
      check: "unvalidated_dimension_routing",
      moment_id: uncertainMoment.moment_id,
      reason: `"Where We Are Less Certain" contains unvalidated dimension content but no hedge language detected`,
    };
  }

  return null;
}

// ── Check 12: Clinical language (Rule 6) ─────────────────────────────────────
// Scans generated prose for prohibited diagnostic/clinical register terms.
// The Writing Engine Rule 6 bans a specific list. "anxiety", "risk", "level",
// "score", "rating", and "clinical" are excluded — too common in everyday
// parenting English, too many false positives without additional context.
// The terms below are unambiguous diagnostic vocabulary in any context.
const CLINICAL_RE =
  /\b(diagnos(?:is|ed|es|ing)|adhd|autism|autistic|disorder|symptom|severity|patholog(?:y|ical)|percentile|co-?regulation|executive\s+function|neurodivergent|neurodivergence|spectrum)\b/i;

export function checkClinicalLanguage(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments) {
    const match = m.content.match(CLINICAL_RE);
    if (match) {
      return {
        check: "clinical_language",
        moment_id: m.moment_id,
        reason: `"${m.section}" contains prohibited clinical/diagnostic term: "${match[0]}"`,
      };
    }
  }
  return null;
}

// ── Check 13: Blame framing (Rule 5) ─────────────────────────────────────────
// Parent instinct is always framed as care redirected, never error or fault.
// Patterns below target explicit attribution of blame or failure to the parent.
// "push" and "pushing" are intentionally NOT included — they appear legitimately
// in loop descriptions as behavioural descriptors, not as blame charges.
const BLAME_PATTERNS = [
  /\byou['']?ve? (caused|created|made) (this|the) (problem|struggle|difficulty|pattern)\b/i,
  /\byour (fault|mistake|error|failure)\b/i,
  /\byou (failed|didn['']t) (see|understand|notice|recogni[sz]e)\b/i,
  /\b(harmful|damaging) (approach|response|instinct|pattern)\b/i,
  /\bwrong (approach|response|instinct)\b/i,
  /\bwhy this (didn['']t|doesn['']t) work\b/i,
];

export function checkBlameFraming(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments) {
    for (const pattern of BLAME_PATTERNS) {
      const match = m.content.match(pattern);
      if (match) {
        return {
          check: "blame_framing",
          moment_id: m.moment_id,
          reason: `"${m.section}" contains blame-coded framing: "${match[0]}"`,
        };
      }
    }
  }
  return null;
}

// ── Check 14: Early action content (Rule 3) ───────────────────────────────────
// Action-imperative phrasing belongs only in Roadmap beats (moment_type "action").
// Pre-understanding sections (recognition, reflection, insight, hope, reframing)
// must not contain steps, directives, or "try this" language.
// Pattern kept tight to avoid false positives from Hope/Future Story forward-
// looking language ("one day", "what becomes possible", etc.).
const EARLY_ACTION_RE =
  /\b(try this|start by|begin by|here['']?s (how|what to do)|step \d+|first step|next step|practice (this|it)|you could (try|start|begin)|introduce (this|a|the))\b/i;

export function checkEarlyActionContent(moments: AttentionMoment[]): CheckFailure | null {
  for (const m of moments.filter(m => m.moment_type !== "action")) {
    const match = m.content.match(EARLY_ACTION_RE);
    if (match) {
      return {
        check: "early_action_content",
        moment_id: m.moment_id,
        reason: `Non-roadmap section "${m.section}" contains action-imperative phrasing: "${match[0]}"`,
      };
    }
  }
  return null;
}

// ── Check 15: Recognition ordering (Rule 2) ───────────────────────────────────
// A recognition-type moment must precede the first insight-type moment.
// compose-report.ts enforces this via hardcoded ordering, so failures here
// signal a future regression in composition, not a prompt problem.
export function checkRecognitionOrdering(moments: AttentionMoment[]): CheckFailure | null {
  const recognitionIdx = moments.findIndex(m => m.moment_type === "recognition");
  if (recognitionIdx === -1) {
    return {
      check: "recognition_ordering",
      moment_id: null,
      reason: "No recognition-type moment found in report",
    };
  }
  const firstInsightIdx = moments.findIndex(m => m.moment_type === "insight");
  if (firstInsightIdx !== -1 && firstInsightIdx < recognitionIdx) {
    return {
      check: "recognition_ordering",
      moment_id: moments[firstInsightIdx].moment_id,
      reason: `Insight moment at index ${firstInsightIdx} appears before recognition moment at index ${recognitionIdx} — compose-report ordering may have regressed`,
    };
  }
  return null;
}

// ── Check 12: Opening/metaphor similarity ─────────────────────────────────────
// The Recognition section must not be too similar to prior reports.
// Uses Jaccard similarity on meaningful word tokens (length > 3).
// priorRecognitionTexts: Recognition content from the last N generated reports.
// threshold: Jaccard ≥ 0.40 triggers a failure.
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── Check 16: m_teaser label absence ─────────────────────────────────────────
// m_teaser must not name any of the 8 child archetypes or 4 parent instinct patterns.
// These labels appear in the report body — naming them in the pre-payment teaser breaks
// the reveal sequence and violates the HARD RULES in the teaser's generation spec.
const ALL_ARCHETYPE_LABELS = [
  "The All-In Kid", "The Inventor", "The Explorer", "The Magnet",
  "The Glue",       "The Captain",  "The Live Wire", "The Storm",
];
const ALL_INSTINCT_LABELS = [
  "The Quick Fixer", "The Pusher", "The Negotiator", "The Steady Hand",
];
const ALL_TYPE_LABELS = [...ALL_ARCHETYPE_LABELS, ...ALL_INSTINCT_LABELS];

export function checkTeaserLabelAbsence(moments: AttentionMoment[]): CheckFailure | null {
  const teaser = moments.find(m => m.moment_id === "m_teaser");
  if (!teaser) return null;
  for (const label of ALL_TYPE_LABELS) {
    if (countLabel(teaser.content, label) > 0) {
      return {
        check: "teaser_label_absence",
        moment_id: teaser.moment_id,
        reason: `m_teaser must not name any archetype or parent instinct — found "${label}"`,
      };
    }
  }
  return null;
}

// ── Check 17: m_teaser similarity ────────────────────────────────────────────
// m_teaser must not drift toward a generic template across reports.
// Uses the same Jaccard similarity approach as checkOpeningSimilarity.
// priorTeaserTexts: m_teaser content from the last N generated reports.
export function checkTeaserSimilarity(
  moments: AttentionMoment[],
  priorTeaserTexts: string[],
  threshold = 0.40,
): CheckFailure | null {
  const teaser = moments.find(m => m.moment_id === "m_teaser");
  if (!teaser || priorTeaserTexts.length === 0) return null;
  const currentTokens = tokenize(teaser.content);
  for (const prior of priorTeaserTexts) {
    const priorTokens = tokenize(prior);
    const similarity = jaccardSimilarity(currentTokens, priorTokens);
    if (similarity >= threshold) {
      return {
        check: "teaser_similarity",
        moment_id: teaser.moment_id,
        reason: `m_teaser too similar to a prior teaser (Jaccard: ${similarity.toFixed(2)}, threshold: ${threshold}) — likely drifting to a generic template`,
      };
    }
  }
  return null;
}

export function checkOpeningSimilarity(
  moments: AttentionMoment[],
  priorRecognitionTexts: string[],
  threshold = 0.40,
): CheckFailure | null {
  const recognition = moments.find(m => m.section === "Recognition");
  if (!recognition || priorRecognitionTexts.length === 0) return null;

  const currentTokens = tokenize(recognition.content);
  for (const prior of priorRecognitionTexts) {
    const priorTokens = tokenize(prior);
    const similarity = jaccardSimilarity(currentTokens, priorTokens);
    if (similarity >= threshold) {
      return {
        check: "opening_similarity",
        moment_id: recognition.moment_id,
        reason: `Recognition section too similar to a prior report (Jaccard: ${similarity.toFixed(2)}, threshold: ${threshold})`,
      };
    }
  }
  return null;
}
