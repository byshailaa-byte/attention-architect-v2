import type { EvidenceTier } from "@/lib/graph/types";
import type { MomentSpec } from "./generate-moment";

export type MomentType =
  | "recognition"
  | "reflection"
  | "insight"
  | "relief"
  | "reframing"
  | "hope"
  | "action";

// The Narrative Engine's unit of work (§6.1).
// content: generated prose — parent-facing.
// behaviour_node_refs / human_decision_refs: stored server-side for the Quality Engine;
//   never serialised into parent-facing API responses.
export interface AttentionMoment {
  moment_id: string;
  moment_type: MomentType;
  section: string;
  purpose: string;
  evidence_source: string[];
  confidence_tier: EvidenceTier;
  emotional_objective: string;
  behaviour_node_refs: string[];
  human_decision_refs: string[];
  content: string;
  // Optional evocative h2 title for the section, extracted from TITLE: prefix in LLM output.
  // Absent for moments generated before title instructions were added.
  title?: string;
}

// Full composed report — what gets stored in reports.narrative_moments / reports.family_attention_loop etc.
export interface ComposedReport {
  moments: AttentionMoment[];
  archetype: string;
  archetype_fit_tier: string;
  parent_instinct: string;
  parent_instinct_fit_tier: string;
  schema_version: number;
}

// Return type of composeReport — includes internal specs for Quality Engine regeneration.
// specs is NOT stored in the DB; it is used only during the generation pipeline.
export interface ComposeOutput {
  report: ComposedReport;
  // moment_id → the MomentSpec used to generate it (for regen on quality failure)
  specs: Record<string, MomentSpec>;
}
