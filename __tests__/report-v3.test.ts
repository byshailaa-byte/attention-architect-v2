import { describe, it, expect } from "vitest";
import * as C from "@/lib/report-v2/v3-copy";
import { makeFiller } from "@/lib/report-v2/cards-copy";
import { validateGenerated } from "@/lib/report-v2/validator";
import type { ReportV2Generated } from "@/lib/report-v2/types";
import { articleFor, type Gender } from "@/lib/report/pronouns";

// The banned list, verbatim from the redesign spec §7 (whole word, case-insensitive).
const BANNED: string[] = [
  "fix", "fixes", "nothing is wrong", "type", "pattern", "trait", "profile", "stake", "stakes",
  "bet", "reward", "treat", "deal", "earn", "worth it", "firm", "no negotiation", "no debate",
  "hold the line", "testing you", "consequence", "punish", "method", "ownership", "autonomy",
  "structure", "process", "approach", "system", "brain", "dopamine", "regulate",
];
const bannedRes = BANNED.map((w) => ({ w, re: new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i") }));

// Combined fill: pronouns (makeFiller) + the non-pronoun tokens the components fill separately.
function fillAll(text: string, gender: Gender, archetypeBare: string): string {
  // {NEED} / {REASON} are composed from the archetype tables by the card at render time.
  const need = C.NEED[archetypeBare] ?? C.NEED["The " + archetypeBare] ?? "";
  const reason = C.REASON[archetypeBare] ?? C.REASON["The " + archetypeBare] ?? "";
  let s = text.replace(/\{NEED\}/g, need).replace(/\{REASON\}/g, reason).replace(/\{Count\}/g, "Three");
  const f = makeFiller("Aarav", gender);
  s = f(s);
  s = s.replace(/\{article\}/g, articleFor(archetypeBare)) // hero chip article, computed at render
       .replace(/\{Type\}/g, archetypeBare).replace(/\{band\}/g, "10-11")
       .replace(/\{NAME\}/g, "AARAV").replace(/\{Name\}/g, "Aarav");
  return s;
}

// Collect every string leaf from the copy module (tables + consts), excluding functions and the
// archetype-name list (BARE_ARCHETYPES holds "Storm" etc. — names, not sentences).
function collect(val: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof val === "string") out.push({ path, text: val });
  else if (Array.isArray(val)) val.forEach((v, i) => collect(v, `${path}[${i}]`, out));
  else if (val && typeof val === "object") for (const [k, v] of Object.entries(val)) collect(v, `${path}.${k}`, out);
}
const RAW: { path: string; text: string }[] = [];
for (const [k, v] of Object.entries(C)) {
  if (typeof v === "function" || k === "BARE_ARCHETYPES") continue;
  collect(v, k, RAW);
}

const GENDERS: { label: string; g: Gender }[] = [
  { label: "boy", g: "boy" }, { label: "girl", g: "girl" }, { label: "unset", g: null },
];
const sentencesOf = (t: string) => t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const wordsOf = (t: string) => (t.match(/[A-Za-z0-9₹’'%-]+/g) || []).filter((x) => /[A-Za-z0-9₹]/.test(x));

describe("v3 fixed copy — banned words + sentence length (every string × gender)", () => {
  it("collected a meaningful number of strings", () => {
    expect(RAW.length).toBeGreaterThan(150); // 84 PLAIN_ANSWER + tables + consts
  });

  it("no banned words in any fixed string, any gender", () => {
    const hits: string[] = [];
    for (const { path, text } of RAW) {
      for (const { label, g } of GENDERS) {
        const s = fillAll(text, g, "Storm");
        for (const { w, re } of bannedRes) if (re.test(s)) hits.push(`${path} [${label}] → banned "${w}": ${s}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("no unfilled {tokens} remain after fill, any gender", () => {
    const leftovers: string[] = [];
    for (const { path, text } of RAW) {
      for (const { label, g } of GENDERS) {
        const s = fillAll(text, g, "Storm");
        const m = s.match(/\{[^}]+\}/);
        if (m) leftovers.push(`${path} [${label}] → ${m[0]}`);
      }
    }
    expect(leftovers).toEqual([]);
  });

  it("every sentence is ≤16 words, any gender", () => {
    const long: string[] = [];
    for (const { path, text } of RAW) {
      for (const { label, g } of GENDERS) {
        const s = fillAll(text, g, "Storm");
        for (const sentence of sentencesOf(s)) {
          const n = wordsOf(sentence).length;
          if (n > 16) long.push(`${path} [${label}] ${n}w: ${sentence}`);
        }
      }
    }
    expect(long).toEqual([]);
  });
});

// ── Validator: new seenIt / hardPart shapes ──────────────────────────────────
const validGen = (over: Partial<ReportV2Generated> = {}): ReportV2Generated => ({
  seenIt: "When Aarav picks what to watch, he is happy and focused for a long time.",
  hardPart: "Aarav isn't fighting the screen. He's fighting being told.",
  switch: { instead: "Screens off now.", try: "Pick your stop time.", after: "You point to it." },
  tonight: ["Offer two stop times before screens start.", "Let Aarav pick one of them.", "Notice if the stop went calmly."],
  ...over,
} as ReportV2Generated);

const opts = { childName: "Aarav", gender: "boy" as Gender };
const hasErr = (g: ReportV2Generated, field: RegExp) => validateGenerated(g, opts).errors.some((e) => field.test(e));

describe("validator — new seenIt shape", () => {
  it("accepts a 'When …' strength sentence", () => {
    expect(hasErr(validGen(), /seenIt/i)).toBe(false);
  });
  it("rejects the old 'You've seen it yourself.' opener", () => {
    expect(hasErr(validGen({ seenIt: "You've seen it yourself. Aarav locks in when the idea is his." }), /seenIt/i)).toBe(true);
  });
  it("rejects a seenIt that names the worry/problem", () => {
    expect(hasErr(validGen({ seenIt: "When homework starts, Aarav argues and refuses to sit down." }), /seenIt/i)).toBe(true);
  });
  it("rejects a seenIt over 16 words", () => {
    expect(hasErr(validGen({ seenIt: "When Aarav gets to pick the thing he watches on the screen he is really very happy and stays focused." }), /seenIt/i)).toBe(true);
  });
});

describe("validator — new hardPart shape", () => {
  it("accepts \"{Name} isn't X. {He}'s Y.\"", () => {
    expect(hasErr(validGen(), /hardPart/i)).toBe(false);
  });
  it("rejects the old \"The hard part isn't X. It's Y.\" shape", () => {
    expect(hasErr(validGen({ hardPart: "The hard part isn't the screen. It's the handover." }), /hardPart/i)).toBe(true);
  });
  it("rejects a single-sentence hardPart", () => {
    expect(hasErr(validGen({ hardPart: "Aarav isn't fighting the screen." }), /hardPart/i)).toBe(true);
  });
});

describe("name/noun-subject verbs stay singular for unset gender", () => {
  const f = makeFiller("Aarav", null); // unset → they-forms for pronouns only
  it("REASON reads '{Name} <3rd-singular verb>' (not 'Aarav push/focus/stay')", () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(C.REASON)) {
      const s = "Aarav " + f(v);
      if (!/^Aarav (pushes|focuses|steps|stays|locks)\b/.test(s)) bad.push(`${k}: ${s}`);
    }
    expect(bad).toEqual([]);
  });
  it("noun-subject WHY_BOXES verbs stay singular (drive switches / focus fades / …)", () => {
    const joined = Object.values(C.WHY_BOXES).map((b) => f(b.redLine)).join(" | ");
    // full bad phrase (base verb + next word) so the correct -s forms don't false-positive
    for (const bad of ["drive switch off", "attention wander off", "focus fade.", "focus drop,"]) {
      expect(joined.includes(bad)).toBe(false);
    }
  });
});

describe("card 3 closing count word", () => {
  it("1 → 'Your answer shows it'", () => { expect(C.card3BoxClosing(1)).toContain("Your answer shows it"); expect(C.card3BoxClosing(1)).not.toContain("different answers"); });
  it("2 → 'Two different answers'", () => { expect(C.card3BoxClosing(2)).toContain("Two different answers"); });
  it("3 → 'Three different answers'", () => { expect(C.card3BoxClosing(3)).toContain("Three different answers"); });
});
