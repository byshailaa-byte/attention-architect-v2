import { describe, it, expect } from "vitest";
import {
  bannedPhrase, wordCount, extractQuotes, hasQuotedSentence,
  quotePlusQuestion, groupsChild, enforceReplyQuality,
  firstForeignScriptChar, hasDevanagari, usesTumTu, usesTumVerb, aapForm, looksHindi,
} from "@/lib/lms/coach/guards";

describe("banned words — report-v2 + coach list, whole-word", () => {
  it("flags bargaining / label / drift words", () => {
    expect(bannedPhrase("Give her a reward if she finishes.")).toBe("reward");
    expect(bannedPhrase("Make it a bet.")).toBe("bet");
    expect(bannedPhrase("Set a real stake.")).toBe("stake");
    expect(bannedPhrase("Offer a treat.")).toBe("treat");
    expect(bannedPhrase("Make a deal with him.")).toBe("deal");
    expect(bannedPhrase("He can earn it.")).toBe("earn");
    expect(bannedPhrase("Make it worth it.")).toBe("worth it");
    expect(bannedPhrase("Let's fix this.")).toBe("fix/fixes");
    expect(bannedPhrase("Nothing is wrong with him.")).toBe("nothing is wrong");
    expect(bannedPhrase("That's his type.")).toBe("type/pattern/trait/profile");
    expect(bannedPhrase("Keep a firm edge tonight.")).toBe("firm");
    expect(bannedPhrase("Hold the line tonight.")).toBe("hold the line");
    expect(bannedPhrase("Just hold it and wait.")).toBe("hold it");
    expect(bannedPhrase("He's testing you.")).toBe("testing you");
    expect(bannedPhrase("There must be a consequence.")).toBe("consequence");
    expect(bannedPhrase("Don't punish him.")).toBe("punish");
  });
  it("does not false-match substrings", () => {
    expect(bannedPhrase("He will learn to start.")).toBeNull();  // not "earn"
    expect(bannedPhrase("Let's confirm the plan.")).toBeNull();  // not "firm"
    expect(bannedPhrase("Sit between them.")).toBeNull();        // not "bet"
    expect(bannedPhrase("a clear start and end, held firmly")).toBeNull();
  });
  it("allows 'treat' only when the parent used it", () => {
    expect(bannedPhrase("A small treat helps.", "")).toBe("treat");
    expect(bannedPhrase("You asked about a treat — let's skip treats.", "should I give a treat?")).toBeNull();
  });
});

describe("script + address helpers", () => {
  it("detects non-Latin letters, leaving ₹/emoji/punctuation alone", () => {
    expect(firstForeignScriptChar("Aap bas wait kariye. ₹499 plan 🙂")).toBeNull();
    expect(firstForeignScriptChar("Aap screen band कीजिये")).toBe("क");
    expect(hasDevanagari("आज का step")).toBe(true);
    expect(hasDevanagari("Aaj ka step")).toBe(false);
  });
  it("flags tum/tu addressing the parent, but allows it inside a quoted parent→child line", () => {
    expect(usesTumTu("Tum theek kar rahi ho.")).toBe(true);
    expect(usesTumTu("Tu bataa.")).toBe(true);
    expect(usesTumTu("Aap bas wait kariye.")).toBe(false);
    // parent speaking to their own child inside the quote — not a violation
    expect(usesTumTu('Aap kahiye: "Tum pehle karo ya baad mein — tum decide karo."')).toBe(false);
  });
  it("flags tum-form verbs aimed at the parent (verb agreement)", () => {
    expect(usesTumVerb("Wahi kaam karo.")).toBe(true);
    expect(usesTumVerb("Bas isi tarah chalte raho.")).toBe(true);
    expect(usesTumVerb("Aap sahi raah par ho.")).toBe(true);
    expect(usesTumVerb("Aap kar rahe ho.")).toBe(true);
    // aap-forms are fine
    expect(usesTumVerb("Aap bas wait kariye aur dekhiye.")).toBe(false);
    expect(usesTumVerb("Aap sahi raah par hain.")).toBe(false);
    // impersonal "ho" must not false-fire
    expect(usesTumVerb("Aaj theek ho gaya.")).toBe(false);
    expect(usesTumVerb("Yeh ho sakta hai.")).toBe(false);
    // tum-verb inside a quoted parent→child line is allowed
    expect(usesTumVerb('Aap kahiye: "Pehle homework karo."')).toBe(false);
  });
  it("detects aap-form and Hindi/Hinglish text", () => {
    expect(aapForm("Aap bas wait kariye.")).toBe(true);
    expect(aapForm("Aapka kaam sirf choice dena hai.")).toBe(true);
    expect(aapForm("Bas chhod do, koshish karo.")).toBe(false); // informal, no aap
    expect(looksHindi("Bas chhod do, koshish karo aaj.")).toBe(true);
    expect(looksHindi("Keep going. One missed day is fine.")).toBe(false);
  });
});

