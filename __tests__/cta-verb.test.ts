// CTA verb regression — Writing Engine Rule 8.
//
// Rule 8 locks the action verb for all primary CTA buttons to "Open".
// Prohibited alternatives: Buy, Purchase, Unlock, Get, Start now, Discover.
//
// This test reads source files directly (not a DOM render) because these are
// static components — the verb is a hardcoded literal in JSX, not generated content.
// Static analysis is the correct tool: it fails at edit time, not at runtime.
//
// The original CTA verb bug survived multiple fix attempts because the fix was
// checked at the prompt level, not at the component level. This test prevents that.

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Every component that renders a primary CTA button or anchor whose text should start "Open".
const CTA_FILES = [
  "app/report/[sessionId]/ClosingCtaButton.tsx",
  "app/report/[sessionId]/StickyCta.tsx",
  "app/report/[sessionId]/PriceCards.tsx",
  "app/report/[sessionId]/NarrativeReportView.tsx",
] as const;

// Prohibited verbs named explicitly in Writing Engine Rule 8, as they would appear
// as the first text after a `>` closing any <button> or <a> element.
// "Begin" is included because it was the original historical bug verb — the CTA
// previously read "Begin your roadmap" before the lock was established.
// Regex: `>` then optional whitespace/newline, then the prohibited verb.
const PROHIBITED_VERB_RE =
  />\s*\n?\s*(?:Buy|Purchase|Unlock|Discover|Start\s+now|Begin)\s/gi;

// The locked verb must appear in at least one button/anchor in each CTA file.
const OPEN_VERB_RE = />\s*\n?\s*Open\s/g;

describe("CTA verb lock — Writing Engine Rule 8", () => {
  for (const file of CTA_FILES) {
    const source = readFileSync(join(process.cwd(), file), "utf-8");

    it(`${file}: no prohibited CTA verb (Buy/Purchase/Unlock/Discover/Start now/Begin)`, () => {
      PROHIBITED_VERB_RE.lastIndex = 0;
      const match = PROHIBITED_VERB_RE.exec(source);
      expect(
        match,
        match
          ? `Prohibited CTA verb found in ${file}: "…${match[0].trimStart().slice(0, 40)}…"`
          : undefined,
      ).toBeNull();
    });

    it(`${file}: at least one button or anchor opens with the locked verb "Open"`, () => {
      OPEN_VERB_RE.lastIndex = 0;
      expect(
        OPEN_VERB_RE.test(source),
        `${file}: no "Open …" button/anchor found — CTA verb may have drifted`,
      ).toBe(true);
    });
  }
});
