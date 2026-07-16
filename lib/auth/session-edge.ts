/**
 * Edge-runtime-compatible session verification using Web Crypto (crypto.subtle).
 * Imported ONLY by middleware.ts, which runs on the Edge Runtime where Node.js
 * built-in 'crypto' is unavailable.
 *
 * Server components and API routes continue to use lib/auth/session.ts
 * (Node.js runtime — createHmac / timingSafeEqual are fine there).
 */

export const COOKIE_NAME = "lms_session";

function secret(): string {
  const s = process.env.LMS_SESSION_SECRET;
  if (!s) throw new Error("[LMS] LMS_SESSION_SECRET is not set");
  return s;
}

async function importKey(rawSecret: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(rawSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

function b64urlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function verifySessionTokenEdge(token: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, expStr, hmac] = parts;
  const payload = `${userId}.${expStr}`;

  try {
    const key = await importKey(secret());
    const valid = await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(hmac),
      new TextEncoder().encode(payload)
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Math.floor(Date.now() / 1000) > exp) return null;

  return userId;
}
