import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizePhoneCore } from "@/lib/admin/parents/timeline";

describe("Parent timeline — phone normalisation (one parent across formats)", () => {
  it("+91, leading 0 and spaces all collapse to the same 10-digit key", () => {
    const want = "9876543210";
    expect(normalizePhoneCore("+91 98765 43210")).toBe(want);
    expect(normalizePhoneCore("098765 43210")).toBe(want);
    expect(normalizePhoneCore("9876543210")).toBe(want);
    expect(normalizePhoneCore("+919876543210")).toBe(want);
    expect(normalizePhoneCore("91-98765-43210")).toBe(want);
    // two different numbers must NOT collapse together
    expect(normalizePhoneCore("+91 90000 00001")).not.toBe(normalizePhoneCore("+91 90000 00002"));
  });
});

describe("Parent timeline — operator/admin views are excluded by construction", () => {
  const raw = readFileSync(path.resolve(process.cwd(), "lib/admin/parents/timeline.ts"), "utf8");
  const code = raw.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"); // drop comment lines
  it("never queries admin_view_log", () => {
    expect(code).not.toMatch(/admin_view_log/);
  });
  it("excludes internal sessions from site events", () => {
    expect(code).toMatch(/is_internal\s*=\s*true/);  // the NOT EXISTS(... is_internal=true) guard
  });
  it("attaches site events ONLY via the parent's own assessment session_ids (shared-device safe)", () => {
    // funnel_events are filtered by the passed session ids, never by anon_id/phone.
    expect(code).toMatch(/funnel_events[\s\S]*?session_id = ANY/);
    expect(code).not.toMatch(/anon_id/);
  });
});
