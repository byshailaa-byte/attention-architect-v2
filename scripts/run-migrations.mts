// Numbered-SQL migration runner with an ORDER GUARD.
//
// Applies migrations/phase_NN_*.sql in ascending order, recording each in schema_migrations.
// It REFUSES to apply a phase out of order — the exact failure that silently dropped
// handbook_lead (phase_55 was applied AFTER phase_56, and phase_55 recreates the funnel CHECK
// from its older list). Two guards:
//   1. never apply a phase whose number is LOWER than the newest already-applied phase;
//   2. never apply a phase while an EARLIER phase is still unapplied (no gaps).
//
// Usage:
//   DATABASE_URL=...  tsx scripts/run-migrations.mts          # dev (default)
//   MIGRATE_DB=prod   tsx scripts/run-migrations.mts          # prod (uses DATABASE_URL_PROD)
//   DRY_RUN=1         tsx scripts/run-migrations.mts          # check order only, apply nothing
//
// Phases 01–53 live in lib/db/migrate.ts; this runner owns the file-based phases (54+).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const useProd = process.env.MIGRATE_DB === "prod";
const dbUrl = useProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (!dbUrl) throw new Error(`No ${useProd ? "DATABASE_URL_PROD" : "DATABASE_URL"} set`);
const dryRun = process.env.DRY_RUN === "1";
const sql = neon(dbUrl);

// Phases 01–53 are owned by lib/db/migrate.ts (and their backfill companions are applied
// manually there); this runner owns only the file-based era, phase 54+.
const MIN_FILE_PHASE = 54;
const dir = path.resolve(process.cwd(), "migrations");
const files = readdirSync(dir)
  .map((f) => {
    const m = f.match(/^phase_(\d+)_.*\.sql$/);
    return m ? { f, n: parseInt(m[1], 10), name: f.replace(/\.sql$/, "") } : null;
  })
  .filter((x): x is { f: string; n: number; name: string } => x !== null && x.n >= MIN_FILE_PHASE)
  .sort((a, b) => a.n - b.n);

// Split a .sql file into statements. Strips FULL-LINE `--` comments FIRST, so a semicolon inside
// a comment can never break the split (the bug that corrupted an earlier ad-hoc apply).
function statements(raw: string): string[] {
  return raw.replace(/^\s*--.*$/gm, "").split(";").map((s) => s.trim()).filter((s) => s.length > 3);
}

async function main() {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (phase TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const applied = new Set((await sql`SELECT phase FROM schema_migrations` as unknown as { phase: string }[]).map((r) => r.phase));
  const appliedNums = files.filter((x) => applied.has(x.name)).map((x) => x.n);
  let maxApplied = appliedNums.length ? Math.max(...appliedNums) : 0;

  let did = 0;
  for (const { f, n, name } of files) {
    if (applied.has(name)) continue;

    // GUARD 1 — older than the newest applied phase.
    if (n < maxApplied) {
      throw new Error(
        `REFUSING out-of-order migration: ${name} (#${n}) — phase #${maxApplied} is already applied.\n` +
        `Migrations must run in ascending order. Reconcile the ledger (or renumber this phase); do NOT apply an older phase over a newer one.`
      );
    }
    // GUARD 2 — an earlier phase is still unapplied (a gap).
    const gap = files.find((x) => x.n < n && !applied.has(x.name));
    if (gap) {
      throw new Error(`REFUSING ${name}: earlier migration ${gap.name} is not applied yet. Apply migrations in order (no gaps).`);
    }

    if (dryRun) { console.log(`[dry-run] would apply ${name}`); did++; continue; }
    for (const stmt of statements(readFileSync(path.join(dir, f), "utf8"))) {
      await sql.query(stmt);
    }
    await sql`INSERT INTO schema_migrations (phase) VALUES (${name}) ON CONFLICT DO NOTHING`;
    applied.add(name);
    maxApplied = Math.max(maxApplied, n);
    did++;
    console.log(`applied ${name}`);
  }
  console.log(did === 0 ? "migrations already up to date" : `done — ${did} ${dryRun ? "pending" : "applied"}`);
}

main().catch((e) => { console.error(String(e instanceof Error ? e.message : e)); process.exit(1); });
