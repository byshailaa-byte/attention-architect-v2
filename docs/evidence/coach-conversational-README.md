# Conversational Attention Coach — build evidence

Branch: `coach-quality` (dev/preview only — nothing merged or deployed to prod).

## Try it (preview on dev DB)
Preview: https://attention-architect-v2-3muyto4kc-the-human-decision-s-projects.vercel.app  (commit 392b32b)
Coach (Diya / The Captain / reminders), start at Day 0:
`/admin/coach-preview/fd5d006a-8905-45b3-ad58-2383bc31ca06?day=0`
- The Coach **opens the chat itself** (speak-first). Type as the parent; replies **stream**.
- Use the day switcher (`?day=1..4`) — on a later day the Coach asks how the last step went first.
- **Reset** (admin bar) wipes the transcript + all conversational state → fresh Day 0.
- Weekly review: `/admin/coach-review`.

## What changed
The Coach is now **fully conversational**: no scripted onboarding, no fixed step cards, no tap-chips,
no regex regen-guard loop. One well-fed context + the coaching method + tools the model calls on
purpose. Scripted modules (`lib/lms/coach/guards.ts`, `behaviour.ts`, onboarding chips, step cards)
are no longer in the live path (kept only for the legacy test suite; to be deleted with the eval swap).

## New pieces
- **Method prompt** — `lib/coach/method.ts` (the 9-point method + hard rules + tool-use guidance + idiom list).
- **Tools (no regex)** — `lib/coach/tools.ts`: `record_outcome`, `record_baseline`, `record_number`,
  `set_language`, `flag_for_call(urgent|normal)`, `note_for_memory` — all server-validated.
- **Context assembler** — `lib/coach/context.ts`: method + child profile + plain "why" (sanitised, no
  internal terms) + parent_memory (read first) + tonight's step as SOURCE MATERIAL + 2–3 gold examples
  + what-works stats (flag-gated OFF).
- **Engine** — `lib/coach/engine.ts`: streaming tool-use loop + graceful fallback (the model speaks first).
- **Numbers** — `lib/coach/numbers.ts`: ranges kept as [min,max] + parent's words; never rounded;
  `rangeVerdict` judges progress honestly (overlap = "about the same").
- **Memory** — `lib/coach/memory.ts`: per-parent (trial+paid), read-first, write-after-session, backfilled.
- **Gold library + retrieval** — `lib/coach/gold.ts` + `content/coach/gold-seed-v1.json` (9 seeds).
- **Thin final check** — `lib/coach/final-check.ts`: no promises, numbers match, language, no medical advice (logs; eval-gated).
- **Admin weekly review** — `/admin/coach-review`: needs-a-call, flagged/low-rated replies, pending gold (approve / write-a-better-reply).

