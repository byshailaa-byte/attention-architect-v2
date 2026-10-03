# Assessment drop-off — read-only fact-find (baseline, 2026-10-03)

Endpoint: `ep-green-truth-aqxygaj2` (`…-pooler.c-8.us-east-1.aws.neon.tech`). Internal excluded via `is_internal`; `INTERNAL_PHONES` is **unset**.

## Two measurement caveats that shape everything
1. **Landing and assessment use different session IDs.** `/simplified/start` mints a *separate* "landing session UUID" for `landing_step_*` events (`app/simplified/start/page.tsx:128–133`); `/assessment` creates its own `session_id`. They're never linked. So `landing_step_*` (screens 1–2) and `assessment_*` (Q-flow) are **disjoint id spaces** — the screen-2 → assessment handoff is **unmeasurable** (54 followup sessions, 0 with a later `assessment_started` under the same id).
2. **`device` is not stored** (`assessments.device = {}` for all) → **no device split possible.** **Source** (`utm`) is written only on `assessments`, created at *completion* → droppers have no row, so **source can't be attributed to any drop step.**

## 1. Funnel map (Meta → last question)
Meta UTMs in `assessments` (14d, non-internal): `utm_source=meta, utm_medium=paid_social, utm_campaign=attention_parents_new, utm_content="Attention Parents-New Ad"`. All 9 meta completers are `pricing_variant=simplified` → Meta uses the simplified funnel. The ad's *landing route* is **not stored** anywhere (no page_view event); UTM is captured by `app/simplified/layout.tsx` (`UtmCapture`) on any `/simplified/*` page, so the ad lands on either `/simplified` (marketing) or directly `/simplified/start`.

| # | Screen | Route / file | Fields (required?) | Copy (headline · button) | Taps | Entry event | Exit event |
|---|---|---|---|---|---|---|---|
| L | Landing (marketing) | `/simplified` · `app/simplified/page.tsx` | none | long page, CTA "Take free assessment" | 1 (scroll+click) | none | none |
| 1 | Start form | `/simplified/start` (stage `start`) | name (optional), gender (req), age (req), concern (req) | eyebrow "Before You Start" · "Continue →" | 3 req taps + optional name | none | `landing_step_age`, `landing_step_concern` (field-level only) |
| 2 | Follow-up | `/simplified/start` (stage `followup`) | 1 follow-up Q (req) | "One more question" / e.g. "When homework time starts, what usually happens first?" | 1 tap | none | `landing_step_followup` (then navigates to `/assessment`) |
| Q1 | First question | `/assessment` · `app/assessment/page.tsx` | G1 choice | "Warm up · 1 of 3" / "When {name} gets completely absorbed…" | 1 tap/Q | `assessment_started` (on mount) | `assessment_question_complete {question_idx:0}` |
| …Q-mid…last | adaptive Q's | `/assessment` | ~13–15 Q's | — | 1 tap each | — | `assessment_question_complete {idx}`, `assessment_dimension_complete` |
| End | Complete → details → report | `/assessment` → report | parent name/email/WhatsApp (all req) | — | 3 inputs | `assessment_complete`, `generate_lead` | `simplified_report_view` / `report_view` |

Screens 1 and 2 have NO entry event and NO dedicated exit event — only per-field selection events. The landing marketing page has no events at all.

## 2. Step counts (14 days) — two disjoint sub-funnels (id split)

Sub-funnel A — simplified landing (by landing id; internal/source/device NOT separable):
| Step (event) | sessions | % lost vs prev |
|---|---|---|
| Screen 1 — age selected | 69 | — |
| Screen 1 — concern selected | 74 | — |
| Screen 2 — follow-up answered | 54 | −27% (vs concern 74) |

Sub-funnel B — assessment (by assessment id, non-internal):
| Step (event) | sessions | % lost vs prev |
|---|---|---|
| assessment_started | 68 | — |
| Q1 done (idx 0) | 46 | −32% |
| Q-mid (idx ≥ 6) | 34 | −26% |
| assessment_complete | 31 | −9% |
| report view | 24 | −23% |

Where in the Q's people stop (max question_idx): idx 0–4 → 12 sessions (incl. 6 at idx 2), then idx 14 → 29 sessions. Loss is front-loaded.

By day (IST, unique sessions):
| day | S1(age) | S2(followup) | q_start | Q1 | complete | report |
|---|---|---|---|---|---|---|
| 09-25 | 7 | 7 | 8 | 7 | 7 | 3 |
| 09-27 | 4 | 2 | 2 | 2 | 2 | 1 |
| 09-28 | 3 | 3 | 6 | 4 | 4 | 3 |
| 09-29 | 5 | 3 | 6 | 3 | 2 | 3 |
| 09-30 | 9 | 9 | 10 | 9 | 4 | 4 |
| 10-01 | 12 | 9 | 11 | 7 | 2 | 3 |
| 10-02 | 11 | 10 | 13 | 6 | 5 | 10 |
| 10-03 | 11 | 7 | 8 | 5 | 2 | 2 |

Before vs after `28c1a6f` (gender-required, cut 2026-10-02 23:40 UTC / 05:10 IST):
| window | S1 | S2 | q_start | complete |
|---|---|---|---|---|
| BEFORE | 59 | 47 | 61 | 29 |
| AFTER | 10 | 7 | 7 | 2 |
The "after" sample (≈7.4 h: 10 screen-1 sessions, 2 completes) is far too small to judge.

## 3. Timing (14d)
| metric | median | p75 | n |
|---|---|---|---|
| Screen 1 → Screen 2 (continued) | 20.2 s | 36.9 s | 54 |
| Screen 1 dwell (dropped, no S2) | 0.8 s | 7.8 s | 26 |
| Screen 2 → assessment (continued) | — | — | 0 (id split) |

Continuers spend ~20 s on the dense Screen 1; the 26 droppers quit within ~1 s of their first tap.

## 4. Performance (Lighthouse not installed → Playwright + CDP, Slow-4G + 4× CPU, 390×844, local prod build)
| page | domInteractive | load | JS (kB) | TBT | render-blocking | first-tap ready |
|---|---|---|---|---|---|---|
| `/simplified` (landing) | 0.70 s | 2.81 s | 160 | 109 ms | 2 CSS chunks | 71 ms |
| `/simplified/start` (screen 1) | 0.67 s | 2.23 s | 163 | 59 ms | 2 CSS chunks | 64 ms |

No render-blocking JS or fonts (Next scripts deferred; fonts via `next/font`) — only 2 CSS chunks block. Healthy. (Measured against a local `next start` on the dev DB, not the real prod CDN — ceiling-case, not exact field data.)

## Top 3 hypotheses (each tied to a number)
1. The assessment's first question loses ~a third of starters: `assessment_started 68 → Q1 46 = −32%`, with 12 sessions stopping at idx 0–4.
2. Screen 1 is overloaded for a cold ad click: 3 required taps before Continue; `concern 74 → follow-up 54 = −27%`, and the 26 who abandon do so ~0.8 s after one tap.
3. The screen-2 → Q1 handoff is an unmonitored leak: 54 answer the follow-up but none are joinable to any assessment start (separate id); only 46 ever finish Q1.

Performance is not a hypothesis (load 2.2–2.8 s, 160 kB JS, TBT < 110 ms on throttled 4G).
