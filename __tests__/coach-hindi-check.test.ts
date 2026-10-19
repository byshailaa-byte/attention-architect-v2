import { describe, it, expect } from "vitest";
import { hindiReplyIssues } from "@/lib/coach/hindi-check";
import { detectLanguage } from "@/lib/coach/lang";

// Fixtures modelled on the bad Hindi replies from the live click-through (child = Diya, a girl;
// parent used neither "tu" nor emoji). Each BAD reply must produce ≥1 violation; each FIXED reply
// must be clean. This is the deterministic guard that the loose regexes missed.
const girl = { childGender: "girl" as const, parentUsedTu: false, parentUsedEmoji: false };

const CASES: { name: string; bad: string; fixed: string; opts?: typeof girl }[] = [
  {
    name: "informal parent-imperatives",
    bad: "Aaj unhe mat kehna ki galat hai. Unke paas baitho aur batao kya hua.",
    fixed: "Aaj unhe yeh mat kahiye ki galat hai. Unke paas baithiye aur poochiye kya hua.",
  },
  {
    name: "coach genders itself + child verb wrong gender",
    bad: "Main samajh gayi. Jab Diya padhta hai toh woh ruka rehta hai.",
    fixed: "Samajh aa gaya. Jab Diya padhti hai toh woh ruk jaati hai.",
  },
  {
    name: "child script uses tu (parent did not)",
    bad: 'Diya se kahiye: "Diya, tu decide kar — pehle kaunsa subject?"',
    fixed: 'Diya se kahiye: "Diya, tum decide karo — pehle kaunsa subject?"',
  },
  {
    name: "English phrase in Devanagari + emoji + ushe typo",
    bad: "यह उसके लिए अच्छा है। That's the real win 😊. ushe shabashi dijiye.",
    fixed: "यह उसके लिए अच्छी बात है। उसे ज़रूर शाबाशी दीजिए।",
  },
];

describe("hindiReplyIssues — live-test fixtures fail before, pass after", () => {
  for (const c of CASES) {
    it(`BAD: ${c.name} → flagged`, () => {
      const issues = hindiReplyIssues(c.bad, c.opts ?? girl);
      expect(issues.length, `expected violations, got none for: ${c.bad}`).toBeGreaterThan(0);
    });
    it(`FIXED: ${c.name} → clean`, () => {
      const issues = hindiReplyIssues(c.fixed, c.opts ?? girl);
      expect(issues, `expected clean, got: ${JSON.stringify(issues)}`).toEqual([]);
    });
  }

  it('"tu" is allowed in the child script when the parent used "tu" first', () => {
    const reply = 'Diya se kahiye: "Diya, tu decide kar."';
    expect(hindiReplyIssues(reply, { ...girl, parentUsedTu: true })).toEqual([]);
    expect(hindiReplyIssues(reply, { ...girl, parentUsedTu: false }).length).toBeGreaterThan(0);
  });

  it("for a boy, feminine child verbs are flagged (and masculine are clean)", () => {
    expect(hindiReplyIssues("Jab woh padhti hai toh ruk jaati hai.", { childGender: "boy", parentUsedTu: false, parentUsedEmoji: false }).length).toBeGreaterThan(0);
    expect(hindiReplyIssues("Jab woh padhta hai toh ruk jaata hai.", { childGender: "boy", parentUsedTu: false, parentUsedEmoji: false })).toEqual([]);
  });

  it('flags "manti" (→ maanti) and English "lead" in a Hindi reply', () => {
    expect(hindiReplyIssues("woh zyada manti hai", girl).some((i) => i.includes("manti"))).toBe(true);
    expect(hindiReplyIssues("Diya ko lead kar rahi hai", girl).some((i) => i.includes("lead"))).toBe(true);
  });
});

describe("script matching — Roman↔Devanagari, and the English check never forces Devanagari", () => {
  it("detects the parent's script: Roman-Hindi → hinglish, Devanagari → hi, English → en", () => {
    expect(detectLanguage("theek hai, aaj kya karu")).toBe("hinglish");
    expect(detectLanguage("आज क्या करूँ")).toBe("hi");
    expect(detectLanguage("she argued again today")).toBe("en");
  });

  it("a Roman-Hindi (Hinglish) reply with loanwords is NOT flagged as English (won't be pushed to Devanagari)", () => {
    const roman = 'Aaj homework se pehle kahiye: "Diya, tum decide karo." Phir thoda peechhe hat jaiye.';
    expect(hindiReplyIssues(roman, girl)).toEqual([]);
  });

  it("romanized Hindi words (achha, yeh, chhupa, theek) are NOT mistaken for English", () => {
    const roman = "Theek hai. Achha, jab usne copy chhupa di toh yeh samajh aaya ki use madad chahiye.";
    expect(hindiReplyIssues(roman, girl).some((i) => i.toLowerCase().includes("english"))).toBe(false);
  });

  it("a reply with genuine English IS flagged (that's / win)", () => {
    const dev = "यह उसके लिए अच्छा है। That's the real win।";
    expect(hindiReplyIssues(dev, girl).some((i) => i.toLowerCase().includes("english"))).toBe(true);
  });
});
