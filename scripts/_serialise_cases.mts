import { buildNarrativeContext, serialiseContext } from "../lib/narrative/context.js";
import { buildHdg }               from "../lib/graph/hdg.js";
import { buildBehaviourGraph }    from "../lib/graph/behaviour-graph.js";
import { buildBehaviourSignature } from "../lib/graph/signature.js";
import { buildConfidenceVector }  from "../lib/graph/confidence.js";
import { buildFamilyAttentionLoop } from "../lib/graph/loop.js";
import { scoreAssessment }        from "../lib/engine/scorer.js";
import type { Dimensions }        from "../lib/engine/scorer.js";

const answers: Record<string,string> = {
  G1:"narrow-deep", G2:"novelty", G3:"steady-hand",
  "D1.1":"narrow-deep","D1.2":"wide-shifting",
  "D2.1":"mastery","D2.2":"mastery","D2.3":"novelty","D2.confirm":"mastery",
  "D3.1":"avoid","D3.2":"avoid","D3.3":"avoid","D3.confirm":"avoid",
  P1:"steady-hand", P2:"quick-fixer",
  "D5.1":"task-escape","D5.2":"task-escape",
  R1:"responsive", R2:"responsive", R3:"responsive",
  "D6.1":"sensory-quiet","D6.2":"sensory-quiet","D6.3":"sensory-quiet","D6.confirm":"sensory-quiet",
};
const hdg  = buildHdg(answers);
const bg   = buildBehaviourGraph(hdg);
const sig  = buildBehaviourSignature(hdg, bg);
const cv   = buildConfidenceVector(hdg, bg, sig);
const loop = buildFamilyAttentionLoop(hdg, bg, sig);
const dims: Dimensions = {
  attention_shape:    {value:"narrow-deep",  consistency:1,data_points:3,winning_votes:3},
  reward_driver:      {value:"mastery",      consistency:1,data_points:4,winning_votes:4},
  friction_response:  {value:"avoid",        consistency:1,data_points:4,winning_votes:4},
  parent_instinct:    {value:"steady-hand",  consistency:1,data_points:3,winning_votes:3},
  attention_competition:{value:"novelty",    consistency:1,data_points:3,winning_votes:3},
  recharge_type:      {value:"sensory-quiet",consistency:1,data_points:4,winning_votes:4},
  recovery_response:  {value:"responsive",   consistency:1,data_points:3,winning_votes:3},
};
const scoring = scoreAssessment(dims, 18, cv.overall_confidence);

function extract(ctx: ReturnType<typeof buildNarrativeContext>) {
  return serialiseContext(ctx)
    .split("\n")
    .filter(l => l.includes("Parent's stated") || l.includes("Parent's own"));
}

// Case 1: Something else + typed text
{
  const ctx = buildNarrativeContext(
    { child_name:"Sam", age_band:"10-11", child_gender:null, parent_name:"Parent",
      archetype:scoring.archetype, archetype_fit_tier:scoring.archetype_fit_tier,
      parent_pattern:scoring.parent_pattern, parent_instinct_fit_tier:scoring.parent_instinct_fit_tier,
      concerns:["screens"], worry_followup:"Something else",
      worry_followup_other:"My child melts down every single evening" },
    hdg, bg, sig, loop, cv, scoring
  );
  console.log("=== Something else + typed text ===");
  for (const l of extract(ctx)) console.log(" ", l);
}

// Case 2: Something else + no typed text
{
  const ctx = buildNarrativeContext(
    { child_name:"Sam", age_band:"10-11", child_gender:null, parent_name:"Parent",
      archetype:scoring.archetype, archetype_fit_tier:scoring.archetype_fit_tier,
      parent_pattern:scoring.parent_pattern, parent_instinct_fit_tier:scoring.parent_instinct_fit_tier,
      concerns:["screens"], worry_followup:"Something else",
      worry_followup_other:null },
    hdg, bg, sig, loop, cv, scoring
  );
  console.log("=== Something else + no typed text ===");
  const lines = extract(ctx);
  console.log(lines.length === 0 ? "  (no followup lines — correct)" : lines.map(l => "  "+l).join("\n"));
}
