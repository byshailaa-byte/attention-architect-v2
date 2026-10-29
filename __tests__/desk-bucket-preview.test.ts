import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { classifyBucket } from "@/lib/admin/parents/data";

describe("Parents desk — a Preview-Coach trial does NOT count as 'trial active'", () => {
  const src = readFileSync(path.resolve(process.cwd(), "lib/admin/parents/data.ts"), "utf8");

  it("the trial_active query excludes preview trials (is_preview = false)", () => {
    expect(src).toMatch(/coach_trials t WHERE t\.session_id = a\.session_id AND t\.status='active' AND t\.is_preview = false/);
  });

  it("preview-only trial (→ trialActive=false) + latest call no_answer → 'Did not pick up'", () => {
    const r = classifyBucket({ purchased: false, trialActive: false, latestOutcome: "no_answer", hasPhone: true });
    expect(r.bucket).toBe("no_pickup");
    expect(r.statusLabel).toBe("Did not pick up");
  });

  it("a REAL active trial (→ trialActive=true) → 'Trial in progress'", () => {
    const r = classifyBucket({ purchased: false, trialActive: true, latestOutcome: "no_answer", hasPhone: true });
    expect(r.bucket).toBe("trial_in_progress");
    expect(r.statusLabel).toBe("Trial in progress");
  });

  it("priority holds: purchased > trial > call outcome > no-phone > new", () => {
    expect(classifyBucket({ purchased: true, trialActive: true, latestOutcome: "no_answer", hasPhone: true }).bucket).toBe("purchased");
    expect(classifyBucket({ purchased: false, trialActive: false, latestOutcome: null, hasPhone: false }).bucket).toBe("no_phone");
    expect(classifyBucket({ purchased: false, trialActive: false, latestOutcome: null, hasPhone: true }).bucket).toBe("new");
  });
});
