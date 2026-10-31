# Preview, perf, and the deploy plan (prepared — not run)

Branch `report-roadmap-v3` pushed to origin (branch only, NOT main). Vercel Preview built clean.

## Preview
- **Deployment:** `dpl_3Wfu7947qcHYoEoaroyGmo1BdmKG`, commit `b869036`, READY.
- **DB confirmation (safety gate):** the Preview uses the **DEV** database (`ep-wild-paper-aqlx0vrm`),
  **not prod**. Proof: I seeded a Storm×screens×boy test parent on dev only (host-verified before the
  write), and the Preview rendered its v3 report — a session that exists only on dev. Nothing touched prod.
- **Storm × screens × boy test report (open on your phone — shareable bypass link, expires 2026-11-01 09:30):**
  `https://attention-architect-v2-git-4b7103-the-human-decision-s-projects.vercel.app/report/3326af97-c63f-48fb-b179-e888143974e7?_vercel_share=lnTnCF79VgYlf2jGiYPVkuSFYnI3pfsQ`

## Lighthouse mobile (performance category)
Measured with `npx lighthouse … --form-factor=mobile`. v3 is a **cold Preview** behind a share-redirect;
prod is **warm + CDN-cached** — so these v3 numbers are a conservative (worst-case) read.

| | Performance | LCP | CLS | TBT | FCP | First-load JS |
|---|---|---|---|---|---|---|
| **v3 (Preview /report)** | **96** | 1.17 s | 0.000 | 35 ms | 1.17 s | ~266 KB (14 reqs) |
| **prod current /report (old UI)** | **100** | 0.84 s | 0.000 | 6 ms | 0.84 s | ~224 KB (12 reqs) |

## Bundle — first-load JS, v3 vs legacy
Vercel's build output (Turbopack) does **not** emit the per-route First-Load-JS table, so the number above
is the **actual JS transferred** (Lighthouse network). **v3 ≈ 266 KB vs old ≈ 224 KB (+42 KB, ~19%).**
That delta is expected: `/report/[sessionId]` currently bundles BOTH the v3 deck **and** the legacy
ReportV2/narrative UI (kept behind the operator-only `?report=legacy` flag). When the legacy UI is removed
(2 weeks post-deploy), the route's JS drops back down.

## Deploy plan (DO NOT RUN YET — your review + your Neon backup first)
Migrations as one file: **`migrations/report-roadmap-v3-PROD.sql`** (phase_80 + 81 + 82, additive /
idempotent). Verified against prod: `lms_reflections_day_check` has the same name (phase_81's
`DROP … IF EXISTS` targets the right constraint); `plan_adjustments` + `report_tonight_tap` don't exist
on prod yet.

**Order (matches the credential/runbook discipline):**
1. **You take the Neon backup** of prod `ep-green-truth-aqxygaj2` (branch/snapshot). Confirm the backup id.
2. **Run `migrations/report-roadmap-v3-PROD.sql` on prod** (ep-green-truth), verify by endpoint id, then
   `SELECT phase FROM schema_migrations WHERE phase IN ('phase_80_adaptive_plan','phase_81_day1_observation','phase_82_report_v3_tonight');` → expect all three.
3. **Merge `report-roadmap-v3` → main**, then **push main** (auto-deploys prod on project
   `attention-architect-v2` / `prj_qT1IJK7HoIAkdqwbQENgbAoPy1oo` — not the-human-decision).
4. **Verify via the alias API** that the prod alias points to the new deployment (READY).
5. **Smoke (read-only / minimal):**
   - Open a real report link in WhatsApp format (`/report/<sid>`) → v3 renders for a parent.
   - `?report=legacy` without the `aa_internal` cookie → still v3 (parent can't reach old);
     with `aa_internal=1` (operator) → old UI.
   - Tap Card 5 (Worked/Partly/Didn't work) → a `report_tonight_tap` row is written.
   - One LMS day adjusts: a paid parent on Day ≥3 (or Day 2 after a Day-1 observation) sees an
     "Adjusted for you:" step; a Coach `adjust_next_step` shows "Updated by your Coach:".

**Rollback (if v3 misbehaves):**
- The legacy flag means the OLD UI is already in the build (operator-only). So the rollback is a **code
  revert**, not a data change:
  - Fastest: **Vercel → Instant Rollback** to the previous prod deployment (pre-merge). No DB change.
  - Or revert the merge commit on main and push (re-deploys the prior report path).
- **The migrations can stay** — they're additive (two new tables + a relaxed CHECK). Nothing reads
  `plan_adjustments` / `report_tonight_tap` once the v3 code is rolled back, and `lms_reflections`
  day 1–5 is a superset of 2–5 (no existing row violates it). Down files exist
  (`migrations/down/phase_80_down.sql`, `_81_down.sql`, `_82_down.sql`) if you ever want them gone.

## Not run (as instructed)
No merge, no main push, no prod migration. Awaiting your review + backup.
