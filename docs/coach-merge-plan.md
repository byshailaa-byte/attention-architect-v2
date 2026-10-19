# Conversational Coach — merge + prod deploy plan (WRITE ONLY — do not run without explicit "go")

Branch `coach-quality` → `main`, then prod deploy of project **attention-architect-v2**
(`prj_qT1IJK7HoIAkdqwbQENgbAoPy1oo`). Prod DB endpoint **ep-green-truth-aqxygaj2**. Nothing here runs
until you say go. No `git push`/merge/prod/sends have happened.

## 0. Pre-flight (confirm before touching anything)
- `psql "$DATABASE_URL_PROD" -c "select 1"` host resolves to **ep-green-truth-aqxygaj2** — abort if not.
- Confirm the Vercel project is `attention-architect-v2` by **ID** (not the similarly-named
  `the-human-decision`). Env changes/redeploys on the wrong project silently do nothing.
- `COACH_CROSS_PARENT_STATS` is **unset** in prod (stats stay OFF). `COACH_MODEL_OPUS` is **unset**
  (Sonnet 4.6 for all). Do NOT touch `ADMIN_PASSWORD` or any other env var.

## 1. Prod backup FIRST
- `scripts/apply_phase_*.mjs` each write a `/tmp/prod-backup-*.json` (schema_migrations ledger +
  the constraints they change), mode 600, before altering. Keep those.
- Additionally dump the tables this round can rewrite on rollback:
  `pg_dump "$DATABASE_URL_PROD" -t lms_day_outcome -t coach_trial_day_outcome -t coach_memory
   -t parent_memory -t coach_tracked_number -t gold_examples -t coach_call_request
   > /tmp/coach-prod-pre-merge-$(date +%s).sql` (store outside the repo; contains child data — never commit).

## 2. Migrations — apply in this order (all additive), each with its down-migration
| # | up | what | down |
|---|---|---|---|
| phase_68 | `migrations/phase_68_parent_memory.sql` (via `scripts/apply_phase_68_70.mjs`) | `parent_memory` (+language), `coach_tracked_number` | `migrations/down/phase_68_down.sql` (DROP both — DESTRUCTIVE) |
| phase_69 | `migrations/phase_69_gold_examples.sql` | `gold_examples` | `migrations/down/phase_69_down.sql` (DROP) |
| phase_70 | `migrations/phase_70_call_flags.sql` | `coach_call_request` | `migrations/down/phase_70_down.sql` (DROP) |
| phase_71 | `migrations/phase_71_outcome_not_tried_trigger.sql` (via `scripts/apply_phase_71.mjs`) | `not_tried` value + `trigger` col on both outcome tables | `migrations/down/phase_71_down.sql` (not_tried→missed, drop trigger, restore CHECK) |

Run: `TARGET=prod node scripts/apply_phase_68_70.mjs` then `TARGET=prod node scripts/apply_phase_71.mjs`.
Each verifies the host is ep-green-truth and prints the ledger. These are additive/backward-compatible:
the CURRENTLY-deployed (old) code keeps working with the widened CHECK and the extra columns, so the
migrations can go BEFORE the code deploy without breaking prod.

Then seed the gold library: `TARGET=prod node scripts/seed_gold_examples.mjs` (idempotent; upserts the
18 seed rows; never touches admin-approved rows).

## 3. parent_memory backfill (before parents hit the new Coach) — counts only, no PII
`TARGET=prod node scripts/backfill_parent_memory.mts`
- Summarises each current prod trial + paid parent's own past messages into `parent_memory` so no one
  is greeted as a stranger. The script prints **counts only** (e.g. "trials=N paid=M summarised=K");
  it must never print names, phones, or message text. Review the stdout before continuing.

## 4. Deploy the code
- `git checkout main && git merge --no-ff coach-quality` (resolve nothing expected; coach-quality is
  ahead of main). Do NOT `git push` until you approve the merge commit.
- `vercel deploy --prod` on attention-architect-v2 (NOT `the-human-decision`). Wait for READY.

## 5. Smoke tests (prod) — must all pass
1. An existing PAID parent's coach: open `/lms` coach, send "how did it go?", get a streamed/JSON reply;
   confirm a row lands in `coach_messages` and (if they report an outcome) in `lms_day_outcome`.
2. A TRIAL parent: open `/coach`, Coach speaks first (cached opener), send a message, get a reply.
3. `/admin/coach-review` returns **401** without Basic Auth; 200 with it; lists open call requests.
4. A report URL still renders (unrelated-regression check).
5. `select outcome,count(*) from lms_day_outcome group by 1` includes `not_tried` only going forward
   (no backfill of old rows).

## 6. Watch for 30 minutes
- `vercel logs` (or the dashboard) for the project: look for `[coach/engine] turn failed`,
  `final-check` warnings, 5xx on `/api/coach/message`, `/api/lms/coach`, `/api/admin/coach-preview/*`.
- Spot-check `coach_call_request` for any `urgent` rows raised in the window.

## 7. Rollback per stage
- **Code bad, data fine:** `vercel rollback` (or `request_rollback`) to the previous production
  deployment. The additive migrations are backward-compatible, so the old code runs fine with them —
  no DB rollback needed.
- **A migration is the problem:** run its down-migration in reverse order (phase_71 → 70 → 69 → 68)
  with `psql "$DATABASE_URL_PROD" -f migrations/down/phase_XX_down.sql`. phase_68/69/70 downs are
  DESTRUCTIVE (drop tables) — only if abandoning the feature; export `gold_examples` approved rows and
  any open `coach_call_request` first. phase_71 down converts `not_tried`→`missed` and drops `trigger`.
- **Backfill wrong:** `parent_memory` is derived; `DELETE FROM parent_memory` (prod) and re-run, or
  drop via phase_68 down. No parent-facing impact (Coach just greets fresh).

## 8. Stays OFF in prod (until separately approved)
- **Cross-parent "what works" stats** — `COACH_CROSS_PARENT_STATS` unset; keep off until the
  privacy-notice line (in `docs/evidence/coach-conversational-README.md`) is live on the site.
- **Opus reply model** — `COACH_MODEL_OPUS` unset; Sonnet 4.6 for all parents.
- The legacy scripted modules (`lib/lms/coach/guards.ts`, `behaviour.ts`, onboarding chips) ship but
  are OUT of the live path (kept only for the legacy test suite); delete in a later cleanup PR.
