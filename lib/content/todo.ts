/**
 * TODO() marks authored content that hasn't been provided yet.
 * Returns a visually obvious placeholder string.
 * `npm run content:manifest` greps for TODO( calls to produce the authoring backlog.
 *
 * Rule: never write plausible-sounding filler. A visible gap is correct.
 */
export function TODO(key: string): string {
  return `[[MISSING: ${key}]]`;
}