## Migrations (additive, dev only; verify on ep-green-truth before prod)
- `phase_68_parent_memory` — `parent_memory` (+ `language`) and `coach_tracked_number` (ranges).
- `phase_69_gold_examples` — `gold_examples` (seeded with the 9 golds).
- `phase_70_call_flags` — `coach_call_request` (Coach's own call queue; call_log is the sales list).

## Privacy (draft line for the policy — before cross-parent learning goes live)
> "To improve the Coach, we may use anonymised snippets of coaching conversations — with names,
> contact details and anything that could identify your child removed. We never use your child's
> information for advertising, and we never share it with ad platforms."

Cross-parent "what works" stats are **OFF in production** (env `COACH_CROSS_PARENT_STATS` unset) and
stay off until you approve the policy line above. Cohorts smaller than 5 children are never surfaced.

## Results (dev, latest run — with the no-repeat fix)
**Scenario eval, 3 guarded runs through the production path** (`coach-conversational-eval.txt`):
- Tool-call checks: **33/33 (100%)** — right tool, right value, ranges never rounded (4–5 kept as 4–5),
  no outcome on venting/what-if, urgent flag on medical, language switch on Hindi.
- LLM method judge (8 criteria × 24 persona-runs): **81% this run** (79–84% across passes — LLM-judge
  run-to-run variance; tool-checks and the deterministic repeat count are the stable signals).
- Personas: Diya baseline "1 reminder", didn't-work→Hindi, what-if, frustrated, medical, low-English,
  unprompted Hindi, "I don't understand" (Parent-M). Every past failure included. Paid JSON path
  (non-streaming engine + backstop) exercised separately — returns JSON, tools fire.

### Language-switch "lost the thread" fix (root cause of the didnt_work→Hindi failures)
Cause: the parent never answered the diagnostic question ("Hindi me batao" is a language request,
"theek hai" is a non-answer), so the Coach kept re-asking instead of moving to the step + why.
Verified: `set_language` only writes the language preference (no context reset/rebuild); history and
parent_memory are never dropped; the method prompt is rebuilt in Hindi correctly. The gap was no
explicit "a language switch changes only output language — continue where you were" rule and no
server-side record of the live thread. Fix:
- `method.ts`: a language request changes ONLY the output language — not a reason to restart or re-ask;
  continue exactly where you were, give the step with its why in the new language.
- `context.ts`: a "## This conversation so far" block (what the parent said + questions already asked)
  so the Coach never re-asks; built from the same history the model sees (eval passes it too).
- 1 gold example: didnt_work → parent asks Hindi mid-conversation → Coach continues in Hindi with the
  adjusted step, no re-asking.
- Judge made stable: temperature 0, fixed prompt, 3 runs, per-persona **median** reported.

**Before → after:**
- `didnt_work→Hindi` persona: median ~6/8 → **8/8** (runs 8,8,7). `explained_why` fails: **8 → 0**.
- Overall judge: mean 81–84% → **88%** (169/192); **median 91%** (58/64). **Paid-path judge: 88%** (21/24).
- Per-criterion fails (24 persona-runs) before→after: explained_why 8→0, one_plain_step 7→3,
  followed_up 6→4, right_language 1→0; listened_first 7→7 and no_repeats 5→8 shifted to
  frustrated_vent/parent_m (step reinforcement) — deterministic lexical repeats still 0.
- Fixed transcript (run 1): Coach switches to Hindi and continues — *"Aksar jab screen chalu rehti hai,
  Diya ke liye choice sunna mushkil… aaj pehle TV band kijiye… phir kahiye: «Diya, pehle kaunsi? Tum
  batao.»"* — step + why, no re-ask.

### no_repeats fix (method rule + 2 gold examples + engine backstop)
- Method rule: on a short non-answer, never repeat/rephrase — give the single next action OR one NEW question.
- 2 gold examples (EN + HI) for the non-answer situation (`content/coach/gold-seed-v1.json`).
- Engine backstop: on non-answer turns, buffer → if the reply is lexically too similar to the previous
  reply, regenerate once → else a short fallback line.
- **Before vs after (deterministic lexical repeats): 0 → 0.** The Coach was never producing lexical
  near-duplicates, so the backstop almost never fires (correct). The judge's residual `no_repeats`/
  `listened_first` dings are **semantic** — re-asking the same question *reworded* after the parent
  switches to Hindi (the didnt_work→Hindi persona) — plus some judge strictness. A lexical backstop
  can't catch that; an LLM-based "did you just re-ask this?" check could, at ~1 extra call/turn. Flagged
  for your call rather than silently added.

**Model comparison** (`coach-model-compare.txt`, same judge + 4 hard scenarios):
| model | quality | ₹/turn | ₹/trial parent (4 days) | ₹/paid parent/week |
|---|---|---|---|---|
| claude-sonnet-4-6 | 72% | ₹2.32 | ~₹56 | ~₹18.6 |
| claude-opus-4-8 | 84% | ₹11.75 | ~₹282 | ~₹94 |

(The compare's quick single-score judge is harsher than the 8-criteria judge; Sonnet scores 84% on the
full judge above. Within the compare, same judge, Opus leads by 12 pts.)

**Recommendation:** **Sonnet 4.6 for the free trial** — 84% on the full judge at ~₹56/trial parent is
sustainable at volume; Opus at ~₹282/trial parent is hard to justify for a free funnel. Consider **Opus
for paid parents** (far fewer, higher value; ~₹94/week is fine) or only for the opener + hard turns.

**Cost caps (suggested):** trial ≈ ₹56/parent over 4 days on Sonnet (cap at 20 msgs/day already live);
paid ≈ ₹19/week on Sonnet (cap 30/day already live). Alert if a single parent's daily Coach spend
exceeds ₹30 (trial) / ₹50 (paid).

## Evidence files
- `coach-conversational-eval.txt` — scenario eval, 3 runs, transcripts + tool-call checks + judge.
- `coach-model-compare.txt` — Sonnet 4.6 vs Opus 4.8: quality + ₹/turn + ₹/parent.
