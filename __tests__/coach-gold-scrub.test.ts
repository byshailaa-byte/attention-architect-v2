import { describe, it, expect } from "vitest";
import { scrubForGold } from "@/lib/admin/coach-review";

describe("scrubForGold — gold examples from real chats carry no identifying details", () => {
  const names = { childName: "Diya Sharma", parentName: "Sneha Sharma" };

  it("replaces the child's and parent's first names with placeholders", () => {
    const out = scrubForGold("Diya won't start and Sneha is exhausted.", names);
    expect(out).not.toMatch(/Diya|Sneha/i);
    expect(out).toContain("the child");
    expect(out).toContain("you");
  });

  it("redacts phone numbers and emails", () => {
    const out = scrubForGold("call me on 9876543210 or sneha@example.com", names);
    expect(out).toContain("[number]");
    expect(out).toContain("[email]");
    expect(out).not.toMatch(/9876543210|example\.com/);
  });

  it("leaves small counts (e.g. '4 or 5') untouched", () => {
    expect(scrubForGold("we argue 4 or 5 times", names)).toContain("4 or 5");
  });
});
