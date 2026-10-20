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

## 1. Prod backup FIRST — a Neon branch, NOT a local dump
- Immediately before the migrations, create a Neon branch of prod (endpoint ep-green-truth-aqxygaj2),
  named `pre-coach-merge-<YYYY-MM-DD>` (Neon console → Branches → "Create branch" from the prod branch,
  or `neonctl branches create --name pre-coach-merge-<date>`). **Record the branch ID** in this doc / the
  deploy notes. Rollback can then restore or compare against that branch. No child data is written to
  local disk — do NOT pg_dump the outcome/memory/gold tables to a file.
- The apply scripts still write their small `/tmp/prod-backup-*.json` (schema_migrations ledger + the
  changed constraint defs only — no row data), mode 600. Keep those as the migration audit trail.

## 2. Migrations — apply in this order (all additive), each with its down-migration
| # | up | what | down |
|---|---|---|---|
| phase_68 | `migrations/phase_68_parent_memory.sql` (via `scripts/apply_phase_68_70.mjs`) | `parent_memory` (+language), `coach_tracked_number` | `migrations/down/phase_68_down.sql` (DROP both — DESTRUCTIVE) |
| phase_69 | `migrations/phase_69_gold_examples.sql` | `gold_examples` | `migrations/down/phase_69_down.sql` (DROP) |
| phase_70 | `migrations/phase_70_call_flags.sql` | `coach_call_request` | `migrations/down/phase_70_down.sql` (DROP) |
| phase_71 | `migrations/phase_71_outcome_not_tried_trigger.sql` (via `scripts/apply_phase_71.mjs`) | `not_tried` value + `trigger` col on both outcome tables | `migrations/down/phase_71_down.sql` (not_tried→missed, drop trigger, restore CHECK) |
| phase_72 | `migrations/phase_72_coach_messages_opener_origin.sql` (via `scripts/apply_phase_72.mjs`) | allow `origin='opener'` on coach_messages (the cached opener row) | `migrations/down/phase_72_down.sql` (opener→llm, restore CHECK) |

Run: `TARGET=prod node scripts/apply_phase_68_70.mjs` then `TARGET=prod node scripts/apply_phase_71.mjs`
then `TARGET=prod node scripts/apply_phase_72.mjs`.
Each verifies the host is ep-green-truth and prints the ledger. These are additive/backward-compatible:
the CURRENTLY-deployed (old) code keeps working with the widened CHECK and the extra columns, so the
migrations can go BEFORE the code deploy without breaking prod.

Then seed the gold library: `TARGET=prod node scripts/seed_gold_examples.mjs` (idempotent; upserts the
18 seed rows; never touches admin-approved rows).

### 2.5 Constraint audit gate (must pass BEFORE deploy)
`TARGET=prod node scripts/audit_coach_constraints.mjs` (read-only) → must print **"✓ No mismatches"**.
This compares every CHECK/enum on the coach tables against every value the code can write (origin,
outcome incl. not_tried, source, trigger, flags) — the class of bug that broke the opener. On prod
BEFORE these migrations it reports exactly: `coach_messages.origin` missing `opener` (phase_72),
`lms_day_outcome`/`coach_trial_day_outcome.outcome` missing `not_tried` (phase_71), and the 4
phase_68/69/70 tables missing. After phase_68–72 it must be clean. Do NOT deploy the code until it is.

## 3. parent_memory backfill (before parents hit the new Coach) — counts only, no PII
1. **Dry-run first (writes nothing):** `TARGET=prod node scripts/backfill_parent_memory.mts --dry-run`
   prints the parent **counts** (trial / paid) and the **estimated model cost in ₹** (parents ×
   Haiku memory-extract tokens), and exits without writing. Review it with me.
2. **Real run only after my OK:** `TARGET=prod node scripts/backfill_parent_memory.mts` — summarises each
   current prod trial + paid parent's own past messages into `parent_memory` so no one is greeted as a
   stranger. Prints **counts only** (e.g. "trials=N paid=M summarised=K") — never names, phones, or text.

## 4. Deploy the code — git and prod must match
- `git checkout main && git merge --no-ff coach-quality` (coach-quality is ahead of main; no conflicts
  expected). Show me the merge commit; do nothing further until I approve it.
