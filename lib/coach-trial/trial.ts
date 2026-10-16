// coach_trials domain: the 4-day trial clock (pure, testable) + DB CRUD.
import { getSql } from "@/lib/db/client";

export const TRIAL_DAYS = 4;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Canonical public base for trial/coach links (parent-facing). Single source so grant + approve agree.
export function trialLinkBase(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://attentionparents.thehumandecision.in";
}

export type TrialStatus = "active" | "ended" | "converted";

export type CoachTrial = {
  id: string;
  user_id: string | null;
  parent_key: string;
  session_id: string | null;
  worry: string | null;
  archetype: string | null;
  age_band: string | null;
  status: TrialStatus;
  started_at: string;   // ISO
  ends_at: string;      // ISO
  extended_days: number;
  granted_by: string | null;
  baseline_value: string | null;
  commit_slot: string | null;
  flagged_at: string | null;
  created_at: string;
  // phase_65 — Preview Coach (sandbox). is_preview=true rows never consume the one-real-trial slot.
  is_preview: boolean;
  owner_admin: string | null;
  focus_concern: string | null;
  approved_by: string | null;
  approved_at: string | null;
};

// ── Pure clock ───────────────────────────────────────────────────────────────────
// 06:00 IST on the IST-calendar date of `from`, plus `addDays`. 06:00 IST = 00:30 UTC.
export function istSixAm(from: Date, addDays: number): Date {
  const ist = new Date(from.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + addDays, 0, 30, 0, 0));
}

// Lock instant = 06:00 IST on startDate + (TRIAL_DAYS + extendedDays) → the Day-5 lock, pushed by extensions.
export function computeEndsAt(startedAt: Date, extendedDays = 0): Date {
  return istSixAm(startedAt, TRIAL_DAYS + extendedDays);
}

// Unlock instant for content day N (1-based): 06:00 IST on startDate + (N-1).
export function dayUnlockAt(startedAt: Date, day: number): Date {
  return istSixAm(startedAt, day - 1);
}

// Current content day (1..TRIAL_DAYS) at `now`.
export function currentTrialDay(startedAt: Date, now: Date): number {
  const day1 = dayUnlockAt(startedAt, 1).getTime();
  if (now.getTime() < day1) return 1;
  const days = Math.floor((now.getTime() - day1) / 86_400_000) + 1;
  return Math.min(Math.max(days, 1), TRIAL_DAYS);
}

export function dayIsUnlocked(startedAt: Date, day: number, now: Date): boolean {
  return now.getTime() >= dayUnlockAt(startedAt, day).getTime();
}

// Locked = status ended, or (active and past ends_at). A converted trial is never "locked"
// (the parent paid — paid access takes over upstream).
export function isTrialLocked(trial: Pick<CoachTrial, "status" | "ends_at">, now: Date): boolean {
  if (trial.status === "ended") return true;
  if (trial.status === "converted") return false;
  return now.getTime() >= new Date(trial.ends_at).getTime();
}

// ── DB ─────────────────────────────────────────────────────────────────────────
const COLS = `id, user_id, parent_key, session_id, worry, archetype, age_band, status,
  started_at, ends_at, extended_days, granted_by, baseline_value, commit_slot, flagged_at, created_at,
  is_preview, owner_admin, focus_concern, approved_by, approved_at`;

type CreateTrialInput = {
  userId: string | null;
  parentKey: string;
  sessionId: string | null;
  worry: string | null;
  archetype: string | null;
  ageBand: string | null;
  grantedBy: string | null;
  startedAt?: Date;
};

