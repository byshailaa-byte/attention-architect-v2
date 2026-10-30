# Part A — evidence index (dev only, no push, nothing to prod)

Branch `report-roadmap-v3`. Commits: `0b75da8` copy bank · `e565cf6` Part A engine · `546de9f` LMS
name rewrite · `dc74856` screenshots + moment fix.

## 1. The 12 real adaptations (the review gate)
`docs/report-roadmap-v3/part-a-12-adaptations.md` — 12 adaptations on dev, real `claude-sonnet-4-6`,
a mix of 8 patterns / worked·partly·didnt_land (incl. two-in-a-row) / all 3 age bands / weeks 1–3.
Each: base step → adjusted step, pass/fail, retry used?, ₹.
**Result: 12/12 produced a validated LLM step, 0 fell back, 2 used a retry, total ₹8.31.**

## 2. Screenshots (390px)
`docs/report-roadmap-v3/shots/` — `1-worked.png`, `2-partly.png`, `3-didnt_land.png`,
`4-two_didnt_land.png` (shows the "talk it through with your Coach" banner), `5-coach_override.png`
("Updated by your Coach: …"). Real renders of `/lms-v2/week/1/day/N` for dev-seeded paid parents
(progress + reflections backdated so the day is unlocked), then the seed data was deleted.

## 3. LMS name-rewrite
`docs/report-roadmap-v3/lms-name-rewrite.md` — approach, 19 files / 89 names rewritten, per-file
counts, 10 before→after samples, known minor stylistic artifact. Guard test
`__tests__/lms-no-pattern-names.test.ts` (50 assertions) fails on any parent-facing archetype name.

## 4. Which Coach is live + proof
The LMS Coach route `app/api/lms/coach/route.ts` (paid) and `app/api/coach/message/route.ts` (trial)
both go through the **v2 tool-calling runtime** (`lib/coach/runtime.ts` → `lib/coach/engine.ts` tool
loop → `lib/coach/tools.ts` `COACH_TOOLS`). `lib/lms/coach/llm.ts` is only the shared Anthropic
client the runtime calls — not a separate text-only Coach.
**Prod SELECT-only proof** (endpoint `ep-green-truth-aqxygaj2-pooler…`): of 176 coach_messages,
model-written replies carry `origin='llm'` + `model=claude-sonnet-4-6` (26) + `origin='opener'` (2) —
written by the v2 runtime's `persistTurn`. No rows from a tools-less path.
→ `adjust_next_step` was added to the LIVE `COACH_TOOLS` (paid only; trial excluded in `context.ts`).
No second Coach built.

## 5. Tests + migration
- **Tests:** `__tests__/plan-adjust.test.ts` (25) + `__tests__/lms-no-pattern-names.test.ts` (50) +
  `__tests__/report-v3-copy.test.ts` (170) + `__tests__/desk-bucket-preview.test.ts` (4) = **249 pass.**
  `tsc --noEmit` clean.
- **Migration (dev only):** `migrations/phase_80_adaptive_plan.sql` — one additive table
  `plan_adjustments`. Applied to dev `ep-wild-paper-aqlx0vrm`, verified in `schema_migrations`.
  **Not applied to prod.** Down: `migrations/down/phase_80_down.sql`.

## 6. What's NOT done / flags — see the turn summary message.
