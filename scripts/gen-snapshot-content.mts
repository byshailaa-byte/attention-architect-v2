// Generates lib/report/snapshot-content.ts from content/snapshot-copy-map.md.
// The markdown is the single source of truth for §2 parent-facing copy; this
// script transcribes it verbatim so no copy is hand-typed into code. Run after
// any edit to the copy map. Not a deploy-time job (copy is static once shipped).
//
//   npx tsx scripts/gen-snapshot-content.mts

import { readFileSync, writeFileSync } from "node:fs";

const SRC = "content/snapshot-copy-map.md";
const OUT = "lib/report/snapshot-content.ts";

const lines = readFileSync(SRC, "utf8").split("\n");

type Entry = { answer: string; insight: string };
const copy: Record<string, Record<string, Entry>> = {};
const generic: Record<string, string> = {};
const labels: Record<string, string> = {};
const order: string[] = [];
let section: { kicker?: string; heading?: string; lede?: string } = {};

let currentDim: string | null = null;
let inSectionCopy = false;

const DIM_HEADER = /^##\s+([a-z_]+)\s+—\s+"(.+)"\s*$/;
const GENERIC = /^\*\*Generic fallback:\*\*\s+"(.+)"\s*$/;
const ROW = /^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;

for (const raw of lines) {
  const line = raw.replace(/\r$/, "");

  const dh = line.match(DIM_HEADER);
  if (dh) { currentDim = dh[1]; labels[currentDim] = dh[2]; copy[currentDim] = {}; order.push(currentDim); inSectionCopy = false; continue; }

  if (/^##\s+Section copy\s*$/.test(line)) { currentDim = null; inSectionCopy = true; continue; }
  if (/^##\s+/.test(line)) { currentDim = null; inSectionCopy = false; continue; }

  if (currentDim) {
    const g = line.match(GENERIC);
    if (g) { generic[currentDim] = g[1]; continue; }
    const r = line.match(ROW);
    if (r) {
      const [, value, answer, insight] = r;
      if (value.toLowerCase() === "value") continue; // header row
      copy[currentDim][value] = { answer, insight };
    }
    continue;
  }

  if (inSectionCopy) {
    let m;
    if ((m = line.match(/^-\s+\*\*Kicker:\*\*\s+(.+?)\s*$/)))  section.kicker  = m[1];
    else if ((m = line.match(/^-\s+\*\*Heading:\*\*\s+(.+?)\s*$/))) section.heading = m[1];
    else if ((m = line.match(/^-\s+\*\*Lede:\*\*\s+(.+?)\s*$/)))    section.lede    = m[1];
  }
}

// Sanity: expected value counts per the confirmed emittable set.
const EXPECT: Record<string, number> = {
  attention_shape: 4, attention_competition: 7, friction_response: 5, recharge_type: 4,
};
for (const [dim, n] of Object.entries(EXPECT)) {
  const got = Object.keys(copy[dim] ?? {}).length;
  if (got !== n) throw new Error(`Parse error: ${dim} has ${got} values, expected ${n}`);
  if (!generic[dim]) throw new Error(`Parse error: ${dim} missing generic fallback`);
}
if (!section.kicker || !section.heading || !section.lede) throw new Error("Parse error: missing section copy");

const j = (s: unknown) => JSON.stringify(s);

const body = `// AUTO-GENERATED from content/snapshot-copy-map.md by scripts/gen-snapshot-content.mts.
// Do not edit by hand — edit the markdown and re-run the generator.
// Parent-facing copy is verbatim from the copy map.

export type SnapshotDimKey =
  | "attention_shape"
  | "attention_competition"
  | "friction_response"
  | "recharge_type";

export const SNAPSHOT_SECTION = {
  kicker: ${j(section.kicker)},
  heading: ${j(section.heading)},
  lede: ${j(section.lede)},
} as const;

export const SNAPSHOT_DIMENSIONS: { key: SnapshotDimKey; label: string }[] = [
${order.map(d => `  { key: ${j(d)}, label: ${j(labels[d])} },`).join("\n")}
];

// Rendered when a value has no per-value entry (a future new option). Never a
// profile fallback string.
export const SNAPSHOT_GENERIC_FALLBACK: Record<SnapshotDimKey, string> = {
${order.map(d => `  ${d}: ${j(generic[d])},`).join("\n")}
};

export type SnapshotEntry = { answer: string; insight: string };

export const SNAPSHOT_COPY: Record<SnapshotDimKey, Record<string, SnapshotEntry>> = {
${order.map(d => `  ${d}: {
${Object.entries(copy[d]).map(([v, e]) => `    ${j(v)}: { answer: ${j(e.answer)}, insight: ${j(e.insight)} },`).join("\n")}
  },`).join("\n")}
};
`;

writeFileSync(OUT, body);
const totalValues = order.reduce((s, d) => s + Object.keys(copy[d]).length, 0);
console.log(`Wrote ${OUT}: ${order.length} dimensions, ${totalValues} values, section copy OK.`);
