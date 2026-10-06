// Which Anthropic API key each feature uses, so report spend and Coach spend can be billed to
// separate keys. Both fall back to ANTHROPIC_API_KEY when the specific key is unset — so existing
// single-key deploys keep working unchanged.
//
//   reports  → ANTHROPIC_API_KEY_REPORTS  (report-v2 generate + judge, and narrative/simplified
//              report generation) || ANTHROPIC_API_KEY
//   coach    → ANTHROPIC_API_KEY_COACH    (Coach replies + memory extractor) || ANTHROPIC_API_KEY

export function reportsApiKey(): string {
  const k = process.env.ANTHROPIC_API_KEY_REPORTS || process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error("No reports Anthropic key (set ANTHROPIC_API_KEY_REPORTS or ANTHROPIC_API_KEY)");
  return k;
}

export function coachApiKey(): string {
  const k = process.env.ANTHROPIC_API_KEY_COACH || process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error("No Coach Anthropic key (set ANTHROPIC_API_KEY_COACH or ANTHROPIC_API_KEY)");
  return k;
}
