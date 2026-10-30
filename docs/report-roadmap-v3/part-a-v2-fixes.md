# Part A — review-round fixes (dev only, same branch)

All changes on `report-roadmap-v3`, dev DB only, nothing pushed/prod. `tsc` clean. **269 tests pass.**

## A — exact-words validator + quote normalize
`lib/plan-adjust/validate.ts`: exact-words are now held to "spoken TO the child" rules — reject any
line that mentions the Coach / `yourself` / `you might` / `watch him·her·them` / observations, contains
parentheses or stage directions, or refers to the child in the third person (pronoun or name). Nudges
and observations belong in the opening / notice. `normalizeExactWords()` strips surrounding quotes so
the UI never double-wraps (#11). Tests use the review's #5 (Coach nudge + third person + naming the
child), #6 (parenthetical stage direction), a day-3 "watch whether…" line, and #11 (double quotes).

## B — opening paragraph generated WITH the step
`lib/plan-adjust/{types,generate,fallback}.ts` + the day page: the generator now emits a one-sentence
`opening` in the SAME call as the step, so they can't contradict. The LMS day screen renders that
opening in the top box and **hides the old `nextDayOpening` fork** whenever an adjusted step exists.
Screenshots 1/2/3 show worked / partly / didnt_work with agreeing openings.

## C — consistency
- Header "ABOUT N MIN" now comes from `step.minutes` (shots show 5 / 5 / 2 / 2 / 3 / 2).
- Validator rejects a notice that asks for more minutes than the step (#1).
- Button labels are **Worked / Partly / Didn't work** everywhere (`app/lms-v2/v2ui.ts` + after-done
  buttons); stored enum values (`worked` / `mixed` / `didnt_land`; `sort_of` / `didnt_work`) unchanged.
- Two didnt_land in a row: the Coach banner shows **once**; the pill no longer mentions the Coach, and
  the generated opening is told not to either (shot #4). The step must be measurably smaller — validator
  enforces ≤2 spoken lines and ≤3 minutes after a didnt_land.
- #10 limit topics (screens/time/money): validator rejects an unconditional "ok, let's go with that" /
  "whatever you want"; honest negotiation lines pass.

## D — earlier fixes
1. **adjust_next_step for REAL trials (not preview):** exposed to paid + non-preview trials
   (`lib/coach/context.ts`); refused for preview sandbox trials. Trial overrides are keyed `week=0`,
   built from `resolveTrialDays`, and `buildTrialSubject` reads them so the Coach's next quick-start day
   reflects the change. Live-path trace unchanged (v2 runtime). **Proof (dev):**
   ```json
   toolResult: { "ok": true, "detail": "next step (quick-start day 2) updated for the parent" }
   overrideRow: { "week": 0, "day": 2, "origin": "coach",
     "reason": "a rough first day — gentler start tomorrow",
     "step": { "opening": "Yesterday was hard — here's a gentler version for tomorrow.",
       "title": "One tiny choice at the start", "moment": "when homework starts",
       "exactWords": ["You pick the very first thing — your call."],
       "notice": "Whether the start feels a little calmer.", "minutes": 2 } }
   ```
2. **Day-1 observation tap:** Day 1 now asks "What did you notice?" → **Calm / Some pushback / Big
   fight**, stored under the outcome enum (worked / mixed / didnt_land) so Day 2 adapts: Calm→step
   further, Some pushback→tweak, Big fight→smaller. `migrations/phase_81_day1_observation.sql` relaxes
   the `lms_reflections` day check to 1–5 (**dev only**); `V2DayActions` + the reflect route + the day
   page updated. Tests cover all three mappings. Shot #6 shows Day 2 after a "Big fight".
3. **Captain sentence** hand-fixed (`content/lms/week-1/captain.ts`): removed the triple "a child like
   {NAME}" repetition.
4. **`withRetry` on `getLmsUserContext`** (`lib/lms/user-context.ts`) — both paid loaders now retry the
   Neon read, so a local DNS blip no longer 500s the LMS page.

## E — re-run evidence
- **15 adaptations** (12 original + 3 Day-2-from-Day-1-observation): `part-a-12-adaptations.md`.
  12/15 LLM steps, 3 deterministic fallbacks (now clean — the apostrophe bug in quote extraction is
  fixed), 10 retries (the stricter exact-words rules reject more first attempts; the retry usually
  passes). The fallbacks are valid, on-skill, never garbage.
- **Trial override** — above.
- **6 screenshots (390px)** in `shots/`: `1-worked`, `2-partly`, `3-didnt_work`, `4-two_didnt_work`
  (banner once, no Coach in opening/pill), `5-coach_override` (with opening), `6-day2_after_observation`.

## Not done / flags
- Retry rate rose to ~10/15 because the exact-words rules are strict (as requested); 3 fell back. All
  fallbacks are clean and valid — but they're generic. If you'd rather fewer fallbacks, I can soften the
  prompt (not the validator) so the model lands clean more often.
- phase_80 + phase_81 are **dev only**. Nothing pushed; nothing to prod. Part B after your approval.
