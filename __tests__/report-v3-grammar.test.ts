import { describe, it, expect } from "vitest";
import * as C from "@/lib/report-v2/v3-copy";
import { makeFiller } from "@/lib/report-v2/cards-copy";
import { composeFallback, archetypeDesc } from "@/content/report-v2/fallbacks";
import { articleFor, type Gender } from "@/lib/report/pronouns";

// ────────────────────────────────────────────────────────────────────────────
// GOAL: the UNSET-gender ("they") render of every v3 fixed string + every
// hand-written fallback must read as singular-they with PLURAL verbs ("they
// focus", "they are", "they’re"), never 3rd-person-singular ("they focuses",
// "they is", "they’s"). he/she wording must be unchanged.
// ────────────────────────────────────────────────────────────────────────────

const GENDERS: { label: string; g: Gender }[] = [
  { label: "boy", g: "boy" }, { label: "girl", g: "girl" }, { label: "unset", g: null },
];
const WORRIES = ["reminders", "homework", "screens", "confidence", "giveup", "finish", "other"];
const ARCHETYPES = [
  "The Storm", "The Explorer", "The Captain", "The Inventor",
  "The All-In Kid", "The Live Wire", "The Magnet", "The Glue",
];
const BARES = C.BARE_ARCHETYPES as readonly string[];

// Fill a v3-copy template the same way the render sites do: {NEED}/{REASON} composed from the
// archetype tables, then pronoun/agreement tokens, then {Type}/{band}/{NAME}/{Name}/{article}.
function fillCopy(text: string, gender: Gender, bare: string): string {
  const need = C.NEED[bare] ?? "";
  const reason = C.REASON[bare] ?? "";
  let s = text.replace(/\{NEED\}/g, need).replace(/\{REASON\}/g, reason);
  const f = makeFiller("Aarav", gender);
  s = f(s);
  s = s.replace(/\{article\}/g, articleFor(bare)).replace(/\{Type\}/g, bare)
       .replace(/\{band\}/g, "10-11").replace(/\{NAME\}/g, "AARAV").replace(/\{Name\}/g, "Aarav");
  return s;
}

// Every string leaf from the v3-copy module (tables + consts), minus functions + the name list.
function collect(val: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof val === "string") out.push({ path, text: val });
  else if (Array.isArray(val)) val.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  else if (val && typeof val === "object") for (const [k, v] of Object.entries(val)) collect(v, `${path}.${k}`, out);
}
const COPY_RAW: { path: string; text: string }[] = [];
for (const [k, v] of Object.entries(C)) {
  if (typeof v === "function" || k === "BARE_ARCHETYPES") continue;
  collect(v, k, COPY_RAW);
}

// Build the full set of rendered strings (every v3-copy string over every archetype, plus every
// fallback over every archetype × worry) for one gender.
function renderedFor(gender: Gender): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const bare of BARES)
    for (const { path, text } of COPY_RAW)
      out.push({ path: `copy:${path}[${bare}]`, text: fillCopy(text, gender, bare) });
  for (const arch of ARCHETYPES) {
    out.push({ path: `fallback:desc[${arch}]`, text: archetypeDesc(arch, "Aarav", gender) });
    for (const worry of WORRIES) {
      const g = composeFallback(arch, worry, "Aarav", gender);
      out.push({ path: `fallback:seenIt[${arch}/${worry}]`, text: g.seenIt });
      out.push({ path: `fallback:hardPart[${arch}/${worry}]`, text: g.hardPart });
      out.push({ path: `fallback:switch.instead[${arch}/${worry}]`, text: g.switch.instead });
      out.push({ path: `fallback:switch.try[${arch}/${worry}]`, text: g.switch.try });
      out.push({ path: `fallback:switch.after[${arch}/${worry}]`, text: g.switch.after });
      g.tonight.forEach((t, i) => out.push({ path: `fallback:tonight[${arch}/${worry}][${i}]`, text: t }));
    }
  }
  return out;
}

// Explicit broken "they <sing-verb>" strings the rewrite must never produce (case-insensitive).
const BANNED_PHRASES = [
  "they is", "they's", "they has", "they focuses", "they takes", "they needs", "they loses",
  "they sticks", "they lights", "they goes", "they gets", "they pushes", "they starts",
  "they says", "they stops", "they switches", "they finishes", "they wanders", "they drifts",
  "they settles", "they cracks", "they discovers", "they notices", "they pulls", "they chases",
  "they disappears", "they enjoys", "they includes", "they cares", "they avoids", "they drains",
  "they handles", "they connects", "they drops", "they sits", "they walks", "they asks",
  "they moves", "they recharges", "their to ",
  "THEY'S", "THEY IS", "THEIR TO ", "a All", "a Explorer", "a Inventor",
  // NOTE: "a Live" is NOT banned — "a Live Wire" is the correct article (Live → consonant).
];
// Curly-apostrophe variants of the contraction false-positives ("they’s", "THEY’S").
const BANNED_RES = [
  ...BANNED_PHRASES.map((p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
  /they’s/i, /THEY’S/, // curly-apostrophe variants of the "they’s" contraction leak
];

// Words that legitimately follow "they" yet end in "s" — the generic-catcher allowlist. These
// are BASE verb forms that happen to end in "s" (so "they focus" is correct, not "they focuses").
// Built from the real false positives hit while developing this test.
const PLURAL_NOUN_ALLOW = new Set<string>(["focus"]);
const GENERIC_THEY_VERB = /\bthey\s+([a-z]+s)\b/i;

describe("report-v3 grammar — singular they reads with plural verbs (every string × 3 genders)", () => {
  it("collected a meaningful number of base strings", () => {
    expect(COPY_RAW.length).toBeGreaterThan(150);
  });

  it("no explicit broken agreement phrase, any gender", () => {
    const hits: string[] = [];
    for (const { label, g } of GENDERS)
      for (const { path, text } of renderedFor(g))
        for (const re of BANNED_RES)
          if (re.test(text)) hits.push(`${path} [${label}] → "${re}": ${text}`);
    expect(hits).toEqual([]);
  });

  it("generic catch: no 'they <verb-ending-in-s>' in the unset render", () => {
    const hits: string[] = [];
    for (const { path, text } of renderedFor(null)) {
      const m = text.match(GENERIC_THEY_VERB);
      if (m && !PLURAL_NOUN_ALLOW.has(m[1].toLowerCase())) hits.push(`${path} → "${m[0]}": ${text}`);
    }
    expect(hits).toEqual([]);
  });

  it("no leftover {tokens} and no {s: / |} leaks, any gender", () => {
    const leftovers: string[] = [];
    for (const { label, g } of GENDERS)
      for (const { path, text } of renderedFor(g)) {
        const m = text.match(/\{[^}]*\}|\{s:|\|\}/);
        if (m) leftovers.push(`${path} [${label}] → ${m[0]}: ${text}`);
      }
    expect(leftovers).toEqual([]);
  });

  it("hero chip uses the right article per type", () => {
    const expected: Record<string, string> = {
      "Storm": "a Storm", "Explorer": "an Explorer", "All-In Kid": "an All-In Kid",
      "Inventor": "an Inventor", "Live Wire": "a Live Wire", "Magnet": "a Magnet",
      "Glue": "a Glue", "Captain": "a Captain",
    };
    for (const bare of BARES) {
      const chip = fillCopy(C.PLAN_HERO_CHIPS[0], null, bare);
      expect(chip).toContain(`Written for ${expected[bare]},`);
    }
  });
});
