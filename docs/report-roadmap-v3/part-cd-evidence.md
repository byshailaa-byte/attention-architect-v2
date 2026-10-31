# Parts C + D + Part-B fixes — evidence (dev only, same branch)

`tsc` clean, **282 tests pass**, nothing pushed/prod.

## Part B — your 10 review fixes
1. **Card 6 Coach chat uses the child's pronoun** — copy.ts chat tokenised (`{He}`, `{s:was|were}`).
   Null → "They threw…/They were…", boy → "He threw…", girl → "She…". (shot: inventor-null card6.)
2. **Card 5 fallback** — quotes normalised (single-wrap) and the notice is the step's own specific
   worry-notice, never a fragment. (shot: magnet-FALLBACK card5 → "Whether he gets a little further
   before drifting.")
3. **"★ Matters most for {Name}"** on the child's two focus weeks (existing weakest-two → week map) in
   BOTH the ladder and the week cards.
4. **Ladder reads as a climb** — rising staircase (week 1 at the bottom), "Starts tonight" on 1.
5. **Week-1 preview pronouns** — the literal `them/they/their` in the LMS title + teaser are gendered
   from `child_gender` (boy → him/he; null → they). Verified in HTML: boy shows "Let him pick…".
6. **No internal references** — "from the weekly read" / "(or your own, at the same level)" removed.
7. **Truncation** cuts at a sentence end, else the last word boundary — never mid-word ("a bette…").
8. **Cards vertically centred** with a sensible min-height — no large empty block (Card 1 fills the
   navy card with content centred).
9. **Testimonial labels** lower-case "son/daughter" mid-sentence; quotes stay verbatim.
10. **Re-shot** all 4 profiles + desktop (card1–6, ladder-weeks, week1, testimonials, scroll).

## Part C — call-script reads v3 facts
`lib/report-v3/facts.ts` `buildV3CallFacts` → pattern line / strength / stuck / pull / today→toward /
tonight step (still from report_v2) + the Card-5 tap. `lib/call-script/generate.ts` DATA block +
deterministic fallback now read these; `app/api/admin/parents/script/route.ts` builds them. report_v2 is
consulted ONLY for tonight's step (its judge is unchanged).
**10-script re-run (dev, via the route):** `0/10 fallbacks` (target ≤1), all within word budget,
~₹1.00–2.14 each (total ≈ ₹11.95). Full run in `part-cd-10script.txt`.

## Part D — tracking + timeline + GA/Meta parity
- **DB-only events** (not in the analytics catalog → never GA/Meta): `report_v3_card_view {card}`,
  `card_dwell_ms {card, ms}` (capped at 60 s), `skip_to_plan {from_card}`, `tonight_outcome {outcome}`,
  `plan_section_view {section}` (IntersectionObserver). No child data in any.
- **GA/Meta parity** — the client fires `report_view {variant:"v3"}` (GA4 only, same as the old report's
  ReportViewTracker), carrying NO child data. The server still writes the `report_view` funnel row.
- **Admin timeline labels** (`lib/admin/parents/timeline.ts`): "Read report · cards 1–N of 6",
  **"Card 5 · tapped Didn't work"**, "Skipped to the plan · from Card N", "Scrolled the plan · <sections>".

## Perf — stated plainly
- **Local `next build` SUCCEEDS** (exit 0, clean). So Vercel will build this branch. One pre-existing
  Turbopack "dynamic require" warning (`lib/founders.ts` / `ReportView.tsx`) — unrelated to v3, non-blocking.
- **Lighthouse mobile: not produced this turn.** No Lighthouse CLI is installed locally, and a Vercel
  Preview needs a branch push — which you asked me to STOP before. → Deferred to the deploy: run
  Lighthouse against the Preview URL and the current prod report page then.
- **JS bundle v3 vs old: not a clean number this turn.** Turbopack's build output doesn't emit the
  per-route First-Load-JS table, and the old report (ReportV2 + narrative) is still bundled on the same
  route behind the operator-only legacy flag — so `/report/[sessionId]` temporarily carries BOTH until
  the legacy UI is removed (2 weeks post-deploy). Whole-app client JS ≈ 2.1 MB. A precise v3-vs-old delta
  needs the Preview build's analyzer at deploy.

## Migrations (dev only, this whole effort)
`phase_80` (adaptive plan), `phase_81` (Day-1 observation), `phase_82` (report_v3 tonight tap). The
broader v3 DB-only events use `funnel_events` (no new table).

## Not done / flags
- Perf (Lighthouse + bundle delta) — blocked locally as above; needs the Preview at deploy.
- One cosmetic: the "N" circle in the shots is the Next.js dev indicator — gone in the build.
