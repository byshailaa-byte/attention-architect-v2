export type CheckName =
  | "traceability"
  | "hypothesis_hedge"
  | "label_once"
  | "fit_tier_compliance"
  | "no_week_number_roadmap"
  | "single_pullquote"
  | "roadmap_loop_citation"
  | "no_objective_picker"
  | "opening_similarity"
  | "out_of_scope_node_reference"
  | "unvalidated_dimension_routing"
  | "clinical_language"
  | "blame_framing"
  | "early_action_content"
  | "recognition_ordering"
  | "teaser_label_absence"
  | "teaser_similarity"
  | "teaser_naming_framing";

export interface CheckFailure {
  check: CheckName;
  // moment_id is null for report-level failures (e.g. label_once spanning all moments)
  moment_id: string | null;
  reason: string;
}

export interface QualityResult {
  passed: boolean;
  failures: CheckFailure[];
}
