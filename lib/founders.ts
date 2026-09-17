// Server-only: uses fs to embed photos as base64 for CDN-independent report rendering.
// Do NOT import this from client components — use lib/founders-data.ts instead.

import fs from "fs";
import path from "path";

export { SHASHI, SHAILY, SHASHANK, TEAM, roleLine } from "./founders-data";
export type { Person } from "./founders-data";

// Module-level: read once on first import, cached for the process lifetime.
function readB64(rel: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), rel)).toString("base64");
  } catch {
    return "";
  }
}

const _shailyB64   = readB64("public/shaily-headshot-square.png");
const _shashankB64 = readB64("public/founder.jpg");
// No photo file for the founder yet — resolves to null so the byline renders an
// initials monogram rather than a broken image or a placeholder.
const _shashiB64   = readB64("public/shashi-headshot-square.png");

export const FOUNDER_PHOTOS = {
  shashi:   _shashiB64   ? `data:image/png;base64,${_shashiB64}`    : null,
  shaily:   _shailyB64   ? `data:image/png;base64,${_shailyB64}`    : "/shaily-headshot-square.png",
  shashank: _shashankB64 ? `data:image/jpeg;base64,${_shashankB64}` : "/founder.jpg",
} as const;
