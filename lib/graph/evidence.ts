import type { EvidenceTier } from "./types";

export interface ContributingNode {
  node_id: string;
  source_value: string;   // raw answer value from the HDG node
  voting_value: string | null; // dimension-vocabulary value used in weighted vote
                               // (may differ for cross-dimension contributions; null = no vote)
  context: "unconditional" | "conditional";
  weight: number;
  tier: "primary" | "secondary" | "supporting";
}

// Evidence tier rules — Mixed-certainty aggregation (spec Part 4):
//
// Tier follows dominant evidence by combined weight, not the weakest source.
// Conditional contributors reduce confidence proportionally but do not change the
// tier UNLESS they are the ONLY evidence, or they directly contradict unanimous
// unconditional evidence.
//
// 1. No contributors → insufficient_evidence
//
// 2. No unconditional contributors (conditional is all we have) → hypothesis
//
// 3. Some unconditional + some conditional:
//    a. If unconditional evidence is unanimous (all point to one value) AND a
//       conditional contributor votes against that value → hypothesis
//       (conditional directly contradicts what unconditional evidence agreed on)
//    b. Otherwise → tier from unconditional set (confidence reduced but tier held)
//
// 4. Tier from unconditional set:
//    - ≥2 significant (weight ≥ 0.5) unconditional → framework_interpretation
//    - exactly 1 significant unconditional → direct_evidence
//    - only supporting-tier (weight 0.25) unconditional → hypothesis (weak evidence)
export function resolveEvidenceTier(contributors: ContributingNode[]): EvidenceTier {
  if (contributors.length === 0) return "insufficient_evidence";

  const unconditional = contributors.filter((c) => c.context === "unconditional");
  const conditional = contributors.filter((c) => c.context === "conditional");

  if (unconditional.length === 0) return "hypothesis";

  // Check for direct contradiction: conditional votes against unanimous unconditional
  if (conditional.length > 0) {
    const uncondValues = new Set(
      unconditional.map((c) => c.voting_value ?? c.source_value)
    );
    // Unanimous = all unconditional contributors agree on exactly one value
    if (uncondValues.size === 1) {
      const uncondDominant = [...uncondValues][0];
      const contradicts = conditional.some((c) => {
        const cv = c.voting_value ?? c.source_value;
        return cv !== uncondDominant;
      });
      if (contradicts) return "hypothesis";
    }
  }

  // Tier follows unconditional evidence
  const sigUncond = unconditional.filter((c) => c.weight >= 0.5);
  if (sigUncond.length >= 2) return "framework_interpretation";
  if (sigUncond.length === 1) return "direct_evidence";

  // Only supporting-tier (0.25) unconditional evidence — weak
  return "hypothesis";
}
