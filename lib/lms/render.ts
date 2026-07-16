import type { WeekTrend } from "./progress";
import type { AgeBand } from "@/content/types";
import type { Gender } from "@/lib/report/pronouns";
import { buildPronounTokens } from "@/lib/report/pronouns";

export type TemplateContext = {
  week_trend: WeekTrend;
  age_band: AgeBand;
};

// Evaluates {{#if key == "value"}}...{{/if}} blocks in weekend review content.
// Supports arbitrary nesting — the closing {{/if}} is matched by depth, not position,
// so nested blocks are fully resolved before the parent body is returned.
// Context: week_trend (runtime-computed) + age_band (from assessment; resolves nested
// age-band blocks that future content authors may write following the spec pattern).
export function renderWeekendContent(template: string, ctx: TemplateContext): string {
  return evaluateTemplate(template, ctx as Record<string, string>);
}

function evaluateTemplate(template: string, ctx: Record<string, string>): string {
  let result = "";
  let i = 0;
  const len = template.length;

  while (i < len) {
    if (template[i] === "{" && template[i + 1] === "{" && template[i + 2] === "#") {
      // Opening block: {{#if key == "value"}}
      const closeOpen = template.indexOf("}}", i + 2);
      if (closeOpen === -1) { result += template[i++]; continue; }

      const tagInner = template.slice(i + 2, closeOpen);
      const m = tagInner.match(/^#if\s+(\w+)\s*==\s*"([^"]+)"$/);
      if (!m) {
        // Unrecognised tag — pass through verbatim
        result += template.slice(i, closeOpen + 2);
        i = closeOpen + 2;
        continue;
      }

      const [, key, value] = m;
      const bodyStart = closeOpen + 2;
      const closeIdx = findMatchingClose(template, bodyStart);
      if (closeIdx === -1) { result += template[i++]; continue; } // malformed

      const body = template.slice(bodyStart, closeIdx);
      if (ctx[key] === value) {
        result += evaluateTemplate(body, ctx); // recurse — resolves nested blocks
      }
      i = closeIdx + 7; // skip {{/if}}
    } else {
      result += template[i++];
    }
  }

  return result;
}

// Returns the index of the {{/if}} that closes the block whose body begins at `start`.
// Tracks nesting depth: each {{# increments, each {{/ decrements.
// Returns -1 for malformed (unclosed) templates.
function findMatchingClose(template: string, start: number): number {
  let depth = 1;
  let i = start;
  const len = template.length;

  while (i < len && depth > 0) {
    if (template[i] === "{" && template[i + 1] === "{") {
      if (template[i + 2] === "#") {
        // Nested opening — advance past its own {{#if ...}} tag and increment depth
        const closeTag = template.indexOf("}}", i + 2);
        depth++;
        i = closeTag === -1 ? len : closeTag + 2;
      } else if (template[i + 2] === "/") {
        depth--;
        if (depth === 0) return i; // matched
        i += 7; // skip {{/if}} (not the matching close — still nested)
      } else {
        i += 2; // other {{ expressions (e.g. {{child_name}})
      }
    } else {
      i++;
    }
  }

  return -1; // unclosed block
}

// Minimal markdown-to-HTML for LMS content strings.
// Handles: **bold**, *italic*, bullet lists (lines starting with "- "), paragraph breaks (\n\n).
// Content comes from authored TypeScript files, not user input — safe for dangerouslySetInnerHTML.
export function renderMarkdown(text: string): string {
  const chunks = text.trim().split(/\n\n+/);
  return chunks
    .map((chunk) => {
      const lines = chunk.split("\n");
      const isList = lines.every((l) => l.trim() === "" || l.trim().startsWith("- "));
      if (isList) {
        const items = lines
          .filter((l) => l.trim().startsWith("- "))
          .map((l) => `<li>${inlineMarkdown(l.slice(l.indexOf("- ") + 2))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${lines.map(inlineMarkdown).join("<br />")}</p>`;
    })
    .join("");
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// Substitutes {{child_name}}, {{child_pronoun_subj/obj/poss/reflexive}},
// and supports the |cap modifier for sentence-start capitalization (e.g. {{child_pronoun_subj|cap}}).
// Apply BEFORE renderMarkdown so substituted values become part of the rendered HTML.
export function fillLmsContent(text: string, childName: string, childGender: Gender): string {
  const tokens: Record<string, string> = {
    child_name: childName,
    ...buildPronounTokens(childGender),
  };
  return text.replace(/\{\{(\w+)(?:\|(\w+))?\}\}/g, (match, key, modifier) => {
    const value = tokens[key] ?? match;
    if (modifier === "cap" && value !== match) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  });
}
