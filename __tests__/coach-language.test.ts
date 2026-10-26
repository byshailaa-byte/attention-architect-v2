import { describe, it, expect } from "vitest";
import { resolveReplyLanguage } from "@/lib/coach/lang";

// The reply language follows the parent's LATEST message (language + script). A stored preference only
// seeds the opener — it must never force Hindi onto an English message (the preview-test regression).
describe("resolveReplyLanguage — latest message wins over stored preference", () => {
  it("stored 'hi' + English messages → every reply is English", () => {
    const english = [
      "She stops halfway through maths.",
      "she doesn't know how to do it",
      "I sat with her but she still got up",
      "first time",
    ];
    for (const m of english) expect(resolveReplyLanguage("hi", m)).toBe("en");
  });

  it("the opener (no message yet) uses the stored preference", () => {
    expect(resolveReplyLanguage("hi", "")).toBe("hi");
    expect(resolveReplyLanguage("hinglish", "")).toBe("hinglish");
    expect(resolveReplyLanguage(null, "")).toBe("en");
  });

  it("a trivial acknowledgement does not flip the thread's language", () => {
    expect(resolveReplyLanguage("hi", "ok")).toBe("hi");
    expect(resolveReplyLanguage("hi", "hmm")).toBe("hi");
  });

  it("a real message switches to its own language/script regardless of a stored 'en'", () => {
    expect(resolveReplyLanguage("en", "आज क्या करूं उसके साथ")).toBe("hi");           // Devanagari
    expect(resolveReplyLanguage("en", "woh raat ko padhne se mana karti hai")).toBe("hinglish"); // Roman Hindi (substantive)
  });
});
