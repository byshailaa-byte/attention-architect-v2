# Claude Code Build Prompt — Attention Architect v2, Complete Local System

---

## 0. HARD CONSTRAINTS — violate none of these

1. **Port 3007.** v1 runs on 3005. Never touch it, never import from it, never share a database with it.
2. **Nothing deploys.** Do not create `vercel.json`, deploy scripts, production env files, or CI config. If you find yourself writing a deploy step, stop.
3. **Razorpay TEST MODE only.** Read keys from env. **Fail loudly at boot** if a key beginning `rzp_live_` is detected — throw, do not warn.
4. **Local Postgres only** (Docker or local install), or a Neon *dev branch*. Never the production connection string. Fail at boot if `DATABASE_URL` matches the production host.
5. **`/admin` is behind auth from the very first commit.** Next.js middleware + HTTP Basic Auth. **Fails closed** if `ADMIN_PASSWORD` is unset — deny access, don't default to open. This was a live security hole in v1; do not recreate it.
6. **Email and SMS stub to console** in local. No real sends.
7. **Never invent content.** See §5. This is the rule most likely to be broken and most damaging when broken.

---

## 1. What you are building

A fresh Next.js (App Router) + TypeScript application implementing the complete Attention Architect v2 funnel:

**Landing → Pre-assessment → Adaptive assessment → Post-assessment → Free report → Checkout (two-tier) → LMS**

This is **not** an extension of the v1 app. v1's schema assumes 18 fixed questions and 5 archetypes. v2 has 6 dimensions, adaptive routing, 8 archetypes, 4 parent patterns, and 4 derived axes. Building on v1's schema would bake obsolete assumptions into the exact tables the validation research depends on.

