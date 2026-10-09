// Safe inline markdown for Coach bubbles — BOLD ONLY. Splits a string into parts so the UI can
// render **…** as <strong> and everything else as plain text. No HTML, no other tags, no links.
export type BoldPart = { bold: boolean; text: string };

export function splitBold(text: string): BoldPart[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((p) => (p.startsWith("**") && p.endsWith("**") ? { bold: true, text: p.slice(2, -2) } : { bold: false, text: p }));
}
