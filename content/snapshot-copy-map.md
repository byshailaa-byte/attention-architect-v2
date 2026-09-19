# Snapshot §2 — per-value content map

20 values across four dimensions. Every value has an **answer line** (the row heading —
what this child does) and an **insight line** (one sentence, what it means for this
parent).

**Rule applied throughout:** no insight line refers to how common or rare the answer is.
Frequency is computed at render time and will drift; the rarity tag carries that, the
copy never does.

Answer lines are in finding register — they complete "This child…". None is a question.

---

## attention_shape — "How they focus"

**Generic fallback:** "How they get into something, and what keeps them there."

| Value | Answer line | Insight line |
|---|---|---|
| `narrow-deep` | Goes deep into one thing, and stays there | Which is why shorter tasks and more breaks tend to backfire — that advice is written for a different way in. |
| `wide-shifting` | Moves between a few related things at once | The moving isn't losing focus, it's how the focus is held — forcing one thing at a time removes the method. |
| `social-anchored` | Focuses best with someone else nearby | Sending them off to work alone removes the condition they need — it's presence they're after, not help. |
| `sensation-seeking` | Goes toward whatever's most alive in the room | Interest isn't the problem; a calm, quiet setup reads to them as nothing happening. |

---

## attention_competition — "What breaks their focus"

**Generic fallback:** "What pulls them away once they've started."

| Value | Answer line | Insight line |
|---|---|---|
| `novelty` | A new idea arriving mid-task | The interruption comes from inside, so removing distractions doesn't reach it — the idea needs somewhere to go. |
| `external` | Noise, movement, or someone nearby | The one kind where changing the room genuinely helps — for most of the others it doesn't. |
| `internal` | The moment it stops being interesting | It stops from the inside, so a quieter room doesn't reach it. This is the one most often misread as not trying. |
| `social` | Whatever's happening with the people nearby | People are the pull, so isolating them to work usually makes it stronger rather than weaker. |
| `genuine-interest` | Real interest in something else — not avoidance | They're not escaping the work, they're choosing something they actually want. That's a harder thing to compete with, and a better one. |
| `task-escape` | Something harder they'd rather not start | The screen isn't the draw — the task is the push. What needs changing is the way in, not the screen. |
| `boredom-avoidance` | Boredom, with a gap to fill | Nothing is competing for them, which is easier than it sounds — the work has no rival, it just has no pull yet. |

---

## friction_response — "When it gets hard"

**Generic fallback:** "What happens in the first few minutes of something hard."

| Value | Answer line | Insight line |
|---|---|---|
| `avoid` | Goes quiet, and steps back before anyone notices | You usually find out afterwards rather than during — the hard part is that it looks like nothing happening. |
| `solo-push` | Pushes on alone rather than asking | Help offered mid-struggle can land as an interruption, so timing matters more than being available. |
| `support-seek` | Comes and finds you | They tell you when it's hard, which not every child does — the risk here is answering too fast. |
| `emotional-derail` | Gets upset before the trying starts | The difficulty is being anticipated, not met, so what needs changing sits before the task rather than inside it. |
| `energized` | Hard things energize rather than drain | Easy work is the risk here, not hard work — under-pitching loses them faster than difficulty does. |

---

## recharge_type — "How they recharge"

**Generic fallback:** "What they need after a demanding day."

| Value | Answer line | Insight line |
|---|---|---|
| `sensory-quiet` | Quiet, alone, with less coming at them | The hour after school isn't spare time — it's what makes the evening possible. |
| `social-connection` | Time with people they trust | Quiet time alone reads as rest to you, but for them it isn't recovery. |
| `cognitive-displacement` | Something absorbing enough to switch off | Which is why the screen after school is hard to argue with — it's doing a real job, and replacing it needs something equally absorbing. |
| `autonomous-unstructured` | Time that's theirs, with nothing asked | A preference rather than a problem — the plan works around this one rather than on it. |

---

## Section copy

- **Kicker:** ATTENTION HEALTH SNAPSHOT
- **Heading:** Four things we looked at
- **Lede:** And what each one means once you compare it with other parents who've taken this.
- **Footer:** none.

---

## Notes for implementation

- `boredom-avoidance` has zero production sessions. Its content exists so the section
  never falls to a generic line when the first parent picks it. It will carry no rarity
  tag until it has counts.
- Insight lines are per value only. They do not vary by rarity tier, by archetype, or by
  child name. No pronoun tokens — the lines are written to avoid needing them.
- Answer lines must never render with a trailing full stop; insight lines always do.
