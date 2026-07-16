# The Honest Path — Trigger Threshold Specification

> ## ⚠️ REVIEW REQUIREMENT — READ BEFORE IMPLEMENTING
>
> This document was drafted by Claude, which is **not a clinician**. It defines when Attention Architect suggests a parent speak to a professional about their child.
>
> **This spec must be reviewed and signed off by a qualified child psychologist or developmental pediatrician before it is exposed to a single real parent.** The ATI framework already names NIMHANS and TISS as partnership targets — this is precisely the artifact they should review.
>
> Until that review happens: **ship the mechanism, log the triggers, display nothing.** (See §7.)

---

## 1. What this mechanism is — and emphatically is not

**It is:** a promise, kept. The report tells parents *"if anything in your answers pointed to something worth a professional's eyes, we'd say so."* This spec defines when that sentence becomes a live disclosure instead of a reassurance.

**It is not:**
- A screening instrument. We have no validated cutoffs, no norm sample, no clinical training behind these rules.
- A diagnosis, or a suggestion of one. The words ADHD, autism, anxiety, depression, dyslexia, and every clinical term **must never appear** in triggered copy.
- A risk score, severity tier, or anything a parent could read as a verdict on their child.

**The only claim it makes:** *"this specific pattern is outside what a course is designed to address."* That is a statement about the product's limits, not about the child. That framing is the whole safety architecture — it keeps us honest without pretending to expertise we don't have.

---

## 2. Design constraints that shaped these thresholds

1. **Require convergence, never a single answer.** One answer is noise. Two independent dimensions pointing the same way is a signal worth mentioning.
2. **Prefer false negatives to false alarms.** Wrongly alarming a parent about a healthy child causes real harm, damages trust, and is the failure mode most likely to end this brand. A missed flag is bad; a manufactured worry is worse *and* more likely.
3. **Never blame the parent.** No trigger fires on `parent_instinct` answers. See §5 for a trigger I considered and rejected on these grounds.
4. **Never withhold the report.** The triggered state is *additive*. The parent still receives everything.
5. **Reduce commercial pressure when triggered.** See §6 — this is an ethics decision with revenue cost, made deliberately.

---

## 3. The three triggers

All triggers are **OR'd** — any one firing produces the triggered state. Each has its own copy variant (§4), because the disclosure must reference the pattern the parent actually described.

---

### TRIGGER A — Distress around difficulty
**Confidence: highest. Retain.**

```
FIRES IF:
  friction_response.winning_value == "emotional-derail"
  AND friction_response.winning_votes >= 2
```

> **Compare vote counts, never a rounded consistency decimal.** An earlier draft of this spec said `consistency >= 0.67` and glossed it as "at least 2 of the collected data points." Those are not the same condition: 2 of 3 data points is `2/3 = 0.6666…`, which is **strictly less than 0.67** and would have silently failed the exact case the rule was written to catch — a child who described distress on two of three questions, whose parent would then never see the disclosure.
>
> A floating-point rounding error has no business sitting between a distressed child and a referral suggestion. `winning_votes >= 2` is unambiguous. Use it.
>
> The `winning_votes >= 2` condition also subsumes the old `data_points >= 2` requirement — a single data point cannot produce two votes.

**Why this is defensible:** A child who becomes upset *before attempting* — reported consistently across multiple independent questions — is describing distress, not an attention pattern. The relevant answer options are *"They get upset before they even start trying"* (D3.1) and *"A reason to believe it's worth trying again"* (D3.3). Teaching a parent to hand over ownership does not address a child who is distressed by the prospect of difficulty. Saying so is simply true.

**Note on consistency:** if `friction_response` was not routed to depth, it has ≤1 data point and consistency is 1.0 by definition (see scoring spec §5). **Trigger A must therefore additionally require `friction_response.data_points >= 2`** — otherwise a single confirming-question answer fires it. This is a real edge case; do not skip it.

---

### TRIGGER B — Systematic avoidance across independent dimensions
**Confidence: high. Retain.**

```
FIRES IF:
  friction_response.winning_value == "avoid"
  AND attention_competition.winning_value IN ("task-escape", "internal")
```

**Why this is defensible:** Two dimensions, measured by different questions, independently describing flight from difficulty. `friction_response = avoid` ("they go quiet and try to avoid it") plus `attention_competition = task-escape` ("a harder task they'd rather avoid"). Converging evidence.

A course teaches a parent to make work *feel* more ownable. It cannot detect that the work may be genuinely inaccessible to the child — which is a thing a professional can assess and we cannot. This is an honest statement of our own limits.

---

### TRIGGER C — Sensory load
**Confidence: LOWEST. First candidate for removal after firing-rate analysis. Requires three-way convergence.**

```
FIRES IF:
  recharge_type.winning_value == "sensory-quiet"
  AND attention_competition.winning_value == "external"
  AND friction_response.winning_value IN ("avoid", "emotional-derail")
```