- After I approve: **`git push origin main` FIRST** (so GitHub and prod match — never deploy code that
  isn't on main). Then confirm **`git status` is clean** (nothing uncommitted) before any prod deploy.
- **Auto-deploy check:** this project is Git-connected (note the `…-git-main-…` alias). Verify in
  Vercel → Settings → Git whether **Production Branch = `main` with auto-deploy ON**.
  - If YES: the `git push origin main` IS the production deploy — **do NOT also run `vercel --prod`**;
    just watch that auto-deployment go READY (and that it built the approved commit SHA).
  - If NO: run `vercel deploy --prod` on attention-architect-v2 (NOT `the-human-decision`), wait for READY.

## 5. Smoke tests (prod) — NEVER act as a real parent
Use dedicated TEST accounts, not any real family's data, and never impersonate a real parent.

**Setup (before deploy):** create ONE test paid account and ONE test trial account on prod, both
clearly named as tests (e.g. child "ZZ Test", a test email) and flagged **is_internal / excluded from
metrics** (the same internal flag the admin funnel already honours). Record their ids. Smoke 1–2 use
ONLY these two accounts.

**Division of labour:**
- **YOU (browser, authenticated — you hold `ADMIN_PASSWORD`; I never use it):**
  1. Test TRIAL account → open `/coach`: the Coach speaks first (cached opener renders — not "Couldn't
     load"); send a message → a streamed reply appears.
  2. Test PAID account → open the `/lms` coach: send "how did it go?" → a reply appears.
  3. `/admin/coach-review` loads (200) and lists open call requests.
- **ME (no `ADMIN_PASSWORD`; DB SELECTs + Vercel logs only), after you exercise the test accounts:**
  4. DB: `select pg_get_constraintdef(oid) from pg_constraint where conname='coach_messages_origin_check'`
     includes `'opener'` (phase_72); and `coach_messages` / `lms_day_outcome` / `coach_trial_day_outcome`
     have new rows for the TEST account ids (incl. an `origin='opener'` row) — proof the writes landed.
  5. DB: `select outcome,count(*) from lms_day_outcome group by 1` — `not_tried` only appears going forward.
  6. Vercel runtime logs for the window: **no 5xx and no `coach_messages_origin_check` / NeonDbError**
     on `/api/coach/message`, `/api/lms/coach`, `/api/admin/coach-preview/*`.
  7. A report URL still renders (unrelated-regression check).

## 6. Watch for 30 minutes
- `vercel logs` (or the dashboard) for the project: look for `[coach/engine] turn failed`,
  `final-check` warnings, 5xx on `/api/coach/message`, `/api/lms/coach`, `/api/admin/coach-preview/*`.
- Spot-check `coach_call_request` for any `urgent` rows raised in the window.

## 7. Rollback per stage
- **Code bad, data fine:** `vercel rollback` (or `request_rollback`) to the previous production
  deployment. The additive migrations are backward-compatible, so the old code runs fine with them —
  no DB rollback needed.
- **A migration is the problem:** run its down-migration in reverse order (phase_72 → 71 → 70 → 69 → 68)
  with `psql "$DATABASE_URL_PROD" -f migrations/down/phase_XX_down.sql`. phase_72 down restores the
  origin CHECK (opener→llm). phase_68/69/70 downs are
  DESTRUCTIVE (drop tables) — only if abandoning the feature; export `gold_examples` approved rows and
  any open `coach_call_request` first. **phase_71 down converts `not_tried`→`missed`, which REWRITES
  history as failures (a not-attempted step becomes a tried-and-failed one) — only run it if abandoning
  the feature, not as a routine rollback.** It also drops `trigger`.
- **Backfill wrong:** `parent_memory` is derived; `DELETE FROM parent_memory` (prod) and re-run, or
  drop via phase_68 down. No parent-facing impact (Coach just greets fresh).

## 8. Stays OFF in prod (until separately approved)
- **Cross-parent "what works" stats** — `COACH_CROSS_PARENT_STATS` unset; keep off until the
  privacy-notice line (in `docs/evidence/coach-conversational-README.md`) is live on the site.
- **Opus reply model** — `COACH_MODEL_OPUS` unset; Sonnet 4.6 for all parents.
- The legacy scripted modules (`lib/lms/coach/guards.ts`, `behaviour.ts`, onboarding chips) ship but
  are OUT of the live path (kept only for the legacy test suite); delete in a later cleanup PR.

## 9. Gold examples from real chats — PII already stripped
The "Write a better reply" flow (`/admin/coach-review`) now scrubs before a row becomes a gold example
(`scrubForGold` in `lib/admin/coach-review.ts`, enforced inside `draftBetterReply` so it can't be
bypassed): the child's and parent's first names → "the child" / "you", and any email / phone-like
number → `[email]` / `[number]`. Covered by `__tests__/coach-gold-scrub.test.ts`. An advisor still
reviews each pending example before Approve (nothing enters retrieval un-approved), and gold examples
are labelled "other families — never reuse their facts".

## 10. Follow-ups (NOT this release)
- A "typing…" indicator in the chat UI during the ~4.5s before the first streamed word (time-to-first-
  text is model latency, same for English and Hindi now; a typing dot would cover the wait). UI-only.
