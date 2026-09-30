import { describe, it, expect } from "vitest";
import { matchNeedsHuman } from "@/lib/leads/needs-human";

describe("matchNeedsHuman", () => {
  it("matches a refund/payment keyword (case-insensitive) and returns the word", () => {
    expect(matchNeedsHuman("I want a REFUND please")).toBe("refund");
    expect(matchNeedsHuman("i paid but no access")).toBe("paid");
  });
  it("matches safeguarding keywords", () => {
    expect(matchNeedsHuman("does my child have ADHD?")).toBe("adhd");
    expect(matchNeedsHuman("can I speak to a person")).toBe("speak to");
  });
  it("returns null for a benign message", () => {
    expect(matchNeedsHuman("what age is this for?")).toBeNull();
    expect(matchNeedsHuman(null)).toBeNull();
    expect(matchNeedsHuman("")).toBeNull();
  });
});
