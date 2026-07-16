#!/usr/bin/env tsx
/**
 * content:manifest — prints every TODO() in /content, grouped by file.
 * Run: npm run content:manifest
 *
 * This is the authoring backlog. A high count is correct — not a bug.
 * Add content to the appropriate file, replace TODO("key") with the real string,
 * then re-run to verify the count drops.
 */

import { execSync } from "child_process";
import path from "path";

const root = path.join(__dirname, "..");

let raw: string;
try {
  raw = execSync('grep -rn \'TODO("\' content/', {
    cwd: root,
    encoding: "utf8",
  });
} catch {
  // grep exits 1 when nothing is found — that would mean all content is authored.
  console.log("No TODO() entries found. Content is fully authored.");
  process.exit(0);
}

interface Entry {
  line: number;
  key: string;
}

const byFile = new Map<string, Entry[]>();

for (const raw_line of raw.split("\n").filter(Boolean)) {
  // Format: content/archetypes/storm.ts:5:  tagline: TODO("archetypes/storm.tagline"),
  const match = raw_line.match(/^(content\/[^:]+):(\d+):.*?TODO\("([^"]+)"\)/);
  if (!match) continue;
  const [, file, lineStr, key] = match;
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file)!.push({ line: parseInt(lineStr, 10), key });
}

// Group by category prefix
const categories = new Map<string, Map<string, Entry[]>>();
for (const [file, entries] of [...byFile.entries()].sort()) {
  const parts = file.split("/");
  const category = parts.length >= 3 ? parts.slice(0, -1).join("/") : "content";
  if (!categories.has(category)) categories.set(category, new Map());
  categories.get(category)!.set(file, entries);
}

let total = 0;
for (const [category, files] of [...categories.entries()].sort()) {
  const catTotal = [...files.values()].reduce((s, e) => s + e.length, 0);
  console.log(`\n── ${category}  (${catTotal}) ──`);
  for (const [file, entries] of [...files.entries()].sort()) {
    console.log(`  ${file}:`);
    for (const { line, key } of entries) {
      console.log(`    L${String(line).padStart(3, " ")}  ${key}`);
      total++;
    }
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`Total TODOs: ${total}`);
console.log(`\nAuthoring backlog (docs needed to fill remaining TODOs):`);
const missingDocs = [
  "  report-content-master.md        → 7 remaining archetypes + 3 patterns (Storm+Pusher DONE)",
  "  report-fit-reveals-all-32.md    → fits/*.s7StayPath/s7ChangePath/s8Bullets for 31 pairs (Storm+Pusher DONE)",
  "  lms-week1-storm-pusher-RENDERED-12-14.md → Day3/Day5 reflection fork text for storm",
  "  lms-week-1/{glue,captain,...}.md → LMS week-1 for 7 remaining archetypes",
  "  HTML mockups (landing, report, LMS) → copy and section structure (Phase 4+)",
];
for (const d of missingDocs) console.log(d);
