import { describe, it, expect } from "vitest";
import { bridgeConcernFor } from "@/content/goals";

describe("bridgeConcernFor", () => {
  it("maps each legacy concern to its canonical bridge", () => {
    expect(bridgeConcernFor("focus")).toBe("reminders");
    expect(bridgeConcernFor("attention")).toBe("reminders");
    expect(bridgeConcernFor("motivation")).toBe("giveup");
    expect(bridgeConcernFor("potential")).toBe("confidence");
    expect(bridgeConcernFor("school")).toBe("homework");
    expect(bridgeConcernFor("emotions")).toBe("other");
  });

  it("returns each canonical concern unchanged", () => {
    const canonical = [
      "homework",
      "reminders",
      "screens",
      "confidence",
      "giveup",
      "finish",
      "other",
    ] as const;
    for (const k of canonical) {
      expect(bridgeConcernFor(k)).toBe(k);
    }
  });

  it("falls back to 'other' for null, undefined, empty, and unknown keys", () => {
    expect(bridgeConcernFor(null)).toBe("other");
    expect(bridgeConcernFor(undefined)).toBe("other");
    expect(bridgeConcernFor("")).toBe("other");
    expect(bridgeConcernFor("kjhsdf-not-a-real-concern")).toBe("other");
  });

  it("never returns undefined", () => {
    for (const k of ["focus", "homework", "", "garbage", null, undefined]) {
      expect(bridgeConcernFor(k)).toBeDefined();
    }
  });
});
