import { randomInt } from "crypto";
import { getSql } from "@/lib/db/client";

const OTP_TTL_MINUTES = 10;

// TEST-ONLY OTP BYPASS — remove before any production deploy — added 2026-07-14
// Phone 7389070676 receives a fixed code in non-production so the founder can test
// the real UI flow without reading server logs. Guard: NODE_ENV === 'production'
// makes this inert in a prod build even if accidentally shipped.
const TEST_OTP_PHONE = "7389070676";
const TEST_OTP_CODE = "000000";

function generateCode(phone: string): string {
  if (process.env.NODE_ENV !== "production" && phone === TEST_OTP_PHONE) {
    return TEST_OTP_CODE;
  }
  return String(randomInt(100000, 999999));
}

export async function issueOtp(phone: string): Promise<void> {
  const sql = getSql();
  const code = generateCode(phone);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  // Invalidate prior unused codes for this phone
  await sql`
    UPDATE otp_codes SET used_at = now()
    WHERE phone = ${phone} AND used_at IS NULL
  `;

  await sql`
    INSERT INTO otp_codes (phone, code, expires_at)
    VALUES (${phone}, ${code}, ${expiresAt})
  `;

  // Stub: log to console rather than sending a real SMS
  console.log(`[OTP] phone=${phone} code=${code} expires=${expiresAt}`);
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const sql = getSql();

  const rows = (await sql`
    SELECT id FROM otp_codes
    WHERE phone = ${phone}
      AND code  = ${code}
      AND expires_at > now()
      AND used_at IS NULL
    LIMIT 1
  `) as unknown as { id: string }[];

  if (rows.length === 0) return false;

  await sql`UPDATE otp_codes SET used_at = now() WHERE id = ${rows[0].id}`;
  return true;
}

export async function upsertUser(phone: string): Promise<string> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO users (phone) VALUES (${phone})
    ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
    RETURNING id
  `) as unknown as { id: string }[];

  return rows[0].id;
}
