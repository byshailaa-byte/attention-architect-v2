import type { NextRequest } from "next/server";

// Internal traffic: when the aa_internal cookie is set we send NO Meta events (pixel is
// stubbed client-side; CAPI call sites check this). Keeps our own test runs from training
// the campaign.
export function isInternalRequest(req: NextRequest): boolean {
  return req.cookies.get("aa_internal")?.value === "1";
}

export type MetaMatch = {
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  clientUserAgent?: string;
};

// Pull the match keys Meta wants on CAPI events from the (same-origin) request: the _fbp /
// _fbc cookies the pixel sets, plus the client IP and user-agent. fbc falls back to a value
// built from the persisted fbclid (assessments.utm) when the cookie isn't present yet.
export function metaMatchFromRequest(req: NextRequest, opts?: { fbclid?: string | null }): MetaMatch {
  const fbp = req.cookies.get("_fbp")?.value || undefined;
  let fbc = req.cookies.get("_fbc")?.value || undefined;
  if (!fbc && opts?.fbclid) fbc = `fb.1.${Date.now()}.${opts.fbclid}`;
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
  const clientUserAgent = req.headers.get("user-agent") || undefined;
  return { fbp, fbc, clientIp, clientUserAgent };
}
