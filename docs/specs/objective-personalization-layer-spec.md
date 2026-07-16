# Stated-Objective Personalization Layer
## Spec v2 — corrected against the real product screens, expanded with two new high-leverage fields

---

## 1. What changed from v1 of this spec

- **Capture location moved:** the primary "what concerns you" signal already exists in the real product as a post-assessment multi-select (Focus/Screens/Confidence/Emotions/School/Potential) — this replaces my originally-proposed landing-page checklist reuse. It's moving **earlier**, to the landing page, alongside the age chip — captured even for parents who abandon mid-assessment.
- **Two new fields added, both locked in:** "What have you already tried?" and "What would better look like?" — see §5 and §6.
- **Screens consolidated:** the old 2-screen post-assessment flow (gender + concerns → name/phone/city/email/age) becomes **one screen**: gender (optional) + tried (optional) + better (optional) + name (required) + email (required). Phone and city move to checkout. Age is dropped entirely (already captured on the landing page).
- **Multi-select resolution rule (applies to concerns, tried, and better):** join up to 2 selections grammatically. No new content per pair — a 1-item and a 2-item sentence template per field, reusing the same phrase set.

---

## 2. Where each field lives now

| Field | Location | Required? |
|---|---|---|
| Age | Landing page (age chips) | Yes |
| What concerns you most | Landing page (chip row next to age) | No |
| Child's gender | Post-assessment screen | No |
| What have you already tried | Post-assessment screen | No |
| What would better look like | Post-assessment screen | No |
| Parent's name | Post-assessment screen | **Yes** |
| Email | Post-assessment screen | **Yes** |
| Phone, City | Checkout (purchase flow only) | Yes, at that point |

**None of this touches scoring.** Not `attention_shape`, not `reward_driver`, not any of the 6 dimensions, not the archetype, not the parent pattern. All of it is content-selection and CRM metadata.

---

## 3. Corrected objective taxonomy (replaces my originally-invented set)

| Category | Phrase (used in templates) |
|---|---|
| Focus | why focus comes and goes |
| Screens | the screen time battles |
| Confidence | how much he compares himself to others |
| Emotions | his emotional ups and downs |
| School | how he's doing day-to-day at school |
| Potential | why he's not living up to what he's capable of |

**Join template (1 item):** "You told us {phrase} was the thing bothering you most."
**Join template (2 items):** "You told us {phraseA} and {phraseB} were on your mind most."

---

## 4. The 8 archetype-flavor phrases (unchanged, reused across all templates in this spec)

| Archetype | Flavor phrase |
|---|---|
| The All-In Kid | the depth he needs, not a lack of it |
| The Inventor | whether it felt like his own idea |
| The Explorer | how many directions are pulling at him at once |
| The Magnet | who he's doing it with, not what he's doing |
| The Glue | whether the people around it feel connected to him |
| The Captain | whether he gets to lead it, not just do it |
| The Live Wire | how much real stimulation the moment offers |
| The Storm | whether it's his choice, and it matters right now |

---

## 5. NEW — "What have you already tried?"

**Job:** validate real effort, then redirect — reuses the archetype-flavor phrases already written in §4, no new cross-content needed.

**Options (multi-select, post-assessment screen):**
- Screen time limits / app blockers
- Taking the device away
- More tuition / extra classes
- Talking it through with him
- Rewards or consequences
- Nothing yet — this is new territory

**Template (Section 4, opening line):**
> "You've already tried {tried_phrase}. That's a reasonable thing to try — it just doesn't touch the real driver: {flavor_phrase}."

Deliberately method-agnostic in its second half — works for any tried_phrase without needing 48 hand-written combinations, and stays inside the "validate the attempt, don't call it foolish" tone the whole report is built on.

---

## 6. NEW — "What would better actually look like?"

**Job:** personalize the *hope*, not just the *diagnosis* — this is the highest-leverage addition, since Sections 6–7 are currently the least personalized sections relative to their emotional importance.

**Options (multi-select, post-assessment screen):**
- He comes to homework without a fight
- He finishes what he starts
- Fewer meltdowns over screens
- He seems proud of something again
- Less tension between us at home
- He does better at school

**Template (Section 6, opening line, before the existing scene):**
> "You told us {better_phrase} is what you're hoping for. Here's what that could look like for {ChildName} specifically:"

Existing archetype-specific scene follows immediately after — this is a lead-in, not a replacement.

---

## 7. Parent name — four placements, deliberately not more

Scattering the name everywhere reads as a mail-merge and erodes trust rather than building it. Locked to exactly four beats, each a genuine emotional turn:

1. **Section 1, opening line** — combines with the objective callback: *"{ParentName}, you told us {objective_phrase}..."*
2. **Section 3, before the quotes** — *"{ParentName}, does this sound familiar?"*
3. **Section 3, the fit-reveal** — *"{ParentName}, here's the fit between you two:"*
4. **Section 8, opening the recap** — *"{ParentName} — {Child}: The Storm. You: The Pusher."*

Sections 2, 4 (aside from the new tried-callback), 5, 6, 7 stay name-free.

---

## 8. Fallback behavior — REQUIRED, applies to §3, §5, §6

> **🔴 This section was missing from the v2 rewrite of this spec.** v1 had equivalent language; it was dropped while fixing the taxonomy and adding tried/better, and nobody caught the gap until a real render showed `[[MISSING: objective.missing]]`, `[[MISSING: tried.missing]]`, and `[[MISSING: better.missing]]` in a Storm+Pusher report. **Every parent who skips gender, tried, or better — all three are explicitly optional on the post-assessment screen — would have hit a visible red error marker in their free report for declining an optional question.** Corrected below; binding.

**Objective, tried, and better are all optional inputs. `TODO()` / `[[MISSING]]` must never fire on an empty optional field.** A missing marker means *"this content should exist and doesn't yet."* It must never mean *"this parent chose not to answer."* Those are different failure modes and the renderer must treat them differently.

**Required behavior per field, when the parent provided no data:**

- **Objective missing (Section 1):** drop the entire opening two-sentence callback. Section 1 begins directly at the paradox/hook line for that archetype. No "you told us..." sentence appears.
- **Tried missing (Section 4):** drop the opening "you've already tried X" sentence entirely. Section 4 opens directly at `[SHARED]` *"Attention doesn't grow from pressure..."*
- **Better missing (Section 6):** drop the "you told us X is what you're hoping for" line. Section 6 opens directly at the archetype's `future_scene`, unintroduced.

**In every case: the fallback is silent omission, not a generic placeholder sentence.** Do not render "You told us this was on your mind" with nothing filled in — that reads as broken, not graceful. The section simply starts one line later than it would for a parent who did answer.

**This is a rendering rule, not a content rule** — it requires no new authored phrases. It needs the renderer to check for empty/absent objective, tried, and better data *before* attempting a token fill, and route to the shorter opening when absent. Implement in the section-assembly layer, not in content files.

**Gender follows the same principle** wherever it affects pronoun selection: absent gender resolves to an already-decided neutral default, never a missing-pronoun marker.

---

## 9. Content cost summary

- Objective taxonomy: 6 phrases (corrected from my original invented set)
- Archetype flavor: 8 phrases (already written, reused three times now — objective template, tried template, and available for future reuse)
- Tried taxonomy: 6 phrases
- Better taxonomy: 6 phrases
- **Total new writing: 18 short phrases, producing hundreds of coherent combinations across 3 templates and 4 name placements.**

