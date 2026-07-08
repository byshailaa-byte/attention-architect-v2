# Attention Architect™ — Version 2 Assessment
## Complete Final Spec

---

## 1. Architecture Overview

- **Format:** 100% tap-to-select, 4 options per question. No open text, no 5th "neutral" option (removes the safe-default escape hatch that let v1 respondents avoid committing to an answer).
- **Structure:** 3 universal Gateway questions (everyone answers these) → adaptive depth into 2–3 dimensions, selected by the routing engine based on signal ambiguity from the Gateway.
- **Every dimension reaches exactly 3 data points if selected for full depth, or exactly 1 if not.** No dimension is weighted more heavily than another by accident of question design. See §4 for the anchor mechanic that makes this work.
- **Typical total length: 9–12 questions**, varying by how much ambiguity the Gateway produces for a given parent.
- **Output:** the child is classified into one of 8 Attention Types (from `attention_shape` × `reward_driver`); the parent is classified into one of 4 Instinct Patterns (from `parent_instinct` alone). The remaining 3 dimensions (`friction_response`, `attention_competition`, `recharge_type`) drive report content depth and specific guidance — **confirmed: they do not affect either label.**

---

## 2. The Six Dimensions — Reference Table

| Key | Display Name | Gateway Anchor? | Feeds |
|---|---|---|---|
| `attention_shape` | Attention Shape | Yes — G1 | Archetype label |
| `reward_driver` | What Drives Them | No | Archetype label |
| `friction_response` | How They Meet Difficulty | No | Report depth only |
| `parent_instinct` | Your Instinct Under Pressure | Yes — G3 | Parent Pattern label |
| `attention_competition` | What's Winning Right Now | Yes — G2 | Report depth only |
| `recharge_type` | How They Actually Recharge | No | Report depth only |

---

## 3. Gateway Questions (always asked, in order)

**G1** — anchors `attention_shape`
*When {name} gets completely absorbed in something, what does it usually look like?*
- Going deep into one thing, and ignoring everything else — **narrow-deep**
- Moving between a few related things at once — **wide-shifting**
- Being with or around other people, even quietly — **social-anchored**
- Whatever feels the most exciting or active — **sensation-seeking**

**G2** — anchors `attention_competition`
*What's the first thing that pulls {name} away from something they're supposed to be doing?*
- A new idea popping into their head — **novelty**
- Noise, movement, or activity nearby — **external**
- Feeling bored, frustrated, or restless — **internal**
- Other people — wanting to connect, or to get away from tension — **social**

**G3** — anchors `parent_instinct`
*When {name} is stuck or struggling, what's your first instinct?*
- Step in and help them get it done — **quick-fixer**
- Push them to keep trying on their own — **pusher**
- Talk it through and find a middle ground — **negotiator**
- Step back and let them figure it out, even if it takes a while — **steady-hand**

---

## 4. Full Question Bank, By Dimension

### `attention_shape` — anchored by G1. 2 deep questions if selected for depth (total 3 w/ G1). No confirming question needed if not selected — G1 alone is sufficient.

**D1.1** *Think about the last time {name} was completely absorbed in something — what was actually happening?*
- Getting deeper and deeper into one thing — narrow-deep
- Moving easily between 2–3 related things — wide-shifting
- Doing something with or alongside other people — social-anchored
- Chasing whatever felt most exciting in the moment — sensation-seeking

**D1.2** *If you gave {name} a big project with no deadline, what would most likely happen?*
- They'd disappear into it and lose track of time — narrow-deep
- They'd start strong, then drift off before finishing — wide-shifting
- They'd want to do it together with someone, not alone — social-anchored
- They'd start strong if it felt exciting, then need a reason to keep going — sensation-seeking

*(D1.3 from the original draft — "when {name} talks about something they love" — is retired; two deep questions plus the G1 anchor is sufficient signal and keeps this dimension consistent with the others.)*

---

### `reward_driver` — no gateway anchor. 3 deep questions if selected for depth. 1 confirming question if not.

