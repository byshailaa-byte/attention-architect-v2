// Report composition orchestrator — §7 of the Report Engine Architecture.
//
// Canonical sequence: Cover → Recognition → Behaviour Pattern → Family Attention Loop →
// What This Explains → Where We Are Less Certain → Hope → Future Story → Roadmap →
// [Founder's Note / Testimonials / FAQ / Final Invitation / Footer are static, not generated here]
//
// Each section is one (or more) per-Moment LLM calls. Sections run sequentially to
// allow continuity — the prior moment's prose is summarised and passed forward.
//
// Node IDs stored in Moments are for the Quality Engine. They never appear in prose.

import { generateMoment, type MomentSpec } from "./generate-moment";
import type { NarrativeContext } from "./context";
import { hdgNodesForQuestions, bgNodeIdsForDims } from "./context";
import { effectiveTier } from "@/lib/graph/signature";
import type { AttentionMoment, ComposedReport, ComposeOutput } from "./types";

// Canonical bold phrases for Behaviour Pattern — keyed by archetype and mirroring the
// ARCHETYPE_SIGNALS chip values in NarrativeReportView.tsx. Both sources must stay in sync:
// if one changes, the other must too, or the chip and the bolded prose will diverge again.
const ARCHETYPE_BOLD_PHRASES: Record<string, readonly [string, string, string]> = {
  "The Captain": [
    "Figuring out something really hard",
    "Knowing they got better at something",
    "Quiet time after getting something done",
  ],
};

// Summarise the most recently generated prose for continuity chaining.
// Keeps it short so it doesn't dominate the next call's context.
function summarisePrior(moments: AttentionMoment[]): string {
  if (moments.length === 0) return "";
  const last = moments[moments.length - 1];
  // Truncate to ~200 chars for context economy
  const truncated = last.content.length > 200
    ? last.content.slice(0, 197) + "…"
    : last.content;
  return `[${last.section}]: ${truncated}`;
}

// Best confidence tier across a set of dimensions (direct_evidence > framework_interpretation > hypothesis > insufficient_evidence).
// Uses effectiveTier so that unvalidated dimensions (e.g. support_response) are capped at
// framework_interpretation and cannot elevate a moment to direct_evidence confidence.
function bestTierFor(ctx: NarrativeContext, dims: string[]): AttentionMoment["confidence_tier"] {
  const dimSet = new Set(dims);
  const found = ctx.sig.dimensions.filter(d => dimSet.has(d.dimension) && d.evidence_tier !== "insufficient_evidence");
  if (found.some(d => effectiveTier(d) === "direct_evidence")) return "direct_evidence";
  if (found.some(d => effectiveTier(d) === "framework_interpretation")) return "framework_interpretation";
  if (found.some(d => effectiveTier(d) === "hypothesis")) return "hypothesis";
  return "insufficient_evidence";
}

// Evidence text for a set of HDG questions — what gets passed to the LLM to draw from.
function evidenceLines(ctx: NarrativeContext, questionIds: string[]): string[] {
  return hdgNodesForQuestions(ctx, questionIds).map(
    n => `${n.trigger} → ${n.choice} (${n.context})`
  );
}