describe("quote + question (never both)", () => {
  it("flags a quoted sentence followed by a dangling question", () => {
    expect(quotePlusQuestion('Try saying "Do it your way." Did he start?')).toBe(true);
  });
  it("allows a reply that ends with the quoted sentence (even a quoted question)", () => {
    expect(quotePlusQuestion('Try saying, "Do it your way."')).toBe(false);
    expect(quotePlusQuestion('Ask him "Which first — maths or reading?"')).toBe(false);
  });
  it("allows a single plain question with no quote", () => {
    expect(quotePlusQuestion("How did bedtime go tonight?")).toBe(false);
  });
});

describe("quote extraction + grouping", () => {
  it("pulls straight and curly quotes", () => {
    expect(extractQuotes('say "hello there" now')).toEqual(["hello there"]);
    expect(extractQuotes("say “hello there” now")).toEqual(["hello there"]);
    expect(hasQuotedSentence("no quotes here")).toBe(false);
  });
  it("flags type/group talk", () => {
    expect(groupsChild("Inventors like him need space.")).toBe(true);
    expect(groupsChild("kids like this often stall")).toBe(true);
    expect(groupsChild("Give Kabir room to try his own way.")).toBe(false);
  });
});

describe("enforceReplyQuality regen loop", () => {
  it("fires length then banned, chaining corrections", async () => {
    const long = Array(95).fill("word").join(" ") + ' say "go now".';
    const seq = [
      'Shorter now. Keep a firm edge.',          // after length fix — still has "firm"
      'Shorter now. Offer two start times.',     // after banned fix — clean
    ];
    let i = 0;
    const out = await enforceReplyQuality(long, async () => seq[i++] ?? "");
    expect(out.fired.long).toBe(1);
    expect(out.fired.banned).toBe(1);
    expect(bannedPhrase(out.text)).toBeNull();
    expect(wordCount(out.text)).toBeLessThanOrEqual(90);
  });
  it("does nothing to a clean reply", async () => {
    const clean = 'Let Kabir start his own way. Say "Your call how to begin."';
    const out = await enforceReplyQuality(clean, async () => "REGEN");
    expect(out.text).toBe(clean);
    expect(out.fired).toEqual({ long: 0, question: 0, banned: 0, repeat: 0, group: 0, script: 0, aap: 0 });
  });
  it("regenerates when the reply names a child type/group", async () => {
    const out = await enforceReplyQuality(
      "Inventors like him need space.",            // group, no banned word
      async () => "Give Kabir room to try his own way.",
    );
    expect(out.fired.group).toBe(1);
    expect(groupsChild(out.text)).toBe(false);
  });
  it("regenerates a Roman reply that slips into Devanagari", async () => {
    const out = await enforceReplyQuality(
      "Aap बस wait kariye.",                       // Devanagari in a Roman reply
      async () => "Aap bas wait kariye.",
      undefined, [], "Aaj ka step kya hai?",       // parent wrote Roman
    );
    expect(out.fired.script).toBe(1);
    expect(firstForeignScriptChar(out.text)).toBeNull();
  });
  it("regenerates tum/tu into aap", async () => {
    const out = await enforceReplyQuality(
      "Tum bas wait karo.",
      async () => "Aap bas wait kariye.",
      undefined, [], "Aaj ka step kya hai?",
    );
    expect(out.fired.aap).toBe(1);
    expect(usesTumTu(out.text)).toBe(false);
  });
  it("regenerates an informal 'karo/do' Hindi reply that lacks aap", async () => {
    const out = await enforceReplyQuality(
      "Bas chhod do aaj. Kal phir koshish karo.",   // Hindi, no tum but no aap either
      async () => "Aaj rehne dijiye. Kal phir koshish kijiye.",
      undefined, [], "Aaj ka step kya hai?",
    );
    expect(out.fired.aap).toBe(1);
    expect(aapForm(out.text)).toBe(true);
  });
  it("regenerates a reply that has aap but a tum-form verb aimed at the parent", async () => {
    const out = await enforceReplyQuality(
      "Aap bas wait karo aur dekho.",               // has 'aap' but tum-form verbs
      async () => "Aap bas wait kariye aur dekhiye.",
      undefined, [], "Aaj ka step kya hai?",
    );
    expect(out.fired.aap).toBe(1);
    expect(usesTumVerb(out.text)).toBe(false);
  });
  it("regenerates when the 'say this' sentence repeats one already given", async () => {
    const reply = 'Try again tonight. Say "Your call how to begin."';
    const out = await enforceReplyQuality(
      reply,
      async () => 'A fresh angle. Say "What would you try first?"',
      undefined,
      ["Your call how to begin."], // already said earlier in the chat
    );
    expect(out.fired.repeat).toBe(1);
    expect(out.text).toContain("What would you try first?");
  });
});
