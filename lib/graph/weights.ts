export type WeightTier = "primary" | "secondary" | "supporting";

export interface QuestionWeight {
  dimension: string;
  tier: WeightTier;
  weight: number;
}

// Home dimension for each question (the dimension the question was designed to measure).
// Cross-dimension contributions are everything else in QUESTION_WEIGHTS.
export const QUESTION_HOME_DIMENSION: Record<string, string> = {
  G1: "attention_shape",
  G2: "attention_competition",
  G3: "parent_instinct",
  "D1.1": "attention_shape",
  "D1.2": "attention_shape",
  "D2.1": "reward_driver",
  "D2.2": "reward_driver",
  "D2.3": "reward_driver",
  "D2.confirm": "reward_driver",
  "D3.1": "friction_response",
  "D3.2": "friction_response",
  "D3.3": "friction_response",
  "D3.confirm": "friction_response",
  P1: "parent_instinct",
  P2: "parent_instinct",
  "D5.1": "attention_competition",
  "D5.2": "attention_competition",
  "D6.1": "recharge_type",
  "D6.2": "recharge_type",
  "D6.3": "recharge_type",
  "D6.confirm": "recharge_type",
};

// Value translation for cross-dimension contributions.
// Key: "questionId:targetDimension:sourceValue" → target-dimension value | null (no equivalent)
//
// null means the contributor still counts for evidence density and tier,
// but casts no vote in the target dimension's weighted value election.
//
// Rationale per spec Part 3:
//   D3.3 → recharge_type: "what the child needs after failure echoes what recharges them"
//   D6.1 → friction_response: "recovery style echoes coping style under stress"
//   G2, D5.1, D5.2 → reward_driver: "what distracts or pulls implies what wasn't motivating enough"
export const CROSS_DIM_VALUE_MAP: Record<string, string | null> = {
  // G2 (home: attention_competition) → reward_driver
  "G2:reward_driver:novelty":   "novelty",  // new idea pulled them = novelty reward
  "G2:reward_driver:social":    "social",   // social pull = social reward
  "G2:reward_driver:external":  null,       // sensory distraction — no clear reward driver signal
  "G2:reward_driver:internal":  null,       // boredom/frustration — ambiguous driver

  // D3.3 (home: friction_response) → recharge_type
  "D3.3:recharge_type:avoid":            "sensory-quiet",         // needs space alone → quiet
  "D3.3:recharge_type:solo-push":        "autonomous-unstructured", // goes again on own terms → freedom
  "D3.3:recharge_type:support-seek":     "social-connection",     // needs someone → connection
  "D3.3:recharge_type:emotional-derail": "cognitive-displacement", // needs a reason to re-engage → distraction

  // D5.1 (home: attention_competition) → reward_driver
  "D5.1:reward_driver:social":            "social",   // screens for social connection
  "D5.1:reward_driver:genuine-interest":  "novelty",  // genuine excitement = novelty drive
  "D5.1:reward_driver:boredom-avoidance": "novelty",  // seeking stimulation = novelty need
  "D5.1:reward_driver:task-escape":       null,        // avoidance behavior — no positive reward signal

  // D5.2 (home: attention_competition) → reward_driver
  "D5.2:reward_driver:social":            "social",
  "D5.2:reward_driver:genuine-interest":  "novelty",
  "D5.2:reward_driver:boredom-avoidance": "novelty",
  "D5.2:reward_driver:task-escape":       null,

  // D6.1 (home: recharge_type) → friction_response
  "D6.1:friction_response:sensory-quiet":           "avoid",        // prefers quiet alone → avoidance pattern
  "D6.1:friction_response:social-connection":       "support-seek", // needs people → seeks support
  "D6.1:friction_response:cognitive-displacement":  null,            // absorbing distraction — no clear friction pattern
  "D6.1:friction_response:autonomous-unstructured": "solo-push",    // needs freedom → pushes through alone
};

