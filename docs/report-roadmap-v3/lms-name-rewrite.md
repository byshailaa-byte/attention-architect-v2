# LMS pattern-name rewrite (decision 2)

**Goal:** no parent-facing LMS string contains an archetype name (Storm, Explorer, Captain, Inventor,
All-In Kid, Live Wire, Magnet, Glue). Internal keys and admin views keep them.

## Approach — one scripted pass, archetype-aware, then review
- A per-file transform (each file's archetype is known from its name) replaced every parent-facing
  occurrence with the approved plain pattern line / a name-free noun, keeping pronoun tokens:
  - identity sentence → the approved pattern line, e.g. `**Your child is a Storm.**` →
    `**{{child_name}} focuses best when {{child_pronoun_subj}} has a real say in what happens.**`
  - `a/an <Name>` (child-as-type) → `a child like {{child_name}}`
  - `your/the <Name>` → `{{child_name}}`; `<Name>'s` → `{{child_name}}'s`
  - `most <Name> households` → `most households like yours`
  - `a 14-year-old <Name>` / `10–11 <Name>` → `a 14-year-old like {{child_name}}` / `a 10–11-year-old like {{child_name}}`
- Comment lines, the `archetype:` field, and the `SAY_BY_ARCHETYPE` object keys were skipped
  (internal, allowed).
- The transform's line filter also skipped markdown-bold (`**…**`) lines; the 5 names those left
  (all in week-1/storm.ts) were fixed by hand at the approved wording.
- A second polish pass turned grammar-awkward leftovers (`a younger {{child_name}}`,
  `a teen {{child_name}}`, `middle-band {{child_name}}`) into plain nouns (`a younger child`,
  `a teenager`, `middle-band child`) — the age word already carries the meaning.

## Scope
- **19 files** changed, **77 insertions / 77 deletions**.
- **89 parent-facing archetype names rewritten** + 24 follow-on grammar polishes.
- **1 occurrence left intentionally:** `content/lms/week-1/captain.ts:7` — a code **comment**
  ("adapted from Storm's pattern"), not parent-facing.

| file | names rewritten |
|---|---|
| week-1/storm.ts | 15 |
| week-1/captain.ts | 12 |
| week-1/glue.ts | 9 |
| week-1/magnet.ts | 8 |
| week-1/inventor.ts | 7 |
| week-1/all-in-kid.ts | 6 |
| week-1/explorer.ts | 4 |
| week-1/live-wire.ts | 4 |
| week-2/captain.ts | 8 |
| week-2/glue.ts | 3 |
| week-2/magnet.ts | 2 |
| week-3/storm.ts | 4 |
| week-3/{all-in-kid,captain,explorer,glue,inventor,live-wire,magnet}.ts | 1 each (7) |
| **total** | **89** |

## Guard test
`__tests__/lms-no-pattern-names.test.ts` — scans every string leaf of all 8 archetypes × weeks 1–6
(excluding the internal `archetype` field) plus the `SAY_BY_ARCHETYPE` phrase values, and fails on any
archetype name. **50 assertions, all pass.** tsc clean.

## 10 before → after samples

1. **week-1/storm.ts (identity → pattern line)**
   - `**Your child is a Storm.** Their attention is real and powerful…`
   - `**{{child_name}} focuses best when {{child_pronoun_subj}} has a real say in what happens.** Their attention is real and powerful…`

2. **week-1/storm.ts (households)**
   - `For most Storm households, it's not the middle of homework…`
   - `For most households like yours, it's not the middle of homework…`

3. **week-1/storm.ts (mid-sentence noun)**
   - `For a Storm, ownership is the on-switch.`
   - `For a child like {{child_name}}, ownership is the on-switch.`

4. **week-1/storm.ts ("pattern doesn't change" sentence — hand-rewritten)**
   - `Your Storm will still be a Storm on Sunday.`
   - `The way {{child_pronoun_subj}} focuses won't have changed by Sunday.`

5. **week-1/storm.ts (band + age)**
   - `A 10–11 Storm learns ownership is real by being allowed to own an imperfect plan…`
   - `A 10–11-year-old like {{child_name}} learns ownership is real by being allowed to own an imperfect plan…`

6. **week-1/captain.ts (identity)**
   - `The Captain is built for ownership.`
   - `{{child_name|cap}} is built for ownership.`

7. **week-1/magnet.ts (possessive/noun)**
   - `For the Magnet, presence is not supervision — it's a resource.`
   - `For {{child_name}}, presence is not supervision — it's a resource.`

8. **week-1/live-wire.ts (possessive)**
   - `A Live Wire's attention switches on for what's live…`
   - `{{child_name}}'s attention switches on for what's live…`

9. **week-1/explorer.ts (age-band adjective → plain noun)**
   - `For a younger Explorer, keep the channel physical and simple.`
   - `For a younger child, keep the channel physical and simple.`

10. **week-3/captain.ts (week intro)**
    - `a Captain thrives on real ownership, not the appearance of it.`
    - `a child like {{child_name}} thrives on real ownership, not the appearance of it.`

## Known minor stylistic artifact (for your review)
In week-1/captain.ts one sentence repeats the replacement three times
("a child like {{child_name}} following orders is a child like {{child_name}} with the engine off").
Grammatically correct and name-free, but a touch repetitive — a candidate for a human polish if you want
it. Flagged, not changed, to keep the pass mechanical and reviewable.
