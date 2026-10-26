import { describe, it, expect } from "vitest";
import { makeRoundEmitter, ROUND_SEP } from "@/lib/coach/engine";

// Regression for "…without a fight?Let me know how it goes tonight!" — a turn whose text spans two
// tool-use rounds streamed the rounds back-to-back with no separator, so the visible reply ran two
// sentences together (the persisted text joined them with a space). The round emitter must inject the
// SAME separator into the live stream.
describe("makeRoundEmitter — joins tool-use rounds in the live stream", () => {
  function run(rounds: string[][]) {
    const out: string[] = [];
    const e = makeRoundEmitter((t) => out.push(t));
    for (const tokens of rounds) { e.startRound(); for (const t of tokens) e.emit(t); }
    return out.join("");
  }

  it("inserts ROUND_SEP before the next round's first token (no run-on sentences)", () => {
    const joined = run([["Try ", "the one-line choice — ready without a fight?"], ["Let me know ", "how it goes tonight!"]]);
    expect(joined).toBe("Try the one-line choice — ready without a fight?" + ROUND_SEP + "Let me know how it goes tonight!");
    expect(joined).not.toContain("fight?Let me know");
  });

  it("no leading separator for a single round", () => {
    expect(run([["Hello ", "there"]])).toBe("Hello there");
  });

  it("a round that emits no text adds no stray separator", () => {
    expect(run([["one"], [], ["two"]])).toBe("one" + ROUND_SEP + "two");
  });
});
