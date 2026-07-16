# The Scoring Formula — 4-Axis Value Derivation
### The missing piece: how assessment answers become the numbers in Section 5

---

> **⚙️ SCOPE — what this spec does and does NOT cover**
>
> **Already specified elsewhere — NOT re-specified here:**
> - Per-dimension vote-tally scoring + tiebreak → *assessment-final spec §5*
> - Archetype derivation (8 types) + fallback mapping → *assessment-final spec §6*
> - Parent pattern derivation (4 patterns) → *assessment-final spec §7*
> - Which dimensions feed which axis → *4-axis framework §1*
>
> **The genuine gap this spec fills:** the 4-axis framework says *which* dimensions feed each axis but never says how to turn dimension answers into a **number** (the 28% / 22% / 65% in Section 5). Those numbers are currently invented mockup values. Nothing can ship until this derivation is real. This spec defines only that: **dimension answers → 4 axis values → weakest-two selection.**

---

## 1. First principle: what these numbers are, and what they must never pretend to be

The Section 5 axis values are a **presentation of relative pattern strength**, not a measurement on a validated scale. This distinction is not pedantic — it determines how we're allowed to compute and display them.

- They are **honest** as *relative, within-child* signals: "for this child, Resistance is the weaker axis than Recovery."
- They are **not** valid as *between-child, absolute* claims: "this child scores 22/100 on Resistance, another scores 45." We have no norm sample, no validation, nothing that makes a cross-child number meaningful yet. That's the entire point of the parallel research track.

**Design consequence:** the number must be computed transparently from the answers (no black box), and displayed in a way that reads as *this child's pattern*, not *this child's rank*. This is why the report already says "Not a score. A map." — the copy is doing real work protecting against a claim the math can't back. The formula must not undermine it by producing scores that *look* like ranks.

> **This is also the honest-science guardrail:** everything below is a **principled provisional formula**, not a validated one. Every specific number (weights, band cutoffs) is tagged **[CALIBRATE]** — a reasoned starting value that must be tuned against real response distributions, exactly like the routing defaults and fallback mappings were flagged in the assessment spec. We are being explicit about false precision rather than hiding it.

---

## 2. The core mechanic: each axis is a weighted agreement score

Every axis is fed by one or more dimensions (per 4-axis framework §1). Each contributing dimension has, from the assessment, a set of collected data points (Gateway answer + any depth/confirm answers). We already tally these into a winning *value* per dimension. For the axis number, we need one step more: **how strongly did the answers agree, and did they point toward the "strong" or "weak" end of that axis?**

Two components multiply together:

**(a) Consistency (0–1): how unanimous were this dimension's data points?**
```
consistency = (votes for the winning value) / (total data points for that dimension)
```
- A dimension with 3 data points all pointing the same way → consistency = 1.0 (this child's pattern here is clear and reliable).
- A dimension with 3 data points split 2–1 → consistency = 2/3 (real but wobbly).
- **A dimension with exactly 1 data point → consistency = 0.5, NOT 1.0.**

> **🔴 The single-data-point rule is load-bearing.** One answer tells you nothing about unanimity — unanimity with a sample of one is undefined, not perfect. Setting it to 1.0 silently declares maximum confidence on minimum evidence. Because `recharge_type` is unanchored and rarely routed to depth, this bug alone forced Recovery to 0.70 ("Strong") for the majority of children, structurally preventing it from ever appearing in `weakest_two`. Use 0.5. It reads as "we don't know," which is the truth.

**Never express consistency as a rounded decimal.** 2 of 3 data points is `2/3`, not `0.67` — and `2/3 < 0.67`, so a `>= 0.67` comparison silently excludes the exact case it was written to include. Compare vote counts (`winning_votes >= 2`) wherever a threshold matters, especially in the honest-path triggers.

**(b) Polarity (0–1): does the winning value sit at the strong or weak end of this axis?**
Each axis has a defined mapping from dimension-values to a polarity score. "Strong end" = the pattern supports that axis; "weak end" = the pattern undermines it. Full tables in §3.

**Axis value = polarity × (0.5 + 0.5 × consistency), scaled to 0–100.**

The `(0.5 + 0.5 × consistency)` term means: even a perfectly weak-polarity answer with shaky consistency doesn't crash to zero, and consistency modulates rather than dominates. **[CALIBRATE]** — the 0.5 floor is a reasoned choice to prevent single wobbly dimensions from producing absurd extremes; the real floor should be set once we see how often low-consistency results actually occur.

---

## 3. Polarity tables — the strong/weak end of each axis per dimension value

*(These are the reasoned mappings. Every value here is **[CALIBRATE]** — defensible starting polarities, to be checked against whether real parents agree the resulting axis picture "feels true.")*

### DIRECTION — fed by `attention_shape` + `reward_driver`
Direction is special: **it is the archetype**, not a strong/weak axis. Per the report master, its Section 5 row shows the archetype name and says "Covered in Section 2," not a bar. **So Direction gets no numeric value** — it displays as the type, full stop. (This resolves a latent inconsistency: the mockup showed Direction at 100%, implying "maxed out," which is meaningless. It shouldn't have a bar at all.)

### STABILITY — fed by `attention_shape` (baseline) + `friction_response` (modifier)
"Does attention hold once it goes somewhere?"

| `attention_shape` value | Baseline polarity | Reasoning |
|---|---|---|
| narrow-deep | 0.85 | holds by nature — locks into a groove |
| social-anchored | 0.60 | holds while the social condition holds |
| wide-shifting | 0.35 | naturally moves between things |
| sensation-seeking | 0.30 | holds only while stimulation lasts |

Then `friction_response` modifies (difficulty is what breaks a held pattern):
| `friction_response` value | Modifier |
|---|---|
| solo-push / energized | +0.10 (difficulty doesn't break them) |
| support-seek | 0.00 (holds *if* support present) |
| avoid | −0.10 (difficulty ends the session) |
| emotional-derail | −0.15 (difficulty detonates the session) |

Stability polarity = clamp(shape_baseline + friction_modifier, 0.05, 0.95).

### RESISTANCE — fed by `attention_competition` (primary) + avoid/derail ends of `friction_response`
"Can attention survive something more compelling nearby?"

| `attention_competition` value | Polarity | Reasoning |
|---|---|---|
| genuine-interest | 0.70 | only leaves for things genuinely worth it |
| social | 0.50 | pulled by people specifically |
| boredom-avoidance / novelty | 0.35 | leaves the moment the current thing dips |
| **external** | **0.35** | **captured by ambient noise and movement — the competitor isn't more compelling, just present** |
| task-escape / internal | 0.25 | actively flees difficulty toward the competitor |

> **`external` was missing from this table** while the honest-path spec's Trigger C already depended on it. That was a spec bug, not an implementer's gap. It sits at 0.35 alongside novelty: both describe attention pulled *by the environment* rather than *fleeing the task*, which is what separates them from task-escape at 0.25.
>
> **[CALIBRATE] — highest priority in this table.** `external` is the least trait-like value here: it's heavily confounded by the child's actual physical environment (a noisy shared room versus a quiet desk). A child scoring `external` may have an environment problem, not an attention one. Check this against real data before trusting it.

Modifier: if `friction_response` ∈ {avoid, emotional-derail}, −0.10 (internal pull compounds external pull).

### RECOVERY — fed by `recharge_type` alone
"Does attention come back after being spent?" Recovery polarity is less about strong/weak and more about *how clearly defined* the child's recharge path is — a clear recharge type = reliable recovery.

**Recovery does NOT use the §2 formula.** It is computed directly, because its polarity *is* consistency — running it through `polarity × (0.5 + 0.5 × consistency)` would double-count the same signal.

```
recovery_value = 0.25 + (0.50 × consistency)
```

| consistency | value | band |
|---|---|---|
| 1.00 (all data points agree) | 0.75 | Strong |
| 2/3 | 0.58 | Mixed |
| 0.50 (single data point — unknown) | 0.50 | Mixed |
| 1/3 (three-way split) | 0.42 | Mixed |

**What Recovery actually measures — and what it does not.** `recharge_type` tells us *how* a child recharges (quiet / movement / social / creative). It does not tell us how *well*. No recharge route is better than another, so polarity cannot be read off the value.

What it can honestly measure is **clarity of route**. A child whose answers consistently point to one recharge mode has a reliable, protectable path back. A child whose answers scatter doesn't — and "your child has no dependable way of recovering" is a real, actionable weakness with a real intervention (help them find and protect one route). That is the axis.

**Two consequences to hold onto:**
- The parent-facing insight is the *value* ("free time with no rules recharges him"), surfaced as the band label and description. The number is only ever used for ranking.
- **[CALIBRATE] — softest axis of the four.** The honest fix, later, is a dedicated question measuring recovery *quality* ("after a hard day, is he himself again by morning, or does it linger?"). Until that exists, clarity-of-route is a proxy, and should be described as one.

---

## 4. From values to what the report actually uses

### 4a. Normalize before you compare anything

**The three axes have different achievable ranges.** Ranking their raw values against each other is apples-to-oranges, and it biases the result: Resistance tops out around 0.70 while Stability reaches 0.95, so a child who is *maxed out* on Resistance would still have it flagged as a weakness. That is a scoring artifact presented to a parent as a finding about their child — exactly what §1 forbids.

Every axis is normalized to `[0, 1]` **within its own range** before banding or ranking.

```
stability_norm  = (stability_value  - 0.03) / (0.95 - 0.03)
resistance_norm = (resistance_value - 0.10) / (0.70 - 0.10)
recovery_norm   = recovery_consistency          // see below
```

**[CALIBRATE]** — the min/max constants are the theoretical bounds of each formula, not observed bounds. Tighten to observed percentiles once real distributions exist.

**Recovery normalizes from its vote structure, not from raw consistency.** Recovery *is* clarity-of-route (§3). But `winning_votes / data_points` collapses two very different situations onto the same number: one data point (we never asked) and a two-way split (we asked twice and got different answers) both yield 0.5. The first is ignorance. The second is evidence. They must not rank the same.

| data_points | winning_votes | recovery_norm | meaning |
|---|---|---|---|
| **1** | 1 | **— (see below)** | **unmeasured** |
| 2 | 2 | 1.00 | one clear route |
| 2 | 1 | 0.35 | two different answers — no dependable route |
| 3 | 3 | 1.00 | clear |
| 3 | 2 | 0.65 | mostly clear |
| 3 | 1 | 0.30 | scattered |

> ### 🔴 The eligibility rule
>
> **An axis with `data_points == 1` on its primary dimension is INELIGIBLE for `weakest_two`.**
>
> Recovery's primary dimension is `recharge_type`. With a single data point we have no evidence the child recovers badly — only evidence that we didn't ask. Ranking that against measured axes recommends a week of work on the basis of our own blind spot.
>
> An earlier draft of this section said an unmeasured Recovery should be *"never flagged as a weakness"* while the ranking mechanism happily flagged it. The first real sweep exposed this: Recovery entered `weakest_two` for half of all archetypes at its unmeasured 0.500 value, while the one routing path that actually investigates it returned **Strong**. The system was blind exactly where it was most confident.
>
> **An ineligible axis still displays.** Its band and description come from the `recharge_type` *value*, which one answer does tell us ("free time with no rules recharges him"). It simply cannot be selected as a roadmap target.

> ### ⚠️ Consequence, and the required routing change
>
> If Recovery is ineligible whenever `recharge_type` has one data point, it is ineligible for roughly three-quarters of children — and `weakest_two` collapses to a fixed `[Stability, Resistance]` for them. The Weeks 2–6 ordering would then be personalized in *content* (each week's move is archetype-specific) but not in *sequence*.
>
> **Fix upstream, not downstream: `recharge_type` must receive a second confirming question for every child**, giving it `data_points >= 2` unconditionally. Cost: one question, roughly fifteen seconds, well inside the "under 5 minutes" claim. This is the only change that lets Recovery compete honestly rather than by default.
>
> Do not solve this by lowering the eligibility bar. Recommending a week of a parent's life on one unverified answer is worse than admitting the sequence is fixed.

### 4b. Bands and bars — both from the normalized value

**[CALIBRATE] cutoffs**
- ≥ 0.65 → "Strong" / "Steady" / "Holds well" *(axis-appropriate word)*
- 0.40–0.64 → "Mixed" / "Variable"
- < 0.40 → "Low" / "Fragile" *(axis-appropriate)*

Bar width = `normalized × 100%`. The band word matters more than the bar for the parent — lead with the word, show the bar as support. (Matches the report's copy discipline.) **No number is ever printed** (§7).

### 4c. The weakest-two selection

Drives Section 8's "where to start" **and** the Weeks 2–6 roadmap order.

```
Rank Stability, Resistance, Recovery by NORMALIZED value, ascending.
The two lowest = the weakest link = the roadmap's first two modules.
Direction is excluded — it is the archetype, not a trainable axis.
```
Storm worked example: Stability low + Resistance low → those two rank lowest → "Start here: Stability and Resistance." This is exactly what the Storm+Pusher report and LMS Week 1/2 already assume. **This spec makes that linkage computed rather than hardcoded** — which was the explicit gap flagged in the report master.

> **Tie handling for weakest-two:** if two axes tie for second-lowest, break the tie toward the axis most connected to the parent's stated `{{objective}}` (e.g., objective=screens → prefer Resistance). This is the one place stated objective is allowed to touch axis *presentation* — and it never touches the underlying value, only which of two tied axes gets surfaced first. Keeps the "objective never affects scoring" rule intact while making the tiebreak feel personalized.

---

## 5. The honesty problem this formula creates, and how we handle it

**The adaptive assessment gives different children different numbers of data points per dimension.** A child routed into `friction_response` depth has 3 data points feeding Stability; a child not routed there has 1 (or the confirm question's 1). This means **consistency is not comparable across children** — and worse, a child with a single Gateway data point gets consistency = 1.0 automatically, which *overstates* confidence.

Two required safeguards:

1. **Never display cross-child comparisons.** The formula's output is only ever shown as this-child's-own-profile. (Already the design intent; this makes it a hard rule.) The moment anyone wants a "compared to other kids" feature, this formula is not valid for it — that needs the research instrument and a norm sample.

2. **Confidence flag, internal:** compute a per-child `data_richness = total data points collected / max possible`. Low richness doesn't change the displayed numbers, but it's logged, so that when real data exists we can check whether low-richness reports are less accurate/more complained-about. This is a research hook, invisible to the parent. **This is also where the adaptive product and the fixed-item research instrument reconcile** — the research version collects all data points for everyone, giving the norm sample the adaptive version can't.

---

## 6. What must happen before this ships vs. after

**Before launch (blocking):**
- Implement §2 formula + §3 polarity tables + §4 normalization, bands, and weakest-two selection.
- Replace every invented number in the report artifact (28/22/65 etc.) with computed values.
- Verify Storm+Pusher worked example: does a plausible Storm answer-set actually produce Stability-low + Resistance-low? (If not, the polarity tables need adjustment before, not after, launch.)

**🔴 The axis-profile sweep — a second blocking gate.**

The Storm check passes on a single profile. It cannot detect an axis that is *structurally* incapable of ever being weakest.

> **Do not sweep the 32 archetype × pattern combinations.** `parent_instinct` feeds no axis — Stability comes from `attention_shape` + `friction_response`, Resistance from `attention_competition`, Recovery from `recharge_type`. Across 32 combinations there are only **8 distinct axis profiles**, each counted four times. A sweep over parent patterns inflates the sample without adding a single bit of information, and the first run of this gate did exactly that: it reported 16/32 (50%) where the real figure was 4 of 8 archetypes.

Sweep the **answer space that actually feeds the axes**: `attention_shape` (4) × `friction_response` (4) × `attention_competition` (4) × `recharge_type` (4), restricted to profiles reachable under the routing tree. Report the `weakest_two` distribution over reachable profiles.

**Pass condition:** each of Stability, Resistance, and Recovery appears in `weakest_two` for **at least 15% of reachable profiles** — counting only cases where the axis was **eligible** (§4a).

**Report separately:**
```
Recovery ELIGIBLE  in N/M profiles (X%)   // recharge_type data_points >= 2
Recovery IN weakest_two, given eligible: N/M (X%)
```

Those two numbers answer different questions. The first says whether routing measures Recovery often enough for it to matter. The second says whether, when measured, it ever turns out to be weak. **Both must clear 15%.** A high second number with a low first is the failure the original gate missed.

**If Recovery is rarely eligible:** the routing change in §4a is required. If it is eligible but never weakest, the axis is genuinely not a differentiator and the Weeks 2–6 sequence claim should be dropped. Either outcome is a product decision to surface — not a constant to nudge.

*(15% is a reasoned floor, not an empirical one: below roughly one in six, an axis contributes nothing to differentiating children.)*

**After launch (the [CALIBRATE] queue, in priority order):**
1. Band cutoffs (§4) — most visible to parents, tune first against real distributions.
2. Polarity tables (§3) — tune against "does this feel true" parent feedback.
3. The 0.5 consistency floor and Recovery's polarity model (§2, §3) — softest, tune last.

> Every calibration item is logged, versioned, and revisited — same discipline as the routing defaults. Nothing here is presented to parents as validated science; it's an honest, transparent, provisional pattern-presentation that a real validation study will later either confirm or correct.

---

## 7. Display decision — LOCKED

**Section 5 renders relative bars with NO printed percentages.**

- Bar length honestly encodes within-child relative strength (what the formula can actually back).
- No "22%" is printed anywhere — printing a number implies a precision, and a cross-child comparability, that this formula explicitly does not have (§1, §5).
- Each axis leads with its **band word** (Strong / Mixed / Low), then the bar, then the descriptive sentence. Word first, bar as support — matching the report's existing copy discipline.
- **Direction shows no bar at all** — it displays the archetype name (per §3).

**Implementation consequence:** the `{{axis.N.value}}` slot still exists and is still computed — it drives bar *width* and the weakest-two ranking. It is simply never rendered as text. The number is real, internal, and load-bearing; it just isn't shown.

This resolves the false-precision tension without sacrificing the visual conviction the bars provide.