**D2.1** *What actually makes {name} light up — not what you wish would, but what really does?*
- Figuring out something really hard — mastery
- Discovering something brand new — novelty
- Being noticed, included, or appreciated by others — social
- Having full control over what they're doing and how — autonomy

**D2.2** *When {name} finishes something hard, what matters more to them afterward?*
- Knowing they got better at something — mastery
- Moving on to the next interesting thing — novelty
- Someone noticing or being proud of them — social
- Doing it their own way — autonomy

**D2.3** *What's most likely to make {name} lose interest in something they used to love?*
- It stopped being challenging — mastery
- Something newer and more interesting showed up — novelty
- The social part of it changed or disappeared — social
- They started feeling controlled or micromanaged about it — autonomy

**D2.confirm** *What's the single biggest reason {name} sticks with something?*
- Getting better at it over time — mastery
- It staying interesting and fresh — novelty
- Doing it with people who matter to them — social
- Feeling like it's genuinely their own choice — autonomy

---

### `friction_response` — no gateway anchor. 3 deep questions if selected for depth. 1 confirming question if not.

**D3.1** *When {name} hits something really hard, what usually happens in the first few minutes?*
- They go quiet and try to avoid it if they can — avoid
- They push through alone, even if it's frustrating — solo-push
- They look for someone to help or work through it with — support-seek
- They get upset before they even start trying — emotional-derail

**D3.2** *Does hard stuff energize {name}, or drain them?*
- Mostly drains them — hard things feel heavy — avoid
- Depends — some hard things energize them, others don't — solo-push
- Depends on whether someone's there to help — support-seek
- It really energizes them — they like a real challenge — energized

**D3.3** *After a frustrating failure, what does {name} need most to try again?*
- Space and time alone, without being pushed — avoid
- Nothing — they'll go again on their own terms — solo-push
- Someone to sit with them through it — support-seek
- A reason to believe it's worth trying again — emotional-derail

