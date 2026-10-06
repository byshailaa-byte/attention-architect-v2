import { describe, it, expect } from "vitest";
import { isSafetyMessage, safetyReply } from "@/lib/lms/coach/safety";

describe("coach safety regex", () => {
  it("flags English harm / abuse / self-harm / danger", () => {
    for (const s of [
      "My husband hits him when he doesn't study",
      "he beats her sometimes",
      "I slapped him yesterday",
      "this feels like abuse",
      "I'm worried about self-harm",
      "she talks about suicide",
      "he said he wants to kill himself",
      "I think she is in danger",
      "he feels unsafe at home",
    ]) expect(isSafetyMessage(s), s).toBe(true);
  });

  it("flags Hindi / Hinglish harm words", () => {
    for (const s of [
      "wo khudkushi ki baat karta hai",
      "papa usko maarte hain",
      "main usko mar dungi",
      "use chot lagi hai jaan bujhkar",
      "wo jaan dene ki baat karta hai",
    ]) expect(isSafetyMessage(s), s).toBe(true);
  });

  it("does NOT flag ordinary coaching messages (EN + Hinglish)", () => {
    for (const s of [
      "He said I don't want either and walked off",
      "it didn't work",
      "Usko homework shuru karne mein bahut time lagta hai",
      "Should I give him ADHD medicine?",
      "What's the capital of France?",
      "hamara routine 6 baje ka hai",
      "the market is far from school",
    ]) expect(isSafetyMessage(s), s).toBe(false);
  });

  it("safety reply carries the three helplines + support email, and the child name", () => {
    const r = safetyReply("Kabir", "support@capsdevgurukul.in");
    expect(r).toContain("112");
    expect(r).toContain("14416");
    expect(r).toContain("1098");
    expect(r).toContain("support@capsdevgurukul.in");
    expect(r).toContain("Kabir");
  });
});
