import { describe, it, expect } from "vitest";
import { stripWrappingQuotes } from "@/lib/coach-trial/content";

// Regression for the Day-1 "say" line rendering doubled quotes. The report's card-4 switch.try
// comes already wrapped in quotes (straight OR curly); the coach UI wraps it again in curly quotes,
// which produced ""If this sparks…"". stripWrappingQuotes removes exactly one layer at the source so
// the UI's own quotes read as a single clean pair.
describe("coach-trial card-4 say line — strip one layer of wrapping quotes", () => {
  it("strips curly double quotes (the real giveup/finish copy shape)", () => {
    expect(stripWrappingQuotes("“Best of three. Want to go again?”")).toBe("Best of three. Want to go again?");
    expect(stripWrappingQuotes("“Park that idea. Finish this, then chase it.”")).toBe("Park that idea. Finish this, then chase it.");
  });

  it("strips straight double quotes (the real reminders/homework copy shape)", () => {
    expect(stripWrappingQuotes('"What would make this worth your time right now?"')).toBe("What would make this worth your time right now?");
  });

  it("strips single quotes too", () => {
    expect(stripWrappingQuotes("‘go again’")).toBe("go again");
    expect(stripWrappingQuotes("'go again'")).toBe("go again");
  });

  it("leaves unquoted text and inner quotes untouched", () => {
    expect(stripWrappingQuotes("Try one small change tonight.")).toBe("Try one small change tonight.");
    // only ONE layer is removed, and only when the whole string is wrapped
    expect(stripWrappingQuotes('She said "ok" then left')).toBe('She said "ok" then left');
  });

  it("does not over-strip when only one side is quoted or quotes are mismatched", () => {
    expect(stripWrappingQuotes('"half quoted')).toBe('"half quoted');
    expect(stripWrappingQuotes("“curly open, straight close\"")).toBe("“curly open, straight close\"");
  });

  it("wrapping it the way the UI does yields a single clean pair", () => {
    const say = stripWrappingQuotes("“Best of three. Want to go again?”");
    expect(`“${say}”`).toBe("“Best of three. Want to go again?”"); // single pair, not “”…“”
  });
});