**Do port these proven patterns from v1** (adapt, don't copy blindly):
- Razorpay webhook handler with HMAC-SHA256 signature verification
- The `/admin` dashboard structure (funnel view, drop-off, UTM/device breakdowns, answer transcripts, abandoned-session detection, repeat-attempt lineage keyed on phone)
- DB connection/migration layer
- GA4 event wiring

---

## 2. Source-of-truth documents

Read these before writing code. Where this prompt and a spec disagree, **the spec wins** — flag the conflict rather than guessing.

| Document | Defines |
|---|---|
| `attention-architect-v2-assessment-final.md` | 6 dimensions, 3 gateway questions, full question bank, **routing decision tree**, archetype derivation grid + fallback mapping, parent-pattern mapping |
| `scoring-formula-4axis-spec.md` | Dimension→axis derivation, polarity tables, band cutoffs, **weakest-two selection**, display rules |
| `4-axis-consumer-framework.md` | Which dimensions feed which axis, and why |
| `report-content-master.md` | The report's **slot schema** — every `{{variable}}`, its source, its fill logic |
| `report-fit-reveals-all-32.md` | All 32 authored fit-reveal passages (the flagship content) |
| `objective-personalization-layer-spec.md` | Concern/tried/better capture, phrase tables, join-up-to-2 rule |
| `honest-path-trigger-spec.md` | **Safety-critical.** Trigger logic, copy variants, and the three pre-launch gates |
| `lms-week1-storm-pusher.md` | LMS source master with `{{#if age_band}}` conditional blocks |
| `lms-week1-storm-pusher-RENDERED-12-14.md` | What a real parent sees — single age band, no tags |
| HTML mockups (`landing-variant-*`, `pre-assessment-name-screen`, `post-assessment-consolidated-screen`, `arjun-attention-blueprint-report`, `arjun-full-curriculum-secondary-page`) | Visual design, copy, interaction, analytics event names |

---

## 3. Decisions already made — do not relitigate

- **Module 1 = a fixed early-win week**, personalized in content per archetype, fixed in position for everyone. Weeks 2–6 are ordered by weakest-link (the two lowest axes from scoring). `Module 1` must therefore be a stable, sellable unit across all buyers.
- **Pricing:** ₹499 = Module 1. ₹999 = full 6-module roadmap (shown at front end as the anchor). **Hidden +₹500 top-up** offered *only* to ₹499 buyers, *only* after Week 1 completion — never shown at the front end.
- **Auth:** phone OTP primary (phone is already the identity key — Razorpay and admin lineage both use it). Email magic link as recovery. Abstract the provider; stub to console locally.
- **Section 5 display:** relative bars, **no printed percentages ever**. Band word first (Strong/Mixed/Low), bar as support. **Direction renders no bar at all** — it displays the archetype name.
- **Free report stays free.** Email + parent name required to view; nothing else. Phone and city are collected at checkout only.
- **Honest path:** implement fully, log fully, **display disabled** behind `HONEST_PATH_DISPLAY_ENABLED=false` until the spec's Gates 1 and 2 clear.
- **Landing:** Variant A is canonical at `/`. Serve B/C/D at `/v/b`, `/v/c`, `/v/d` for later testing. Every analytics event carries `variant`.

---

## 4. Data model

```
assessments
  id, session_id, created_at
  child_name, age_band ('8-9'|'10-11'|'12-14')
  concerns text[]            -- ordered; landing chips, max 2
  gender, tried text[], better text[]   -- post-assessment, optional
  parent_name, email         -- post-assessment, required
  answers jsonb              -- {question_id: value}
  dimensions jsonb           -- {dimension: {value, consistency, data_points}}
  archetype, parent_pattern
  axes jsonb                 -- {stability: {value, band}, resistance: {...}, recovery: {...}}
  weakest_two text[]
  honest_flag boolean, honest_trigger text   -- SENSITIVE: see honest-path spec §7 Gate 3
  utm jsonb, device jsonb

assessment_sessions          -- per-dimension checkpoints, abandoned detection
users                        -- id, phone (unique), email, created_at
purchases                    -- id, user_id, assessment_id, tier ('module1'|'full'|'topup'),
                                amount_paise, razorpay_order_id, razorpay_payment_id, status
lms_progress                 -- user_id, week, day, completed_at
lms_reflections              -- user_id, week, day, outcome ('worked'|'mixed'|'didnt_land'), note, created_at
otp_codes                    -- phone, code_hash, expires_at, consumed_at
```

**Gate 3 enforcement (from honest-path spec):** `honest_flag` and `honest_trigger` must be excluded from every `/admin` general view, every analytics event, every pixel payload, and all marketing segmentation. Add a code comment at the column definition saying so.

---

## 5. The content layer — read this twice

Content lives in typed files, **not** hardcoded in components:

```
/content
  /archetypes/{storm,glue,captain,inventor,explorer,magnet,live-wire,all-in-kid}.ts
  /patterns/{pusher,quick-fixer,negotiator,steady-hand}.ts
  /fits/{archetype}--{pattern}.ts          -- 32 files
  /phrases/{objective,tried,better}.ts     -- from personalization spec
  /lms/week-{n}/{archetype}.ts             -- move + age calibrations
```

### The rule: **never invent content.**

Where authored content exists in the source docs, use it verbatim. Where it does not:

```ts
export const anecdote = TODO("archetypes/glue.anecdote");
```

`TODO()` is a real function. It returns a visually obvious placeholder string (`[[MISSING: archetypes/glue.anecdote]]`) and logs to a manifest. Do **not** write plausible-sounding filler. Do **not** paraphrase the Storm content for other archetypes. A visible gap is correct; invented parenting advice is not.

**Currently authored and available:**
- All 32 `fits/*.fitReveal` → from `report-fit-reveals-all-32.md`
- `archetypes/storm.*` and `patterns/pusher.*` → from `report-content-master.md`
- All objective/tried/better phrase tables
- `lms/week-1/storm.ts` (all 3 age bands) → from the LMS source master

**Everything else is `TODO()`.** Expect ~500 TODOs. That is the honest state of the content, and the build must make it visible rather than paper over it.

Add `npm run content:manifest` — prints every TODO grouped by file. This is the authoring backlog.

---

## 6. Build phases

Complete and verify each phase before starting the next. Commit at each boundary.

### Phase 0 — Scaffold, schema, security
Next.js + TS + Tailwind on **3007**. Postgres + migrations. `/admin` middleware auth **failing closed**. Boot-time guards: reject `rzp_live_*` keys, reject production `DATABASE_URL`. Copy the design tokens from the HTML mockups (`--paper`, `--marker`, `--calm`, contrast-fixed `--ink-dim: #5C5950`, `--marker-text: #6B4F0A`, `--calm-text: #4F3F92`).

### Phase 1 — Assessment engine
Implement the routing decision tree from the assessment spec §5 **exactly** — Rules 1–4, applied in order. It is deterministic, not heuristic. Every gateway combination resolves to a specific depth set.

- 3 gateway questions always. Then 2–3 dimensions at depth. 9–12 questions total.
- 4 options per question, no neutral option.
- Milestone progress ("Warming up" / "Getting specific" / "Almost there") — **never a fake percentage**.
- Checkpoint to `assessment_sessions` per dimension, not per question.
- Write unit tests covering all 4×4×4 = 64 gateway combinations. Assert each resolves to a valid depth set of size 2 or 3.

### Phase 2 — Scoring engine + **BLOCKING VERIFICATION**
Implement `scoring-formula-4axis-spec.md`: vote-tally per dimension → consistency → polarity → axis value → band → weakest-two.

**Then run this check before proceeding:**

> Construct a plausible Storm answer-set (G1=sensation-seeking, reward_driver=autonomy, plus coherent depth answers). Feed it through scoring. **Assert the archetype is The Storm AND `weakest_two` == [Stability, Resistance].**
>
> Every Storm+Pusher artifact — the report, the LMS Week 1 and 2, the curriculum "start here" badges — assumes this result. **If it does not hold, stop and report.** The polarity tables in the scoring spec need adjustment before anything else is built on them. Do not "fix" this by hardcoding the result.

Also implement the honest-path triggers (all three, per spec §3), including Trigger A's `data_points >= 2` edge case. Log; do not display.

### Phase 3 — Content layer
Build the typed content modules and the `TODO()` mechanism. Load the authored Storm/Pusher/fit content. Add `content:manifest`.

### Phase 4 — Report renderer
Render the 8 sections from `report-content-master.md`, filling slots from content + assessment data.

- Name appears at **exactly 4 placements** — S1 opening, S3 before quotes, S3 fit-reveal, S8 recap. Nowhere else.
- Objective templating in S1 and S8; `tried` in S4; `better` in S6.
- Section 5: bars sized by axis value, **no printed numbers**, Direction has no bar.
- Honest-path block before the final CTA, reading the display flag.
- Segmented reading-progress strip, sticky CTA, soft CTA after S4 — all suppressed per honest-path spec §6 when triggered.
- If any slot resolves to a `TODO()`, render the visible placeholder. Do not silently omit the section.

### Phase 5 — Checkout and pricing
Razorpay test mode. Two tiers at the front end (₹499 Module 1 / ₹999 full). Phone + city collected here, not earlier. Webhook at `/api/webhooks/razorpay` with HMAC-SHA256 verification, idempotent on `razorpay_payment_id`.

**Hidden top-up:** a ₹499 buyer who completes Week 1 sees a +₹500 upgrade offer inside the LMS. It must be unreachable — not merely hidden — for anyone who hasn't purchased `module1`. Enforce server-side.

### Phase 6 — LMS
Phone-OTP auth (provider abstracted, console-stubbed). Then:

- **Daily unlock, gated on marking the prior card complete**, with a "life happened — skip to today" escape hatch that does not strand the parent.
- **Structured reflection:** after each card, tap `worked` / `mixed` / `didn't land`, plus an optional free-text note. Store it. **The next card's framing forks on that tap** (3 branches — see the rendered Week 1 doc, Days 3 and 5, and the weekend review).
- Free-text notes are **stored and reflected back** at the weekend review. Never parsed, never used for branching.
- **Age band renders one calibration only.** The parent must never see all three bands. This is the rule the source master's build note exists to protect — a mistake here defeats the entire design.
- Week 1 is fixed for everyone; Weeks 2–6 order by `weakest_two`.

### Phase 7 — Admin
Adapt v1's dashboard to the v2 schema. Funnel, drop-off by *dimension* (new dimension names), UTM/device, answer transcripts, abandoned sessions, repeat lineage by phone. Purchase tracking across all three tiers. **`honest_flag` excluded from every view** (Gate 3).

### Phase 8 — Landing and supporting pages
Variant A at `/`, B/C/D at `/v/*`. Pre-assessment screen (child name captured here, **not** on the landing hero — it's typing friction before commitment; the rest of the screen stays locked/blurred until a name is entered). Post-assessment consolidated screen (name + email required; gender/tried/better optional; **age is not asked again**). Secondary curriculum page for retargeting. Real Privacy Policy and Terms pages — the footer links currently point at nothing.

---

## 7. Verification gates

Before declaring done:

- [ ] `curl localhost:3007/admin` with no credentials → **401**. With `ADMIN_PASSWORD` unset → **401**, not 200.
- [ ] Boot with an `rzp_live_*` key → **process exits**.
- [ ] All 64 gateway combinations resolve to a valid depth set.
- [ ] **Storm answer-set → The Storm, weakest_two = [Stability, Resistance].**
- [ ] No printed percentage appears anywhere in the report DOM.
- [ ] Direction axis renders no bar.
- [ ] Parent name appears exactly 4 times in a rendered report.
- [ ] A 12–14 parent sees zero 8–9 or 10–11 content in the LMS.
- [ ] Week 1 Day 3 renders a different card for `worked` vs `didn't land`.
- [ ] Top-up endpoint returns 403 for a user without a `module1` purchase.
- [ ] `honest_flag` appears in zero admin views, zero analytics payloads.
- [ ] `npm run content:manifest` runs and prints the TODO backlog.
- [ ] `grep -r "vercel\|deploy\|rzp_live" .` returns nothing.

---

## 8. When you hit ambiguity

Three rules:

1. **If a spec and this prompt conflict — the spec wins.** Report the conflict.
2. **If content is missing — `TODO()` it.** Never write filler.
3. **If a decision hasn't been made — stop and ask.** Do not pick a default and proceed silently. This project has twice shipped bugs where a value was referenced downstream but never captured upstream (child's name; concern chips). Both came from filling a gap quietly instead of surfacing it.