**Why the three-way requirement:** A child who recharges in quiet is, on its own, just an introverted child. That is not a flag, and firing on it would be exactly the manufactured worry §2 forbids. Only when quiet-recharge co-occurs with *being pulled away by noise and movement* **and** *struggling with difficulty* does the pattern suggest sensory load worth someone's professional attention.

**I am least confident in this trigger.** It should be the first thing a reviewing clinician interrogates, and the first thing removed if firing rates come back high.

---

## 4. Triggered copy — one variant per trigger

Rules binding all variants: no clinical terms; no "you should be worried"; name the *pattern the parent described*, not a condition; name a *concrete, accessible* professional; state plainly that this doesn't mean something is wrong.

**Variant A (distress around difficulty):**
> **Worth a closer look:** a few of your answers — specifically around how {{child_name}} responds when something gets hard — describe a pattern that goes beyond what a course is built to address. This doesn't mean something is wrong. It means a conversation with a school counsellor or your pediatrician could be genuinely useful alongside anything else you try. We'd rather tell you plainly than not.

**Variant B (systematic avoidance):**
> **Worth a closer look:** your answers describe {{child_name}} consistently moving away from difficulty, in more than one way. A course can change how work *feels* — it can't tell you whether the work itself is landing the way it should. That's worth a conversation with a school counsellor or teacher who can see {{child_name}} up close. This doesn't mean something is wrong. It means someone with eyes on the actual work would tell you more than we can.

**Variant C (sensory load):**
> **Worth mentioning:** a few of your answers together — how {{child_name}} recharges, and what pulls their attention away — suggest their environment may be doing more work on them than it does on most children. That's not a problem to fix, and it isn't something a course addresses. If it resonates, an occupational therapist or your pediatrician can say far more about it than we can.

*(If multiple triggers fire, display Variant A if present, else B, else C. Never stack disclosures — one clear message.)*

---

## 5. A trigger I considered and rejected

**Parent distress.** Question P2 offers *"Staying calm when nothing seems to be working"* as an answer. It would be technically possible to fire a support-resources disclosure on it.

**Rejected**, for two reasons. First, it violates the product's foundational guardrail — the parent is the Architect and is never the subject of diagnosis. A parent who honestly admits difficulty staying calm, and is answered with a mental-health referral, has been punished for honesty. Second, it would immediately corrode the disarm framing in Section 3 (*"nothing here is wrong"*) that makes the entire parent-pattern reveal safe to read.

Documented here so it stays rejected rather than being rediscovered as a "good idea" later.

---

## 6. What the triggered state changes in the report

| Element | Default | Triggered |
|---|---|---|
| Full report | shown | **shown** (never withheld) |
| Honest-path block | reassurance ("nothing did") | **the relevant disclosure variant** |
| Position | immediately before final CTA | **unchanged** |
| Final CTA | shown | **shown, unchanged copy** |
| Mid-report soft CTA (§4) | shown | **suppressed** |
| Sticky CTA bar | shown | **suppressed** |

**The reasoning on suppression:** we've just told this parent their child's pattern may exceed what a course addresses. Following that with persistent sales pressure would make the disclosure feel like a setup rather than honesty. The primary CTA remains — the copy explicitly permits the course *alongside* professional support, and withholding the offer entirely would be its own kind of paternalism. But we stop pushing.

This costs conversion on triggered reports. That is the correct trade, and it should be made deliberately rather than discovered later.

---

## 7. Pre-launch gates — all three are blocking

**Gate 1 — Firing rate.** Run all three triggers against the real answer distribution once ≥200 completed assessments exist.
- **Target: each trigger fires on <10% of completions; all triggers combined <15%.**
- If combined firing exceeds ~20%, thresholds are too loose and the disclosure becomes noise — it stops protecting the children who need it and starts alarming the ones who don't. Tighten (Trigger C first).
- These percentage targets are **reasoned, not empirical.** They encode a judgment that a referral suggestion should be uncommon enough to mean something. A clinician may well disagree, and should.

**Gate 2 — Clinician sign-off.** No triggered copy is displayed to a real parent before a qualified child psychologist or developmental pediatrician has reviewed §3 and §4.

**Gate 3 — Data handling.** `honest_flag` and `honest_trigger` are **sensitive inferences about a named child.** They must be:
- stored, but never exposed in the `/admin` dashboard's general views
- excluded from any analytics event, UTM payload, or third-party pixel
- excluded from marketing segmentation, permanently and by policy — a parent whose child triggered a referral flag must never be retargeted on that basis

Gate 3 is not optional and not negotiable. Violating it would be the single most serious breach of trust available to this product.

---

## 8. Until the gates are cleared

**Ship the mechanism. Log the triggers. Display nothing.**

Implement the logic, compute `honest_flag` and `honest_trigger` on every assessment, write them to the database under the Gate-3 handling rules — and render the default reassurance copy to every parent. This lets Gate 1's firing-rate analysis run on real data while zero parents see unreviewed clinical-adjacent copy.

Flip the display on only after Gates 1 and 2 clear. A single environment variable (`HONEST_PATH_DISPLAY_ENABLED`, defaulting to `false`) controls this.
