// Server-only: uses fs to embed photos as base64 for CDN-independent report rendering.
// Do NOT import this from client components — use lib/founders-data.ts instead.

import fs from "fs";
import path from "path";

export { SHAILY, SHASHANK } from "./founders-data";

// Module-level: read once on first import, cached for the process lifetime.
const _shailyB64 = (() => {
  try {
    return fs
      .readFileSync(path.join(process.cwd(), "public/shaily-headshot-square.png"))
      .toString("base64");
  } catch { return ""; }
})();

const _shashankB64 = (() => {
  try {
    return fs
      .readFileSync(path.join(process.cwd(), "public/founder.jpg"))
      .toString("base64");
  } catch { return ""; }
})();

export const FOUNDER_PHOTOS = {
  shaily:   _shailyB64   ? `data:image/png;base64,${_shailyB64}`    : "/shaily-headshot-square.png",
  shashank: _shashankB64 ? `data:image/jpeg;base64,${_shashankB64}` : "/founder.jpg",
};
