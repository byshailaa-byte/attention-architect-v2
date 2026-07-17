import bcryptjs from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { getSql } from "@/lib/db/client";

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; password_hash: string | null } | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, password_hash FROM users
    WHERE email = ${email.trim().toLowerCase()}
    LIMIT 1
  `) as unknown as { id: string; password_hash: string | null }[];
  return rows[0] ?? null;
}

export async function upsertUserByEmail(email: string): Promise<string> {
  const sql = getSql();
  const normalized = email.trim().toLowerCase();
  await sql`
    INSERT INTO users (email) VALUES (${normalized})
    ON CONFLICT (email) WHERE email IS NOT NULL DO NOTHING
  `;
  const rows = (await sql`
    SELECT id FROM users WHERE email = ${normalized} LIMIT 1
  `) as unknown as { id: string }[];
  return rows[0].id;
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const sql = getSql();
  const hash = await hashPassword(password);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${userId}`;
}

export async function createResetToken(userId: string): Promise<string> {
  const sql = getSql();
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await sql`
    UPDATE password_reset_tokens SET used_at = now()
    WHERE user_id = ${userId} AND used_at IS NULL
  `;
  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${hash}, ${expiresAt})
  `;

  return raw;
}

export async function verifyResetToken(
  raw: string
): Promise<{ userId: string; tokenId: string } | null> {
  const hash = createHash("sha256").update(raw).digest("hex");
  const sql = getSql();
  const rows = (await sql`
    SELECT id, user_id FROM password_reset_tokens
    WHERE token_hash = ${hash}
      AND expires_at > now()
      AND used_at IS NULL
    LIMIT 1
  `) as unknown as { id: string; user_id: string }[];
  if (rows.length === 0) return null;
  return { userId: rows[0].user_id, tokenId: rows[0].id };
}

export async function consumeResetToken(tokenId: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${tokenId}`;
}
