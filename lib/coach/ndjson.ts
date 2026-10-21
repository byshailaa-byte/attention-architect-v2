// Streaming NDJSON reader shared by the Coach chat UI. Assembles `{...}\n`-delimited JSON objects from
// arbitrary byte chunks delivered by a fetch ReadableStream. It is robust to the two ways a network
// chunk boundary can fall in the wrong place:
//   1. a JSON line split across two chunks  → a line buffer holds the partial line until the "\n" arrives;
//   2. a multibyte char (e.g. Devanagari) split mid-sequence → a single stream-mode TextDecoder holds the
//      partial bytes until the rest arrives.
// A malformed line is reported to onError and SKIPPED — it never throws out of the caller's read loop,
// which would strand a reply that actually arrived. Pure and framework-free so it can be unit-tested by
// replaying a stream fragmented at arbitrary byte positions.
export type NdjsonHandler = (obj: unknown) => void;
export type NdjsonErrorHandler = (line: string, err: unknown) => void;

export function createNdjsonReader(onObj: NdjsonHandler, onError?: NdjsonErrorHandler) {
  const dec = new TextDecoder();
  let buf = "";
  const emit = (line: string) => {
    const t = line.trim();
    if (!t) return;
    try { onObj(JSON.parse(t)); } catch (e) { onError?.(t, e); }
  };
  const drainLines = () => {
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, nl); buf = buf.slice(nl + 1); emit(line); }
  };
  return {
    // Feed the next raw chunk. stream:true keeps any trailing partial multibyte char for the next push.
    push(chunk: Uint8Array) { buf += dec.decode(chunk, { stream: true }); drainLines(); },
    // Call once the stream closes: flush the decoder and parse any final line that had no trailing "\n".
    end() { buf += dec.decode(); drainLines(); const last = buf; buf = ""; emit(last); },
  };
}