// Per-dimension validation status.
//
// validated: true  — dimension has real production n and has passed the signal-threshold
//                    discipline used throughout this build. Narrative engine treats the
//                    stored evidence_tier as authoritative.
//
// validated: false — dimension is newly introduced and has not yet been checked.
//                    Narrative engine caps effective confidence at framework_interpretation
//                    regardless of what the data layer resolves (rendering-level cap only;
//                    stored evidence_tier is not mutated).
//
export const DIMENSION_VALIDATION: Record<string, { validated: boolean }> = {
  attention_shape:      { validated: true },
  reward_driver:        { validated: true },
  friction_response:    { validated: true },
  parent_instinct:      { validated: true },
  attention_competition: { validated: true },
  recharge_type:        { validated: true },
};

// Static mapping: question ID → every dimension it touches and at what weight.
//
// Primary   (1.0) — question's core intent directly targets this dimension
// Secondary (0.5) — meaningful spillover; answer implies something about this dimension
// Supporting(0.25)— weak/indirect correlate
//
// Cross-dimension sources per spec Part 3:
//   G2 → reward_driver 0.5      (what distracts implies what wasn't motivating enough)
//   D5.1/D5.2 → reward_driver 0.5  (screen pull reflects underlying reward need)
//   D6.1 → friction_response 0.25  (recovery style echoes coping style under stress)
//   D3.3 → recharge_type 0.25      (what enables retry echoes what recharges)
export const QUESTION_WEIGHTS: Record<string, QuestionWeight[]> = {
  G1: [{ dimension: "attention_shape", tier: "primary", weight: 1.0 }],
  G2: [
    { dimension: "attention_competition", tier: "primary", weight: 1.0 },
    { dimension: "reward_driver", tier: "secondary", weight: 0.5 },
  ],
  G3: [{ dimension: "parent_instinct", tier: "primary", weight: 1.0 }],
  "D1.1": [{ dimension: "attention_shape", tier: "primary", weight: 1.0 }],
  "D1.2": [{ dimension: "attention_shape", tier: "primary", weight: 1.0 }],
  "D2.1": [{ dimension: "reward_driver", tier: "primary", weight: 1.0 }],
  "D2.2": [{ dimension: "reward_driver", tier: "primary", weight: 1.0 }],
  "D2.3": [{ dimension: "reward_driver", tier: "primary", weight: 1.0 }],
  "D2.confirm": [{ dimension: "reward_driver", tier: "primary", weight: 1.0 }],
  "D3.1": [{ dimension: "friction_response", tier: "primary", weight: 1.0 }],
  "D3.2": [{ dimension: "friction_response", tier: "primary", weight: 1.0 }],
  "D3.3": [
    { dimension: "friction_response", tier: "primary", weight: 1.0 },
    { dimension: "recharge_type", tier: "supporting", weight: 0.25 },
  ],
  "D3.confirm": [{ dimension: "friction_response", tier: "primary", weight: 1.0 }],
  P1: [{ dimension: "parent_instinct", tier: "primary", weight: 1.0 }],
  P2: [{ dimension: "parent_instinct", tier: "primary", weight: 1.0 }],
  "D5.1": [
    { dimension: "attention_competition", tier: "primary", weight: 1.0 },
    { dimension: "reward_driver", tier: "secondary", weight: 0.5 },
  ],
  "D5.2": [
    { dimension: "attention_competition", tier: "primary", weight: 1.0 },
    { dimension: "reward_driver", tier: "secondary", weight: 0.5 },
  ],
  "D6.1": [
    { dimension: "recharge_type", tier: "primary", weight: 1.0 },
    { dimension: "friction_response", tier: "supporting", weight: 0.25 },
  ],
  "D6.2": [{ dimension: "recharge_type", tier: "primary", weight: 1.0 }],
  "D6.3": [{ dimension: "recharge_type", tier: "primary", weight: 1.0 }],
  "D6.confirm": [{ dimension: "recharge_type", tier: "primary", weight: 1.0 }],
};