export async function composeReport(ctx: NarrativeContext): Promise<ComposeOutput> {
  const moments: AttentionMoment[] = [];
  const specs: Record<string, MomentSpec> = {};

  // Registers a spec for Quality Engine regeneration and returns it unchanged.
  function track(spec: MomentSpec): MomentSpec {
    specs[spec.momentId] = spec;
    return spec;
  }

  // ── 1. Recognition ────────────────────────────────────────────────────────
  // Purpose: make the parent recognise a specific, lived scene before interpretation.
  // Evidence: gateway answers (G1, G2) — the most direct, observed behaviours.
  {
    const relevantQ = ["G1", "G2"];
    const moment = await generateMoment(
      track({
        momentId: "m_01",
        momentType: "recognition",
        section: "Recognition",
        purpose: "make the parent recognise a specific, lived scene before any interpretation is offered",
        emotionalObjective: "recognition, not persuasion",
        confidenceTier: bestTierFor(ctx, ["attention_shape", "attention_competition"]),
        behaviourNodeRefs: bgNodeIdsForDims(ctx, ["attention_shape", "attention_competition"]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: evidenceLines(ctx, relevantQ),
        additionalInstruction:
          `Begin your response with: TITLE: [a short evocative phrase naming what the parent recognises — e.g. "The kind of gone that isn't really gone"]\n\n` +
          `Then write the recognition prose across THREE distinct paragraphs:\n\n` +
          `Paragraph 1 — Open with a specific scene the parent has actually lived. Draw directly from the evidence text above, using near-verbatim language from the answers. Name what ${ctx.childName} does in concrete, observable terms. No explanation yet — just the scene.\n\n` +
          `Paragraph 2 — Develop the observation. Show a second angle or moment that extends the picture from paragraph 1. What else does the parent see? What is the shape of it from another vantage point? Still no interpretation — more scene.\n\n` +
          `Paragraph 3 — Near the close, name the parent's stated concerns by their exact words (bold them using **word** format). ` +
          (ctx.concerns.length >= 2
            ? `The concerns are: ${ctx.concerns.slice(0, 2).map(c => `"${c}"`).join(" and ")}. ` +
              `Write: "You've watched this often enough that **${ctx.concerns[0]}** and **${ctx.concerns[1]}** are the two words you brought here." Then add 1–2 sentences showing why those words are understandable from the observed scene — without resolving them yet.`
            : ctx.concerns.length === 1
            ? `The concern is: "${ctx.concerns[0]}". Name it directly by that word (bolded), then add 1–2 sentences showing why that word is understandable from the observed scene.`
            : `Name the most central observed behaviour as the parent's implicit concern, then show why it's understandable from the scene.`) +
          `\n\nThen, on its own line after a blank line, a single short anchor sentence that reframes everything above as a pattern — not a diagnosis, not an explanation. Format: [anchor sentence standing alone, < 200 characters]`,
        wordTarget: "180–250 words total (including anchor line) — three distinct paragraphs. Do not compress into fewer than three paragraphs.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 2. Behaviour Pattern ──────────────────────────────────────────────────
  // Purpose: name the pattern. First use of archetype label — ONLY if fit tier supports it.
  // Tier-gated: weak → hedge; no_clear_fit → omit label, describe observable pattern only.
  {
    const relevantQ = ["G1", "D1.1", "D1.2", "D2.1", "D2.2", "D2.3", "D2.confirm"];
    const tier = ctx.archetypeFitTier;

    const archetypeInstruction =
      tier === "no_clear_fit"
        ? `Do NOT name an archetype label anywhere in the prose. The evidence for this family doesn't resolve clearly to one type. ` +
          `Describe the observable pattern from the graph data — what ${ctx.childName} does when engaged, ` +
          `what drives ${ctx.pronouns.obj}, what friction looks like — without forcing a label onto it. ` +
          `The parent should come away with a clearer picture of the behaviour, not a named category.`
        : tier === "weak"
        ? `Describe the observed behaviours from the evidence first — what ${ctx.childName} does, what matters to ${ctx.pronouns.obj}, what drains ${ctx.pronouns.obj}. ` +
          `At the very end (final sentence only), you may name the pattern loosely: "The closest pattern we'd point to is ${ctx.archetype}" or "what the evidence most points toward is ${ctx.archetype}." ` +
          `Frame it as approximate, not a confident identification.`
        : tier === "secondary"
        ? `Describe the behavior thoroughly from the evidence first — what ${ctx.childName} does when engaged, what ${ctx.pronouns.subj} is protecting, how ${ctx.pronouns.subj} recovers. ` +
          `At the very end (final sentence), name the pattern: "This is ${ctx.childName}'s version of ${ctx.archetype} — [brief clause from the evidence]." ` +
          `The fit is genuine but not the strongest possible — you may note this briefly.`
        : /* primary */
          `Describe the behavior thoroughly from the evidence first — what ${ctx.childName} does when engaged, what ${ctx.pronouns.subj} is protecting, how ${ctx.pronouns.subj} recovers. ` +
          `At the very end (final sentence), name the pattern as a natural conclusion: "This is ${ctx.childName}'s version of ${ctx.archetype} — [brief clause from the evidence]." ` +
          `The label is a shorthand, not a verdict.`;

    const moment = await generateMoment(
      track({
        momentId: "m_02",
        momentType: "reflection",
        section: "Behaviour Pattern",
        purpose: "name the child's core behavioural pattern from graph evidence without labelling them clinically",
        emotionalObjective: "clarity, not diagnosis",
        confidenceTier: bestTierFor(ctx, ["attention_shape", "reward_driver"]),
        behaviourNodeRefs: bgNodeIdsForDims(ctx, ["attention_shape", "reward_driver", "friction_response"]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: evidenceLines(ctx, relevantQ),
        priorContext: summarisePrior(moments),
        additionalInstruction: (() => {
          const boldPhrases = ARCHETYPE_BOLD_PHRASES[ctx.archetype];
          const boldInstruction = boldPhrases
            ? `Use **bold** for EXACTLY these three phrases — incorporate these exact words into your prose: **${boldPhrases[0]}**, **${boldPhrases[1]}**, **${boldPhrases[2]}**.`
            : `Use **bold** for EXACTLY THREE phrases that name the three positive defining traits: (1) what fully absorbs or lights the child up, (2) what the child cares most about in how they do things, (3) what restores the child afterward. Bold ONLY those three positive traits — not what drains, frustrates, or exhausts the child.`;
          return (
            `Begin your response with: TITLE: [a short evocative phrase naming the pattern from the child's perspective — e.g. "What he's actually protecting"]\n\n` +
            `Then write the pattern prose.\n\n` +
            archetypeInstruction +
            `\n\nAnchor every claim to the specific evidence above — use the actual trigger/choice language where possible, not a paraphrase. ` +
            boldInstruction
          );
        })(),
        wordTarget: "100–140 words — concrete, evidence-anchored, not exhaustive.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 3. Family Attention Loop (only if detected) ───────────────────────────
  // Purpose: explain the cross-person loop. No blame.
  if (ctx.loop.detected && ctx.loop.loop_tension_point) {
    const tp = ctx.loop.loop_tension_point;
    const relevantQ = [
      "G3", "P1", "P2",
      // Add the child-side question most relevant to the loop's child dimension
      tp.child_dimension === "friction_response" ? "D3.1" : "",
      tp.child_dimension === "reward_driver"      ? "D2.3" : "",
      tp.child_dimension === "recharge_type"      ? "D6.1" : "D6.confirm",
    ].filter(Boolean);

    const parentInstinctStr = ctx.parentInstinct.replace("The ", "").toLowerCase();
    const piTier = ctx.parentInstinctFitTier;

    // Gate parent instinct label on fit tier, same discipline as archetype.
    const piLabel =
      piTier === "no_clear_fit"
        ? `the parent's observed response to ${ctx.childName}'s difficulty`
        : piTier === "weak"
        ? `what looks like a ${parentInstinctStr} pattern (though the evidence is mixed)`
        : ctx.parentInstinct; // secondary or primary: name it directly

    const moment = await generateMoment(
      track({
        momentId: "m_03",
        momentType: "insight",
        section: "Family Attention Loop",
        purpose: "explain the cross-person loop where parent instinct and child pattern create a recurring cycle",
        emotionalObjective: "understanding without guilt",
        confidenceTier: bestTierFor(ctx, [tp.parent_dimension, tp.child_dimension]),
        behaviourNodeRefs: [
          ...bgNodeIdsForDims(ctx, [tp.parent_dimension, tp.child_dimension]),
        ],
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: [
          `Loop mechanism: ${tp.mechanism}`,
          `Loop description: ${ctx.loop.loop_description ?? ""}`,
          ...evidenceLines(ctx, relevantQ),
        ],
        priorContext: summarisePrior(moments),
        additionalInstruction:
          `Begin your response with: TITLE: [a short evocative phrase naming what this loop looks like from the outside]\n\n` +
          `Then write the loop prose.\n\n` +
          `Explain the loop: how ${piLabel} ` +
          `meets ${ctx.childName}'s ${tp.child_dimension.replace(/_/g, " ")} pattern and creates a cycle. ` +
          `The parent is not at fault — the loop is something that happens to both people. ` +
          `Do not say "the problem is" — say "the pattern that keeps repeating is" or similar. ` +
          `Name the loop without making either party the villain.\n\n` +
          (piTier === "primary" || piTier === "secondary"
            ? `IMPORTANT: You must use the exact phrase "${ctx.parentInstinct}" once — and only once — somewhere in your loop prose (not the TITLE, not the pull-quote). This is the only section of the entire report where this label is introduced. Do not name it anywhere else.\n\n`
            : "") +
          `End with a single pull-quote-worthy closing sentence on its own line after a blank line — ` +
          `a precise, non-generic insight that names the tension exactly. ` +
          `Format: [pull-quote sentence standing alone]`,
        wordTarget: "100–140 words (including pull-quote line) — specific to this loop, not generic.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 4. What This Explains ─────────────────────────────────────────────────
  // Purpose: connect the pattern to common difficult situations.
  // Evidence: the two weakest axes + any friction/competition dimensions.
  {
    const weakDims = ctx.scoring.weakest_two.map((axis: string) => {
      const map: Record<string, string> = {
        Stability: "attention_shape",
        Resistance: "attention_competition",
        Recovery: "recharge_type",
      };
      return map[axis] ?? "attention_shape";
    });
    // For no-loop reports with a clear parent instinct, include G3/P1/P2 so the LLM
    // has the parent's actual response behavior as evidence (needed for pair 3 and PARENT_LABEL).
    const noLoopPiEvidence = !ctx.loop.detected && ctx.parentInstinctFitTier !== "no_clear_fit";
    const relevantQ = noLoopPiEvidence
      ? ["G2", "D3.1", "D3.2", "D5.1", "D5.2", "G3", "P1", "P2"]
      : ["G2", "D3.1", "D3.2", "D5.1", "D5.2"];

    // When no-loop: pair 3 is about the parent's response pattern (establishing the behavior
    // before the label names it). Loop reports introduce the label in FAL — no pair 3 change needed.
    const thirdPairInstruction = noLoopPiEvidence
      ? `BELIEVED: [One sentence — something this parent has assumed about their own response when ${ctx.childName} struggles: what they thought their instinct was doing for the child.]\n` +
        `ACTUALLY: [One sentence — what the G3/P1/P2 evidence shows about what this parent actually does in those moments: their specific response behavior, in lived concrete terms.]\n\n`
      : `BELIEVED: [Third recurring thought.]\n` +
        `ACTUALLY: [What's more likely true.]\n\n`;

    // PARENT_LABEL line follows pair 3 which has already established the parent behavior —
    // so the label only needs to NAME the pattern, not re-describe it.
    const noLoopPiInstruction = noLoopPiEvidence
      ? (() => {
          const piTier = ctx.parentInstinctFitTier;
          const piLabel =
            piTier === "weak"
              ? `what looks like a ${ctx.parentInstinct.replace("The ", "").toLowerCase()} pattern (though the evidence is mixed)`
              : ctx.parentInstinct;
          return (
            `After the three pairs, add ONE final line in this exact format:\n` +
            `PARENT_LABEL: [A single sentence. The pair above has already shown the behavior — now name it: "The kind of instinct we'd call ${piLabel}." This is the ONLY place in the report where this label may appear — do not include it anywhere else.]`
          );
        })()
      : "";

    const moment = await generateMoment(
      track({
        momentId: "m_04",
        momentType: "insight",
        section: "What This Explains",
        purpose: "connect the pattern to the difficult situations this parent has actually lived through",
        emotionalObjective: "recognition extended — 'that's why this keeps happening'",
        confidenceTier: bestTierFor(ctx, [...weakDims, "friction_response"]),
        behaviourNodeRefs: bgNodeIdsForDims(ctx, [...weakDims, "friction_response", "attention_competition"]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: evidenceLines(ctx, relevantQ),
        priorContext: summarisePrior(moments),
        additionalInstruction:
          `Begin your response with: TITLE: [a short phrase naming the shift in understanding — e.g. "Once you see the pattern, a few other things look different"]\n\n` +
          `Then output EXACTLY 3 reframe pairs in this structured format. No intro prose, no conclusion — ONLY the TITLE line and the three pairs:\n\n` +
          `BELIEVED: [One sentence — something this parent has almost certainly thought about a recurring hard situation. Concrete, lived language.]\n` +
          `ACTUALLY: [One sentence — what the evidence says is more likely true. Specific to this family, not generic.]\n\n` +
          `BELIEVED: [Second recurring thought, about a different situation with ${ctx.childName}.]\n` +
          `ACTUALLY: [What's more likely true for this family specifically.]\n\n` +
          thirdPairInstruction +
          `CRITICAL: Write ONLY the TITLE line and the three BELIEVED/ACTUALLY pairs. No other prose before or after. ` +
          `Every line must be concrete and anchored to the evidence text listed in this call — not from other signals visible in context.\n\n` +
          `SCOPE RESTRICTION: Do NOT include any observation about how ${ctx.childName} responds when the parent steps in to help — that signal (Support Response) is from a new, unvalidated dimension and is handled in a separate section. If pair 3 covers the parent's response pattern, describe the parent's behavior from G3/P1/P2 evidence only; do not bring in how ${ctx.childName} reacted to the intervention.\n\n` +
          noLoopPiInstruction,
        wordTarget: "90–130 words total across all pairs — each pair: one sentence per line.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 5. Where We Are Less Certain ─────────────────────────────────────────
  // Always included — even if all evidence is direct, brief acknowledgement of assessment limits.
  // Also surfaces any unvalidated dimensions that have real evidence: these have a genuine
  // answer but not enough production data to assert confidently, so they belong here, not
  // in a BELIEVED/ACTUALLY reframe pair.
  {
    const hypothesisDims = ctx.sig.dimensions.filter(d => d.evidence_tier === "hypothesis");
    const tensionDims = ctx.sig.dimensions.filter(d => d.contradiction_flag);
    // Dimensions with real evidence but not yet validated (e.g. support_response).
    // These are capped at framework_interpretation tier — genuine signal, not yet trustworthy
    // enough to assert. Route here so the Quality Engine can verify they appear with hedging.
    const unvalidatedActiveDims = ctx.sig.dimensions.filter(
      d => !d.validated && d.evidence_tier !== "insufficient_evidence"
    );
    // D3.2/D3.confirm for friction hypothesis; S1 for support_response (unvalidated active dim)
    const relevantQ = ["D3.2", "D3.confirm", "S1"];

    const unvalidatedSection = unvalidatedActiveDims.length > 0
      ? `\n\nNEW DIMENSION — HEDGE REQUIRED: One additional observation from this session is too new to assert confidently. ` +
        `You MUST include each of the following dimension labels verbatim in your prose: ${unvalidatedActiveDims.map(d => `"${d.label}"`).join(", ")}. ` +
        `For each: use the exact label, then describe what the single answer tentatively suggests using hedge language — ` +
        `"one thing Support Response suggests", "this may point to", "worth watching is", "the early signal here is". ` +
        `Note that this observation is from limited data — one answer, not a confirmed pattern. ` +
        `Do not state it as established fact. Never omit the label from your output.`
      : "";

    const uncertaintyBody = hypothesisDims.length > 0
      ? `The following dimensions have uncertain evidence: ${hypothesisDims.map(d => d.label).join(", ")}. ` +
        `Name each dimension explicitly — what signal it shows and why it's uncertain. ` +
        `Use hedge language for every claim touching these dimensions: "it might be", "it appears", "suggests", "tends to", "could be", "it seems". ` +
        `Do not state uncertain things as facts. Be specific — "${ctx.childName}'s [dimension] is unclear" is better than "some things are uncertain."` +
        unvalidatedSection
      : tensionDims.length > 0
      ? `No dimensions are at hypothesis tier, but these dimensions have competing signals: ${tensionDims.map(d => d.label).join(", ")}. ` +
        `Name what looks contradictory in the evidence for ${ctx.childName} and why — what two answers point in different directions. ` +
        `Be precise: what the competing signals are, and what observing the child more closely would resolve.` +
        unvalidatedSection
      : unvalidatedActiveDims.length > 0
      ? `No dimensions are at hypothesis tier or in tension for this family.` +
        unvalidatedSection
      : `No dimensions are at hypothesis tier or in tension for this family. ` +
        `Write TWO specific, honest observations about what this assessment cannot fully see for THIS family — not a generic disclaimer. ` +
        `Look at the evidence text above: (1) identify one answer or pattern that doesn't sit cleanly inside the rest of the picture, and name it explicitly; ` +
        `(2) identify one thing about ${ctx.childName} that the evidence describes from one angle but might look different from another. ` +
        `Name the specific dimension or answer, not just "we can't see everything." Be brief but concrete.`;

    const moment = await generateMoment(
      track({
        momentId: "m_05",
        momentType: "reflection",
        section: "Where We Are Less Certain",
        purpose: "acknowledge the limits of the assessment's evidence honestly, without undermining the whole report",
        emotionalObjective: "trust through honesty",
        confidenceTier: hypothesisDims.length > 0 ? "hypothesis" : "framework_interpretation",
        behaviourNodeRefs: bgNodeIdsForDims(ctx, [
          ...hypothesisDims.map(d => d.dimension),
          ...unvalidatedActiveDims.map(d => d.dimension),
        ]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: [
          ...evidenceLines(ctx, relevantQ),
          ...(tensionDims.length > 0 ? [`Dimensions with competing signals: ${tensionDims.map(d => d.label).join(", ")}`] : []),
          ...(unvalidatedActiveDims.length > 0 ? [`Unvalidated dimensions (hedge required): ${unvalidatedActiveDims.map(d => d.label).join(", ")}`] : []),
        ],
        priorContext: summarisePrior(moments),
        additionalInstruction:
          `Begin your response with: TITLE: [a specific phrase naming what's uncertain — e.g. "Two things we're not going to pretend we know"]\n\n` +
          `Then write the content.\n\n` +
          uncertaintyBody,
        wordTarget: "80–120 words — specific to this family, not apologetic, not generic.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 6. Hope ───────────────────────────────────────────────────────────────
  // Purpose: pivot from "what is happening" to "what becomes possible."
  // Not a sales pitch — a genuine forward-look grounded in the pattern.
  {
    const relevantQ = ["G1", "G2", "D2.1"];
    const moment = await generateMoment(
      track({
        momentId: "m_06",
        momentType: "hope",
        section: "Hope",
        purpose: "pivot from understanding to possibility — what becomes available once the pattern is seen",
        emotionalObjective: "earned hope, not hollow reassurance",
        confidenceTier: bestTierFor(ctx, ["attention_shape", "reward_driver"]),
        behaviourNodeRefs: bgNodeIdsForDims(ctx, ["attention_shape", "reward_driver"]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: evidenceLines(ctx, relevantQ),
        priorContext: summarisePrior(moments),
        additionalInstruction:
          `Begin your response with: TITLE: [a short statement of what's actually true — e.g. "None of this means Atharv can't build focus that holds up anywhere."]\n\n` +
          `Then write the prose.\n\n` +
          `Do not promise outcomes. Do not say "soon everything will be easier." ` +
          `Say what becomes possible when you work *with* ${ctx.childName}'s attention shape ` +
          `instead of against it — grounded in the specific pattern just described. ` +
          `This should feel earned, not generic.`,
        wordTarget: "60–80 words — warm but precise.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 7. Future Story ───────────────────────────────────────────────────────
  // Purpose: a concrete scene from 6 weeks out — shows the parent what "working with the pattern" looks like.
  {
    const relevantQ = ["G1", "G3", "D2.1"];
    const moment = await generateMoment(
      track({
        momentId: "m_07",
        momentType: "reframing",
        section: "Future Story",
        purpose: "show a concrete scene from 6 weeks out — what changes when the pattern is understood and worked with",
        emotionalObjective: "possibility made tangible",
        confidenceTier: bestTierFor(ctx, ["attention_shape", "parent_instinct"]),
        behaviourNodeRefs: bgNodeIdsForDims(ctx, ["attention_shape", "parent_instinct"]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, relevantQ).map(n => n.id),
        evidenceText: evidenceLines(ctx, relevantQ),
        priorContext: summarisePrior(moments),
        additionalInstruction:
          `Begin your response with: TITLE: [a short evocative title for this specific scene — e.g. "A weekday evening with nothing to negotiate"]\n\n` +
          `Then write the scene.\n\n` +
          `Write a brief scene from 6 weeks in the future — a specific evening or moment ` +
          `where ${ctx.childName}'s attention type is being worked with, not fought. ` +
          `The scene should be recognisable from what the parent already knows about ${ctx.pronouns.obj}. ` +
          `Ground it in specific details from the evidence (draw from the cited answer language). ` +
          `No guarantees, no dramatic transformation — just a quieter, more readable version of the same child. ` +
          `End with a caveat sentence: "Not guaranteed — this is what's possible, and the pace depends on ${ctx.childName} and on the week."`,
        wordTarget: "90–130 words — one specific, low-key future scene.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  // ── 8. Roadmap (4 outcome beats) ─────────────────────────────────────────
  // Format confirmed from validated reference reports (Parvathi, Devsaran, Atharv):
  // 3–4 outcome-oriented beats — "what you'll notice change" — not a week-by-week curriculum.
  // Each beat cites the loop's intervention_slot dimension (or attention_shape if no loop).
  // Do NOT describe a curriculum. Describe what actually becomes different.
  const loopDim = ctx.loop.detected && ctx.loop.loop_tension_point
    ? ctx.loop.loop_tension_point.child_dimension
    : "attention_shape";

  const roadmapContextLines = [
    `Child archetype: ${ctx.archetypeFitTier !== "no_clear_fit" ? ctx.archetype : "pattern unclear — describe observed behaviour only"}`,
    `Parent instinct: ${ctx.parentInstinctFitTier !== "no_clear_fit" ? ctx.parentInstinct : "parent response pattern unclear"}`,
    `Key dimension addressed by roadmap: ${loopDim}`,
    ctx.loop.detected
      ? `Loop mechanism being interrupted: ${ctx.loop.loop_tension_point?.mechanism}`
      : "No loop detected — roadmap targets the core attention shape and friction response.",
    `Weakest axes: ${ctx.scoring.weakest_two.join(", ")}`,
  ];

  const roadmapBeats = [
    {
      beatId: "m_roadmap_b1",
      beatLabel: "What changes first",
      instruction:
        `Describe what the parent will notice first — typically within the first week or two. ` +
        `Be hyper-specific: name the exact situation or moment where the change shows up ` +
        `using language that mirrors the family's evidence above (e.g. "Fewer evenings where..." or ` +
        `"The moment ${ctx.childName} used to [specific behaviour] now looks different"). ` +
        `Not "things feel easier." The actual, named, observable shift. ` +
        `Do not describe what the parent does. Describe what they notice.`,
    },
    {
      beatId: "m_roadmap_b2",
      beatLabel: "What changes next",
      instruction:
        `Describe the second shift — what becomes different in the parent-child dynamic ` +
        `once the first change has taken hold. ` +
        (ctx.loop.detected
          ? `This is where the loop starts to be interrupted — the recurring cycle described earlier ` +
            `starts skipping a beat. Name the specific situation where it used to fire and now doesn't.`
          : `This is where ${ctx.childName}'s response to the pattern-matched environment ` +
            `starts to look different from the outside. Name the exact situation.`) +
        ` Use the specific vocabulary from the evidence text — not a paraphrase.`,
    },
    {
      beatId: "m_roadmap_b3",
      beatLabel: "What becomes different",
      instruction:
        `Describe the structural change — the situation that was hard (from "What This Explains") ` +
        `as it starts to look from a position of understanding. ` +
        `Name that specific situation by the same language used earlier. ` +
        `Not resolved, not fixed — just different enough that the parent has something to work with ` +
        `rather than something to fight. Describe the outcome, not the technique.`,
    },
    {
      beatId: "m_roadmap_b4",
      beatLabel: "What this makes possible",
      instruction:
        `Describe what six weeks of working with this understanding actually produces — ` +
        `not in dramatic terms, not as a transformation, but as a real shift in what's available. ` +
        `The parent and ${ctx.childName} both in a different position than where they started. ` +
        `Keep it grounded. The outcome earns the reader's trust by not overpromising.`,
    },
  ];

  for (const { beatId, beatLabel, instruction } of roadmapBeats) {
    const priorRoadmapContent = moments
      .filter(m => m.section.startsWith("Roadmap"))
      .slice(-1)
      .map(m => `[${m.section}]: ${m.content.slice(0, 150)}…`)
      .join("");

    const moment = await generateMoment(
      track({
        momentId: beatId,
        momentType: "action",
        section: `Roadmap — ${beatLabel}`,
        purpose: `roadmap beat: ${beatLabel.toLowerCase()} — outcome description, not curriculum step`,
        emotionalObjective: "concrete possibility, not promise",
        confidenceTier: bestTierFor(ctx, [loopDim, "attention_shape"]),
        behaviourNodeRefs: bgNodeIdsForDims(ctx, [loopDim, "attention_shape"]),
        humanDecisionRefs: hdgNodesForQuestions(ctx, ["G1", "G3"]).map(n => n.id),
        evidenceText: roadmapContextLines,
        priorContext: priorRoadmapContent || summarisePrior(moments.slice(-2)),
        additionalInstruction:
          `ROADMAP BEAT: "${beatLabel}"\n` +
          `${instruction}\n\n` +
          `CRITICAL FORMAT RULE: Do NOT write "Week 1", "Week 2", or any week-number structure. ` +
          `Do NOT describe what the parent should do or try. Describe what they will notice or experience. ` +
          `This is an outcome description, not an instruction. Prose only — no lists, no bullets, no headings.\n` +
          `CRITICAL LENGTH RULE: One or two SHORT sentences maximum. A tight outcome phrase — not a paragraph, not an essay.`,
        wordTarget: "25–45 words — one crisp outcome phrase or two short sentences. Do NOT write more.",
      }),
      ctx,
    );
    moments.push(moment);
  }

  return {
    report: {
      moments,
      archetype: ctx.archetype,
      archetype_fit_tier: ctx.archetypeFitTier,
      parent_instinct: ctx.parentInstinct,
      parent_instinct_fit_tier: ctx.parentInstinctFitTier,
      schema_version: 1,
    },
    specs,
  };
}
