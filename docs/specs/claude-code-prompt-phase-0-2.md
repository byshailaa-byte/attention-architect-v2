# Claude Code Prompt — Phase 0–2 ONLY (De-risk Build)

> **Read `claude-code-build-prompt-v2.md` for full context.** This prompt executes **only Phases 0, 1, and 2** of that plan, then **stops**.
>
> The purpose is to de-risk ~200 passages of content authoring before it happens. Phase 2 ends in a verification check whose outcome determines whether the scoring spec is correct. Nothing downstream should be built until that check passes.

---

## SCOPE — build these, and nothing else

✅ Phase 0 — Scaffold, schema, security
✅ Phase 1 — Adaptive assessment engine
✅ Phase 2 — Scoring engine + Storm verification

❌ **Do NOT build:** the report renderer, the content layer, checkout, Razorpay, the LMS, the landing pages, the admin dashboard, email, OTP, or any UI beyond what's needed to exercise the assessment.

If you finish Phase 2 and feel the urge to keep going — **stop and report the verification result instead.**

---

## HARD CONSTRAINTS

1. **Port 3007.** v1 runs on 3005. Never touch it, never import from it, never share its database.
2. **Nothing deploys.** No `vercel.json`, no deploy scripts, no production env files, no CI. If you're writing a deploy step, you've gone wrong.
3. **No Razorpay in this phase at all.** Not even the SDK. It arrives in Phase 5.
4. **Local Postgres only** (Docker or local install), or a Neon *dev branch*. Fail at boot if `DATABASE_URL` matches the production host.
5. **`/admin` behind auth from the first commit** — Next.js middleware, HTTP Basic Auth, **fails closed** if `ADMIN_PASSWORD` is unset. Deny, never default-open. This was a live security hole in v1. Do not recreate it. *(The dashboard itself is Phase 7 — just the auth gate and a stub page now.)*
6. **Never invent content.** No question wording you weren't given. No archetype descriptions. If something isn't in a source doc, stop and ask.

---

## SOURCE OF TRUTH

**All specs live in `docs/specs/` in this project root.** Read them from there. If any is missing, stop and say which — do not search the wider filesystem, and do not proceed without it.

| Document | Use it for |
|---|---|
| `attention-architect-v2-assessment-final.md` | The 6 dimensions, 3 gateway questions, **the complete question bank (verbatim)**, the routing decision tree (§5, Rules 1–4), archetype derivation grid + fallback mapping (§6), parent-pattern mapping (§7) |
| `scoring-formula-4axis-spec.md` | Consistency, polarity tables, axis values, band cutoffs, weakest-two selection (§2–§4), the data-richness hook (§5) |
| `4-axis-consumer-framework.md` | Which dimensions feed which axis, and why |
| `honest-path-trigger-spec.md` | **Safety-critical.** Trigger logic §3, including Trigger A's `data_points >= 2` edge case |

**Where this prompt and a spec disagree, the spec wins.** Report the conflict; don't silently pick.

---

## PHASE 0 — Scaffold, schema, security

Next.js (App Router) + TypeScript + Tailwind, on **port 3007**.

**Design tokens** (contrast-corrected — use exactly these):
```
--paper: #F6F4EC   --card: #FFFFFF    --ink: #23242c
--ink-dim: #5C5950        (6.36:1)
--marker: #F6C63D         --marker-ink: #3a2c00   --marker-tint: #FDF4DC
--marker-text: #6B4F0A    (6.97:1)
--calm: #6E5FB0           --calm-tint: #EEEAF9
--calm-text: #4F3F92      (7.23:1)
--redpen: #DD4B37         --line: rgba(35,36,44,.10)
```

**Boot guards** — throw and exit, don't warn:
- `DATABASE_URL` matching the production host
- any env var starting `rzp_live_`
- `ADMIN_PASSWORD` unset while `/admin` is routable

**Schema** (this phase only — the rest arrives with its phase):
```sql
assessments (
  id, session_id, created_at,
  child_name, age_band,           -- '8-9' | '10-11' | '12-14'
  concerns text[],                 -- ordered, max 2
  answers jsonb,                   -- {question_id: value}
  dimensions jsonb,                -- {dim: {value, consistency, data_points}}
  archetype, parent_pattern,
  axes jsonb,                      -- {stability:{value,band}, resistance:{...}, recovery:{...}}
  weakest_two text[],
  honest_flag boolean,             -- SENSITIVE. See honest-path spec §7 Gate 3.
  honest_trigger text              -- SENSITIVE. Never in admin views, analytics, or pixels.
)

assessment_sessions (              -- per-dimension checkpoints, abandoned detection
  id, session_id, dimension, answered_at, device jsonb, utm jsonb
)
```

Put the Gate-3 warning as a literal SQL comment on both sensitive columns.

---

## PHASE 1 — Adaptive assessment engine

**Question bank: verbatim from the spec.** Do not reword, do not "improve," do not add a neutral option. Four options per question, always.

