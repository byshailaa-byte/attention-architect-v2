import { describe, it, expect } from "vitest";
import type { Gender } from "@/lib/report/pronouns";
import {
  ARCHETYPE_KEYS, WORRY_KEYS, PATTERN_LINE, STRENGTH, PULL, STUCK, TODAY_TOWARD,
  CARD1, CARD2, CARD3, CARD4, CARD5, CARD6, WEEKS, SUPPORT, PLANS, FAQ, FINAL_CTA, LADDER, fillV3,
  type ArchetypeKey, type WorryKey,
} from "@/lib/report-v3/copy";

const BANNED = /\b(adhd|autis|asperger|dyslex|disorder|diagnos|clinical|syndrome|spectrum|therap|psychiatr|psycholog|medicat|symptom|mild|moderate|severe|tier\s*\d|level\s*\d|grade\s*\d)\b/i;
const PATTERN_NAMES = /\b(The Storm|The Explorer|The Captain|The Inventor|The All-In Kid|The Live Wire|The Magnet|The Glue)\b/;

function allTemplates(arch: ArchetypeKey, worry: WorryKey): string[] {
  const t: string[] = [PATTERN_LINE[arch], STRENGTH[arch], PULL[arch], STUCK[worry]];
  for (const [a, b] of TODAY_TOWARD[worry]) t.push(a, b);
  t.push(CARD1.kicker, CARD1.headline, CARD1.body, CARD1.button);
  t.push(CARD2.kicker, CARD2.patternPrefix, CARD2.footnote, CARD2.rows.strength, CARD2.rows.stuck, CARD2.rows.pull);
  t.push(CARD3.kicker, CARD3.source);
  for (const [a, b] of CARD3.rows) t.push(a, b);
  t.push(CARD4.kicker, CARD4.headline, CARD4.footnote, CARD4.colToday, CARD4.colToward);
  t.push(CARD5.kicker, CARD5.headlinePrefix, CARD5.notePrefix, CARD5.after.worked, CARD5.after.partly, CARD5.after.didnt,
    CARD5.buttons.worked, CARD5.buttons.partly, CARD5.buttons.didnt);
  t.push(CARD6.kicker, CARD6.headline, CARD6.button, CARD6.chatLabel);
  for (const [a, b] of CARD6.loop) t.push(a, b);
  for (const [, c] of CARD6.chat) t.push(c);
  for (const w of WEEKS) t.push(w.title, w.line, w.gain);
  t.push(SUPPORT.headline, ...SUPPORT.strip);
  t.push(PLANS.plan.name, ...PLANS.plan.bullets, PLANS.planCalls.name, ...PLANS.planCalls.bullets, PLANS.refund);
  for (const f of FAQ) t.push(f.q, f.a);
  t.push(FINAL_CTA, ...LADDER);
  return t;
}

const GENDERS: Gender[] = ["boy", "girl", null];

describe("report-v3 copy bank — full archetype × worry × gender matrix", () => {
  for (const arch of ARCHETYPE_KEYS) {
    for (const worry of WORRY_KEYS) {
      for (const gender of GENDERS) {
        it(`${arch} × ${worry} × ${gender ?? "they"} renders clean`, () => {
          const rendered = allTemplates(arch, worry).map((tmpl) => fillV3(tmpl, "Aarav", gender, "10-11"));
          for (const s of rendered) {
            expect(s, `unfilled placeholder in: ${s}`).not.toMatch(/\{[^}]*\}/);
            expect(s.toLowerCase(), `"undefined" in: ${s}`).not.toContain("undefined");
            expect(s, `banned word in: ${s}`).not.toMatch(BANNED);
            expect(s, `pattern name leaked in: ${s}`).not.toMatch(PATTERN_NAMES);
          }
        });
      }
    }
  }

  it("prices come from config (₹2,999 / ₹4,999)", () => {
    expect(PLANS.plan.price).toBe("₹2,999");
    expect(PLANS.planCalls.price).toBe("₹4,999");
  });
  it("every archetype + worry has copy", () => {
    expect(ARCHETYPE_KEYS.length).toBe(8);
    for (const a of ARCHETYPE_KEYS) expect(PATTERN_LINE[a] && STRENGTH[a] && PULL[a]).toBeTruthy();
    for (const w of WORRY_KEYS) expect(STUCK[w] && TODAY_TOWARD[w]?.length === 4).toBeTruthy();
  });
});