**D3.confirm** *When something's hard, does {name} tend to push through, seek help, or pull back?*
- Pushes through alone — solo-push
- Seeks help or company — support-seek
- Pulls back or avoids — avoid
- Genuinely varies by situation — energized *(catch-all for the "difficulty energizes them" pattern, which doesn't fit a pull-back/push-through axis cleanly)*

---

### `parent_instinct` — anchored by G3. 2 deep questions if selected for depth (total 3 w/ G3). No confirming question needed if not selected — G3 alone is sufficient.

**P1** *When your approach with {name} isn't working, what do you usually do next?*
- Try something completely different right away — quick-fixer
- Double down on the same approach, longer — pusher
- Talk to other parents or sources for a new idea — negotiator
- Step back and wait to see if it resolves itself — steady-hand

**P2** *What's hardest for you in moments like this?*
- Staying calm when nothing seems to be working — quick-fixer
- Not solving it for them so they learn it themselves — pusher
- Being consistent when you're tired or busy — negotiator
- Trusting your approach is the right one — steady-hand

*(A third parent-reflection question from the original draft is retired for the same consistency reason as D1.3.)*

---

### `attention_competition` — anchored by G2. 2 deep questions if selected for depth (total 3 w/ G2). No confirming question needed if not selected — G2 alone is sufficient.

**D5.1** *When {name} chooses a screen over something else, what's it usually replacing?*
- Boredom — there wasn't anything else pulling them — boredom-avoidance
- A harder task they'd rather avoid — task-escape
- Time with friends they can't otherwise get — social
- Genuine excitement about a specific game or show — genuine-interest

**D5.2** *What does {name} get from screens that real life isn't currently giving them?*
- Constant, immediate feedback and reward — boredom-avoidance
- A break from things feeling hard or slow — task-escape
- Connection with friends, on their terms — social
- Genuine novelty — something new every time — genuine-interest

*(A third question from the original draft is retired for the same consistency reason as above.)*

---

### `recharge_type` — no gateway anchor. 3 deep questions if selected for depth. 1 confirming question if not.

**D6.1** *After a really demanding day, what does {name} need to feel okay again?*
- Quiet, alone, with minimal input — sensory-quiet
- Time with people they trust — social-connection
- Something engaging to take their mind elsewhere — cognitive-displacement
- Control over their own time and choices, with no demands — autonomous-unstructured

**D6.2** *What drains {name} fastest?*
- Noise, crowds, or sensory overload — sensory-quiet
- Being alone or excluded for too long — social-connection
- Doing the same boring thing for too long — cognitive-displacement
- Being told what to do, constantly — autonomous-unstructured

**D6.3** *What does {name}'s best kind of "rest" actually look like?*
- Quiet, low-stimulation time — sensory-quiet
- Time with friends or family, relaxed — social-connection
- An absorbing distraction — a show, a game, a book — cognitive-displacement
- Free time with zero structure or expectations — autonomous-unstructured

**D6.confirm** *What recharges {name} fastest — quiet, connection, distraction, or freedom?*
- Quiet and low stimulation — sensory-quiet
- Connection with people — social-connection
- An absorbing distraction — cognitive-displacement
- Freedom from structure — autonomous-unstructured

---

## 5. Branching & Scoring Logic

**Step 1 — Gateway.** All 3 Gateway questions are answered first. This gives an initial signal for `attention_shape`, `attention_competition`, and `parent_instinct`, and no signal yet for `reward_driver`, `friction_response`, or `recharge_type`.

**Step 2 — Route to depth using the explicit decision tree below.** Deterministic, not heuristic — every Gateway answer combination resolves to a specific set of 2–3 dimensions for full depth.

### Explicit routing rules, applied in order

**Rule 1 (always fires).** `reward_driver` always gets full depth. It has zero Gateway signal and is co-equal with `attention_shape` in determining the archetype label — it cannot be left to a single confirming question. *Uses depth-slot 1 of 2–3, every time, for every respondent.*

**Rule 2 (shape cross-check).** G2's "novelty" option ("a more interesting idea occurring to them") is the one Gateway answer with a real conceptual link to a dimension other than its own anchor — novelty-chasing is definitionally closer to wide-shifting/sensation-seeking attention than to narrow-deep/social-anchored.
- **IF** G2 = novelty **AND** G1 ≠ wide-shifting → `attention_shape` gets full depth, to confirm or correct the G1 answer against this tension. *Uses depth-slot 2.*
- **ELSE** → `attention_shape` does not get additional depth; G1 stands alone.

**Rule 3 (guarantee a minimum of 2 slots).** If Rule 2 did not fire, allocate depth-slot 2 to `friction_response` by default.

**Rule 4 (optional 3rd slot — at most one of these fires, checked in order).**
- **IF** G2 = internal (boredom/frustration) → allocate slot 3 to `friction_response` if not already selected via Rule 3; otherwise allocate slot 3 to `recharge_type`.
- **ELSE IF** G2 = social → allocate slot 3 to `attention_competition` (full depth beyond the G2 anchor), to unpack this less-common competition pattern in more detail.
- **ELSE IF** G3 = quick-fixer or pusher → allocate slot 3 to `parent_instinct` (full depth beyond the G3 anchor). These two patterns carry the most report-content nuance (highest strength/risk contrast), so they benefit most from the extra confirmation.
- **ELSE** → no 3rd slot; total depth is 2 dimensions for this respondent.

> **Honest flag:** Rules 3 and 4's specific defaults and priority order are reasoned starting heuristics, not empirically derived. This is exactly the kind of parameter that should get tuned once real response data exists — same principle as the routing-vs-heuristics decision itself: explicit and logged now, so it's debuggable and revisable later, rather than buried in opaque scoring.

**Step 3 — Fill remaining dimensions.** Any dimension not selected for depth gets: nothing further if it's one of the 3 anchored dimensions (Gateway answer stands alone), or its single confirming question if it's one of the 3 unanchored dimensions.

**Step 4 — Scoring.** For each dimension, tally votes across all data points collected. The option with the most votes wins. **Tiebreak rule: if no option has a clear plurality, default to whichever answer was given on the first question asked for that dimension** — the Gateway answer for anchored dimensions, or D_x.1 for unanchored dimensions selected for full depth.

---

## 6. Archetype Derivation — 8 Attention Types

`attention_shape` (primary axis) × `reward_driver` (flavor axis):

| Attention Shape | Reward Driver | Attention Type |
|---|---|---|
| Narrow-Deep | Mastery | **The All-In Kid** |
| Narrow-Deep | Autonomy | **The Inventor** |
| Wide-Shifting | Novelty | **The Explorer** |
| Wide-Shifting | Social | **The Magnet** |
| Social-Anchored | Social | **The Glue** |
| Social-Anchored | Mastery | **The Captain** |
| Sensation-Seeking | Novelty | **The Live Wire** |
| Sensation-Seeking | Autonomy | **The Storm** |

### Fallback mapping — the 8 unused cells

**Rule: match `attention_shape` first (always possible — every shape has exactly 2 used drivers), then map to whichever of the 2 same-shape archetypes is the closer conceptual fit for the actual winning `reward_driver`.**

| Unused Combination | Maps To | Why |
|---|---|---|
| Narrow-Deep + Novelty | The Inventor | Both are intrinsic-exploration driven; novelty-seeking depth is closer to self-directed discovery than to competence-building |
| Narrow-Deep + Social | The All-In Kid | Social reward channeled through depth reads as outcome/achievement-oriented, closer to mastery than to autonomy's solitary framing |
| Wide-Shifting + Mastery | The Explorer | Both are breadth-of-content oriented; wanting to get good at *many* things is closer to novelty-seeking than to social connection |
| Wide-Shifting + Autonomy | The Explorer | Self-directed exploration on one's own terms is closer to Explorer's novelty-driven independence than to Magnet's other-directed social pull |
| Social-Anchored + Novelty | The Glue | Wanting new experiences *with* people is fundamentally relational — closer to pure connection than to mastery/leadership |
| Social-Anchored + Autonomy | The Captain | Autonomy exercised within a social context reads as leadership — closer to Captain's mastery-through-leadership than to Glue's pure connection |
| Sensation-Seeking + Mastery | The Storm | Wanting intensity *and* to get good at it pairs with self-directed control, closer to Storm's autonomy than Live Wire's novelty (constant newness undercuts mastery-building) |
| Sensation-Seeking + Social | The Live Wire | Wanting intensity *with* people is externally/socially stimulated, closer to Live Wire's novelty orientation than Storm's more solitary autonomy |

> **Honest flag:** these are reasoned, defensible judgment calls, not empirically derived — same caveat as the routing defaults above. Worth revisiting once real assessment data shows how often (if ever) respondents actually land on these cells, and whether the mapping "feels right" to real parents reading the result.

---

## 7. Parent Pattern Derivation — 4 Instinct Patterns

Direct 1:1 mapping from `parent_instinct`:

| Value | Pattern |
|---|---|
| quick-fixer | **The Quick Fixer** |
| pusher | **The Pusher** |
| negotiator | **The Negotiator** |
| steady-hand | **The Steady Hand** |

---

## 8. Report-Depth Dimensions (do not affect either label)

- **`friction_response`** — drives specific guidance on how to support the child through difficulty in the report (e.g., Section 4 / "The Real Problem")
- **`attention_competition`** — drives the specific, named explanation of what's currently outcompeting focus-worthy activities (e.g., Section 5 / "Attention Ecosystem")
- **`recharge_type`** — drives specific recovery/rest guidance

---

## 9. Decision log

All three open items from the prior draft are now resolved:

1. **Depth-only status confirmed** — `friction_response`, `attention_competition`, `recharge_type` never affect either label. (§1)
2. **Archetype fallback rule defined** — nearest-neighbor by shared `attention_shape`, then closest `reward_driver`. (§6)
3. **Routing built as an explicit decision tree**, not engine heuristics — fully specified, testable, debuggable. (§5)

This spec is implementation-ready, with two honestly-flagged exceptions: the routing priority defaults (§5, Rules 3–4) and the archetype fallback judgment calls (§6) are reasoned starting points, not empirically validated ones. Both are logged explicitly so they can be revisited once real assessment data exists — consistent with the broader plan to run this as an adaptive consumer product now and a fixed-item research instrument in parallel.