**Routing** — implement the decision tree from spec §5 **exactly as written**. It is deterministic, not heuristic:

- **Rule 1** (always fires): `reward_driver` gets full depth, every time.
- **Rule 2**: if `G2 == novelty AND G1 != wide-shifting` → `attention_shape` gets depth.
- **Rule 3**: if Rule 2 didn't fire → `friction_response` gets depth slot 2.
- **Rule 4** (at most one, checked in order): `G2 == internal` → friction/recharge; else `G2 == social` → attention_competition; else `G3 ∈ {quick-fixer, pusher}` → parent_instinct; else no third slot.

Unselected **anchored** dimensions (attention_shape, attention_competition, parent_instinct) stand on their Gateway answer alone. Unselected **unanchored** dimensions get their single confirming question.

Result: 3 gateway + depth questions = **9–12 total**.

**UX** (a minimal harness is fine — this is an engine test, not the real UI):
- Milestone progress only: *"Warming up"* → *"Getting specific"* → *"Almost there"*. **Never a percentage.** No fake progress.
- Checkpoint to `assessment_sessions` **per dimension**, not per question.

**Tests — required:**
- Enumerate all **64** gateway combinations (4 × 4 × 4). Assert each resolves to a depth set of size 2 or 3, containing `reward_driver`, with no duplicates.
- Assert total question count lands in [9, 12] for every combination.

---

## PHASE 2 — Scoring engine + BLOCKING VERIFICATION

Implement `scoring-formula-4axis-spec.md`:

1. **Per-dimension tally** → winning value; `consistency = winning_votes / data_points`; tiebreak to the first question asked for that dimension.
2. **Archetype** = `attention_shape × reward_driver` via the §6 grid, with the nearest-neighbor fallback table for the 8 unused cells.
3. **Parent pattern** = direct 1:1 from `parent_instinct`.
4. **Axis values** = `polarity × (0.5 + 0.5 × consistency)`, per the §3 polarity tables.
   - **Direction produces no numeric value.** It is the archetype. Do not compute a bar for it.
   - Stability, Resistance, Recovery each produce a value and a band word.
5. **Band cutoffs:** ≥0.65 Strong · 0.40–0.64 Mixed · <0.40 Low.
6. **`weakest_two`** = the two lowest of {Stability, Resistance, Recovery}, ascending. Tie → break toward the axis matching the parent's stated objective.
7. **`data_richness`** = collected data points / max possible. Log it. Never display it.

**Honest-path triggers** — implement all three from the spec §3, *including Trigger A's `data_points >= 2` requirement* (without it, a single confirming-question answer fires the flag). **Compute and store. Display nothing.** Gate behind `HONEST_PATH_DISPLAY_ENABLED=false`.

---

### 🔴 THE BLOCKING CHECK — run this, then stop

Write a test that constructs a **plausible Storm answer-set**:

```
G1 = sensation-seeking
G2 = (your choice — try each, report all)
G3 = pusher
reward_driver depth answers → autonomy
plus coherent depth answers for whatever else routing selects
```

**Assert:**
1. `archetype == "The Storm"`
2. `parent_pattern == "The Pusher"`
3. `weakest_two == ["Stability", "Resistance"]` (in either order)

**Every downstream artifact depends on assertion 3.** The Storm+Pusher report, LMS Week 1 (homework-start) and Week 2 (screens), and the curriculum page's "Start here" badges all assume Stability and Resistance are Storm's two weakest axes. Roughly 200 passages of content are about to be authored against it.

**If assertion 3 fails: DO NOT hardcode, DO NOT adjust the test, DO NOT proceed to Phase 3.**

Stop and report:
- the computed value and band for each of Stability, Resistance, Recovery
- the winning value, consistency, and `data_points` for every dimension
- which polarity table entries drove the result
- whether the outcome is stable across all four `G2` choices

The scoring spec's polarity tables are explicitly flagged `[CALIBRATE]` — reasoned starting values, not empirical ones. A failure here means they need adjusting, which is a design conversation, not a code fix.

---

## STOP CONDITION

After the verification check, **stop**. Report:

- [ ] `curl localhost:3007/admin` with no credentials → 401
- [ ] `ADMIN_PASSWORD` unset → still 401 (fails closed)
- [ ] Boot with `rzp_live_*` in env → process exits
- [ ] Boot with production `DATABASE_URL` → process exits
- [ ] All 64 gateway combinations → valid depth set, 9–12 questions
- [ ] **Storm check: PASS / FAIL** + the full diagnostic dump above
- [ ] `grep -r "vercel\|deploy\|rzp_live" .` → nothing

Do not begin Phase 3.

---

## WHEN YOU HIT AMBIGUITY

1. **Spec beats prompt.** Report the conflict.
2. **Missing content → stop and ask.** Never write filler.
3. **Undecided → stop and ask.** Do not pick a default silently.

This project has twice shipped bugs where a value was referenced downstream but never captured upstream — the child's name, and the concern chips. Both came from filling a gap quietly instead of surfacing it.
