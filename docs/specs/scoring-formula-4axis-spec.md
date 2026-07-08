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
- A dimension with 3 data points split 2–1 → consistency = 0.67 (real but wobbly).
- An anchored dimension answered only at the Gateway (1 data point) → consistency = 1.0 by definition, but see §5 for the confidence caveat this creates.

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
| task-escape / internal | 0.25 | actively flees difficulty toward the competitor |

Modifier: if `friction_response` ∈ {avoid, emotional-derail}, −0.10 (internal pull compounds external pull).

### RECOVERY — fed by `recharge_type` alone
"Does attention come back after being spent?" Recovery polarity is less about strong/weak and more about *how clearly defined* the child's recharge path is — a clear recharge type = reliable recovery.

| `recharge_type` | Polarity | Reasoning |
|---|---|---|
| any single value with high consistency | 0.65–0.75 | a clear, known recharge route = recovers reliably *if the route is available* |
| low consistency (no clear type) | 0.40 | recovery is unpredictable because the child themselves is unclear |

**Recovery leans more on the consistency term than polarity** — the insight parents need isn't "high or low" but "here's specifically what recharges them," which is the `recharge_type` *value*, surfaced as the band label, not the number. **[CALIBRATE]** heavily — this is the softest of the four.

---

## 4. From values to what the report actually uses

**Band labels (what shows next to each axis, e.g. "Low"):** **[CALIBRATE] cutoffs**
- ≥ 0.65 → "Strong" / "Steady" / "Holds well" (axis-appropriate word)
- 0.40–0.64 → "Mixed" / "Variable"
- < 0.40 → "Low" / "Fragile" / axis-appropriate

The band word matters more than the number for the parent — lead with the word, show the bar as support. (Matches the report's "lead with the word" copy discipline.)

**The weakest-two selection (drives Section 8 "where to start" AND the roadmap):**
```
Rank Stability, Resistance, Recovery by axis value, ascending.
The two lowest = the weakest link = the roadmap's first two modules.
(Direction is excluded — it's the archetype, not a trainable weak axis.)
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
- Implement §2 formula + §3 polarity tables + §4 band cutoffs and weakest-two selection.
- Replace every invented number in the report artifact (28/22/65 etc.) with computed values.
- Verify Storm+Pusher worked example: does a plausible Storm answer-set actually produce Stability-low + Resistance-low? (If not, the polarity tables need adjustment before, not after, launch — this is the single most important pre-launch validation of this spec.)

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
