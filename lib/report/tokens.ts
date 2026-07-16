export function fillTokens(
  template: string,
  tokens: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => tokens[key] ?? `{{${key}}}`);
}
