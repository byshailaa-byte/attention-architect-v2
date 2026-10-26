import { describe, it, expect } from "vitest";
import { composeFallback } from "@/content/report-v2/fallbacks";

// The hardPart first sentence "{Name} isn't X." — X must be a BLAME LABEL the parent fears (lazy,
// stubborn, a quitter…), never something the parent can plainly SEE (which just argues with what
// they're watching, e.g. "hooked on the screen", "giving up", "losing interest").
const OBSERVABLE = /hooked on the screen|giving up|losing interest|on the phone/i;
const WORRIES = ["reminders", "homework", "screens", "confidence", "giveup", "finish", "other"];
const ARCHES = ["The All-In Kid", "The Storm", "The Captain", "The Inventor", "The Explorer", "The Live Wire", "The Magnet", "The Glue"];

describe("fallback hardPart — 'isn't X' is a blame label, never plainly-visible", () => {
  for (const arch of ARCHES) {
    for (const w of WORRIES) {
      it(`${arch} × ${w}: X is not an observable behaviour`, () => {
        const hp = composeFallback(arch, w, "Aarav", "boy").hardPart;
        const x = hp.match(/isn['’]t ([^.]+)[.]/)?.[1] ?? "";
        expect(x, hp).not.toMatch(OBSERVABLE);
        expect(x.length, hp).toBeGreaterThan(2);
      });
    }
  }

  it("screens uses the de-escalated blame label (not 'hooked on the screen')", () => {
    const hp = composeFallback("The All-In Kid", "screens", "Aarav", "boy").hardPart;
    expect(hp).toMatch(/isn['’]t choosing the screen over you/);
    expect(hp).not.toMatch(/hooked on the screen/);
  });

  it("giveup/finish no longer restate the visible behaviour", () => {
    expect(composeFallback("The Storm", "giveup", "Aarav", "boy").hardPart).toMatch(/isn['’]t a quitter/);
    expect(composeFallback("The Explorer", "finish", "Aarav", "boy").hardPart).toMatch(/isn['’]t being careless/);
  });
});
