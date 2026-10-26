# Report fallback fix — deploy plan (WRITE ONLY — do not run until you say)

> **STANDING RULE (2026-10-27).** Auto-deploy from `main` is **ON**: **pushing to `main` IS a production
> deploy** (auto-build + auto-promote to the custom domain). **NEVER push or merge to `main` without the
> user's explicit "go".** Local commits and branch work are always fine. Before stating any platform
> state (auto-promotion, which deployment is live, alias target), VERIFY via the API first — never assume.

> **DEPLOYED 2026-10-27** — `main @ de72ce8` auto-promoted to prod (`dpl_8W6QAkGg2kBWyhurzk6h5ZKxVoc9`);
> alias confirmed via API. This plan is now a record, not a pending action.

Branch `fix/report-fallback` → `main`, prod project **attention-architect-v2** (`prj_qT1IJK7HoIAkdqwbQENgbAoPy1oo`),
prod DB endpoint **ep-green-truth-aqxygaj2**. Auto-deploy from `main` is **ON** (a push to `main` builds AND
promotes to the custom domain automatically — confirmed 2026-10-27; the earlier "paused" note was wrong).

## 0. Pre-flight
- Current prod = `badf9a0` (coach-v2), serving `attentionparents.thehumandecision.in`. `fix/report-fallback` head = latest commit on the branch.
- Confirm the branch builds: `npm run build` (or rely on the preview that already built: `dpl_FwSnHemKmdnXzrxsTanqC8dpT7CV`).
- Vitest green (judge parse + stream + coach suites); `npx tsc --noEmit` = 0.

## 1. Neon backup branch FIRST (YOU create it)
- In Neon, create a branch of prod (`ep-green-truth-aqxygaj2`), named `pre-report-fallback-<YYYY-MM-DD>`. Record its branch id here.
- Rollback can restore/compare against it. No row data leaves Neon.

## 2. phase_74 on prod (additive — safe before the code deploy)
- `TARGET=prod node scripts/apply_phase_74.mjs` — adds nullable `draft` + `judge_detail` jsonb to `report_generation_log`,
  stamps `schema_migrations`. The applier verifies the host is ep-green-truth and aborts otherwise.
- ADDITIVE/backward-compatible: the currently-deployed code ignores the new columns, so this can go BEFORE the code deploy.
- Down (only if abandoning): `psql "$DATABASE_URL_PROD" -f migrations/down/phase_74_down.sql` (drops the two columns).

## 3. Merge + push
- `git checkout main && git merge --no-ff fix/report-fallback` — show the merge commit; confirm `git status` clean.
- `git push origin main` (never deploy code that isn't on main).

## 4. Promote at night (auto-promotion is paused)
- The push triggers a production BUILD but NOT auto-promotion. Wait for that build (commit = the merge SHA) to reach **READY**.
- `vercel promote <deploymentId> --scope the-human-decision-s-projects` for that exact deployment. Do NOT run `vercel --prod` from the working dir.

## 5. Alias check (authoritative, via the alias API)
- `attentionparents.thehumandecision.in` → the NEW deployment id, and its `githubCommitSha` = the merge commit.
- Live-code sanity: a report URL renders; `/admin` 401 (gate up).

## 6. Watch the first 10 real reports (admin tile)
- Admin → Overview → Report Generation health (`ReportGenHealth`): watch the LLM-vs-fallback split for the next ~10 real generations.
- Target: fallback < 15%. Expect `giveup`/`finish` much improved (parse-bug fix); **Inventor×giveup/finish still weak** — flag if they dominate.
- Stored rejected drafts: on any fallback, `report_generation_log.draft` + `judge_detail` now hold the rejected draft + per-question verdicts
  (admin/DB only; 30-day retention auto-nulls older rows). Query by DB for diagnosis; never surfaced to parents.

## 7. Rollback
- **Code bad:** `vercel rollback` (or promote) to the previous production deployment (`badf9a0` / `dpl_EVsftRXtF67hZ7Tk4msYXpGvBS62`).
  phase_74 is additive → old code runs fine with the extra columns; no DB rollback needed.
- **Abandon feature:** run `migrations/down/phase_74_down.sql`.

## Known limitation (decide before/after deploy)
- Fresh-sample fallback is ~17–27% (noisy at n=30), **not yet reliably < 15%**. The parse-bug fix resolves the giveup/finish cluster
  broadly, but **Inventor × giveup/finish** still fall back genuinely. Options: ship now (big improvement, no leniency, instrumentation
  will show live rate) and iterate on Inventor next; or hold for an Inventor-specific writer pass first.
