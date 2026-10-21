import { describe, it, expect } from "vitest";
import { createNdjsonReader } from "@/lib/coach/ndjson";

// The Coach chat reader must reconstruct EVERY streamed reply exactly, no matter where the network
// splits the bytes — including mid-JSON-line and mid-multibyte-character (Devanagari). A failure here is
// the "reply exists server-side but the screen is blank" bug: a split line must never strand a reply.

// A realistic streamed turn: Hindi (Devanagari) + English + emoji deltas, then a {done} with the text.
const OBJECTS: Array<Record<string, unknown>> = [
  { delta: "Bilkul. " },
  { delta: "आज जब वो मैथ्स में रुक जाए, " },
  { delta: "तो उसके पास बैठिए 🙂 " },
  { delta: "and say: **\"Just this one — let's read it together.\"**" },
  { done: { messageId: "m-1", text: "Bilkul. आज जब वो मैथ्स में रुक जाए, तो उसके पास बैठिए 🙂 and say: **\"Just this one — let's read it together.\"**", errored: false } },
];
const enc = new TextEncoder();

function serialize(objs: Array<Record<string, unknown>>, trailingNewline = true): Uint8Array {
  const s = objs.map((o) => JSON.stringify(o)).join("\n") + (trailingNewline ? "\n" : "");
  return enc.encode(s);
}

// Feed `bytes` through the reader split at `cuts` sorted byte offsets.
function replay(bytes: Uint8Array, cuts: number[]) {
  const got: unknown[] = [];
  const errs: string[] = [];
  const reader = createNdjsonReader((o) => got.push(o), (line) => errs.push(line));
  let prev = 0;
  for (const c of [...cuts, bytes.length]) { reader.push(bytes.subarray(prev, c)); prev = c; }
  reader.end();
  return { got, errs };
}

describe("createNdjsonReader — fragmentation-safe NDJSON reassembly", () => {
  it("reconstructs every object exactly under 1000 random byte-level fragmentations", () => {
    const bytes = serialize(OBJECTS);
    for (let iter = 0; iter < 1000; iter++) {
      const nCuts = Math.floor(Math.random() * 8); // 0..7 random split points (incl. mid-line, mid-char)
      const cuts = Array.from({ length: nCuts }, () => Math.floor(Math.random() * bytes.length)).sort((a, b) => a - b);
      const { got, errs } = replay(bytes, cuts);
      expect(errs, `iter ${iter} cuts=${cuts}`).toEqual([]);
      expect(got, `iter ${iter} cuts=${cuts}`).toEqual(OBJECTS);
    }
  });

  it("survives a split exactly inside a Devanagari multibyte character", () => {
    const bytes = serialize(OBJECTS);
    // Find a byte that is a UTF-8 continuation byte (0b10xxxxxx) — splitting there is mid-character.
    const mid = bytes.findIndex((b) => (b & 0xc0) === 0x80);
    expect(mid).toBeGreaterThan(0);
    const { got, errs } = replay(bytes, [mid]);
    expect(errs).toEqual([]);
    expect(got).toEqual(OBJECTS);
  });

  it("recovers the final line when the stream has no trailing newline", () => {
    const bytes = serialize(OBJECTS, false);
    const { got } = replay(bytes, [Math.floor(bytes.length / 2)]);
    expect(got).toEqual(OBJECTS);
  });

  it("skips a malformed line (logs via onError) without stranding valid objects", () => {
    const s = JSON.stringify({ delta: "hi " }) + "\n" + "{not json{" + "\n" + JSON.stringify({ done: { messageId: "m", text: "hi there" } }) + "\n";
    const bytes = enc.encode(s);
    const { got, errs } = replay(bytes, [3, 10, 20]);
    expect(errs.length).toBe(1);
    expect(got).toEqual([{ delta: "hi " }, { done: { messageId: "m", text: "hi there" } }]);
  });
});
