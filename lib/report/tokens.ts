export function fillTokens(
  template: string,
  tokens: Record<string, string>
): string {
  return template.replace(/\{\{([\w|]+)\}\}/g, (_, raw) => {
    const pipeIdx = raw.indexOf("|");
    const key = pipeIdx === -1 ? raw : raw.slice(0, pipeIdx);
    const modifier = pipeIdx === -1 ? "" : raw.slice(pipeIdx + 1);
    const value = tokens[key] ?? `{{${raw}}}`;
    if (modifier === "cap") return value.charAt(0).toUpperCase() + value.slice(1);
    return value;
  });
}