export async function createTrial(input: CreateTrialInput): Promise<CoachTrial | null> {
  const sql = getSql();
  const started = input.startedAt ?? new Date();
  const endsAt = computeEndsAt(started, 0);
  const rows = (await sql`
    INSERT INTO coach_trials (user_id, parent_key, session_id, worry, archetype, age_band, status, started_at, ends_at, granted_by)
    VALUES (${input.userId}, ${input.parentKey}, ${input.sessionId}, ${input.worry}, ${input.archetype}, ${input.ageBand},
            'active', ${started.toISOString()}, ${endsAt.toISOString()}, ${input.grantedBy})
    ON CONFLICT (parent_key) WHERE is_preview = false DO NOTHING
    RETURNING ${sql.unsafe(COLS)}
  `) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

// phase_65 — create a SANDBOX preview trial (is_preview=true). Unlimited: never dedupes on
// parent_key (the partial unique index only covers is_preview=false), never consumes the real
// one-trial-per-parent slot. owner_admin + focus_concern are preview-only. Sends nothing to the parent.
type CreatePreviewInput = {
  userId: string | null;
  parentKey: string;
  sessionId: string | null;
  worry: string | null;
  archetype: string | null;
  ageBand: string | null;
  ownerAdmin: string;       // fixed "admin" (single-password admin)
  focusConcern: string | null;
  startedAt?: Date;
};

export async function createPreviewTrial(input: CreatePreviewInput): Promise<CoachTrial | null> {
  const sql = getSql();
  const started = input.startedAt ?? new Date();
  const endsAt = computeEndsAt(started, 0);
  const rows = (await sql`
    INSERT INTO coach_trials
      (user_id, parent_key, session_id, worry, archetype, age_band, status, started_at, ends_at,
       granted_by, is_preview, owner_admin, focus_concern)
    VALUES (${input.userId}, ${input.parentKey}, ${input.sessionId}, ${input.worry}, ${input.archetype}, ${input.ageBand},
            'active', ${started.toISOString()}, ${endsAt.toISOString()}, 'admin', true, ${input.ownerAdmin}, ${input.focusConcern})
    RETURNING ${sql.unsafe(COLS)}
  `) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

// Mark a trial as approved-and-offered (records who + when). Used by the Approve & offer flow.
export async function setTrialApproved(id: string, approvedBy: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE coach_trials SET approved_by = ${approvedBy}, approved_at = COALESCE(approved_at, now()) WHERE id = ${id}::uuid`;
}

// The parent's REAL trial (is_preview=false). Previews share parent_key, so this must exclude them.
export async function getTrialByParentKey(parentKey: string): Promise<CoachTrial | null> {
  const sql = getSql();
  const rows = (await sql`SELECT ${sql.unsafe(COLS)} FROM coach_trials WHERE parent_key = ${parentKey} AND is_preview = false LIMIT 1`) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

// The parent's current sandbox preview trial, if any (newest). Drives the admin "Previewed" chip.
export async function getPreviewByParentKey(parentKey: string): Promise<CoachTrial | null> {
  const sql = getSql();
  const rows = (await sql`SELECT ${sql.unsafe(COLS)} FROM coach_trials WHERE parent_key = ${parentKey} AND is_preview = true ORDER BY created_at DESC LIMIT 1`) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

export async function getTrialByUser(userId: string): Promise<CoachTrial | null> {
  const sql = getSql();
  const rows = (await sql`SELECT ${sql.unsafe(COLS)} FROM coach_trials WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

export async function getTrialById(id: string): Promise<CoachTrial | null> {
  const sql = getSql();
  const rows = (await sql`SELECT ${sql.unsafe(COLS)} FROM coach_trials WHERE id = ${id}::uuid LIMIT 1`) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

// Extend the trial by N days (default 2) — pushes ends_at and bumps extended_days. Only while active.
export async function extendTrial(id: string, days = 2): Promise<CoachTrial | null> {
  const sql = getSql();
  const t = await getTrialById(id);
  if (!t || t.status !== "active") return null;
  const newEnds = computeEndsAt(new Date(t.started_at), t.extended_days + days);
  const rows = (await sql`
    UPDATE coach_trials SET extended_days = extended_days + ${days}, ends_at = ${newEnds.toISOString()}
    WHERE id = ${id}::uuid RETURNING ${sql.unsafe(COLS)}`) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

export async function endTrial(id: string): Promise<CoachTrial | null> {
  const sql = getSql();
  const rows = (await sql`UPDATE coach_trials SET status = 'ended' WHERE id = ${id}::uuid AND status = 'active' RETURNING ${sql.unsafe(COLS)}`) as unknown as CoachTrial[];
  return rows[0] ?? null;
}

export async function convertTrial(id: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE coach_trials SET status = 'converted' WHERE id = ${id}::uuid`;
}

export async function flagTrial(id: string): Promise<void> {
  const sql = getSql();
  await sql`UPDATE coach_trials SET flagged_at = COALESCE(flagged_at, now()) WHERE id = ${id}::uuid`;
}

// Baseline + commit slot captured during onboarding.
export async function saveTrialBaseline(id: string, baselineValue: string, commitSlot: string | null): Promise<void> {
  const sql = getSql();
  await sql`UPDATE coach_trials SET baseline_value = ${baselineValue}, commit_slot = ${commitSlot} WHERE id = ${id}::uuid`;
}
