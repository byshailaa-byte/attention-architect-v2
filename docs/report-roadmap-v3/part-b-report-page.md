# Part B — Report + Roadmap v3 page (dev only, same branch)

v3 is the default render at `/report/[sessionId]`. 6 swipe cards then one scroll, all from the approved
copy bank (`lib/report-v3/copy.ts`), matching `docs/mockups/Report-Roadmap-v3-6-cards.png`. `tsc` clean,
272 tests pass, nothing pushed/prod.

## What's built
- **Facts loader** `lib/report-v3/facts.ts` — archetype key / worry key / gender / name / age band from
  the assessment; the ONE generated bit, **tonight's step (Card 5)**, still comes from `report_v2`
  (cache, else `fallbackContentFor`). `tonightSource` marks llm vs fallback.
- **Page** `app/report/[sessionId]/ReportV3.tsx` + `ReportV3Server.tsx`:
  - 6 cards: progress bar, `N of 6`, **Skip to the plan ↓**, swipe (touch) + keyboard (←/→), desktop
    centered max 480px. Card copy from CARD1–CARD6; pattern line / strength / stuck / pull / today→toward
    keyed by archetype + worry. **No pattern names, no scores/tiers.**
  - Card 5 "Try this tonight": the tonight step (report_v2), **Worked / Partly / Didn't work** (same
    labels as the LMS). The tap is stored (`/api/report-v3/tonight`, DB-only) and **pre-generates
    nothing** — the plan hasn't started — only the reply line shows.
  - One scroll: ladder (rung 1 "Starts tonight"), 6 weeks with **Week 1 open showing the REAL LMS
    day-by-day for this child's pattern + age** (the rewritten name-free content, incl. the **Day-1
    observation**: Calm · Some pushback · Big fight), support strip, the two plans (₹2,999 / ₹4,999 from
    config), the 8 existing testimonials verbatim, FAQ (incl. real refund terms), final CTA.
  - **Pronouns from `child_gender`** everywhere (they/them when null — verified on the Inventor/null shots).
  - Promises only what's live: "Tomorrow adjusts" (Part A) and Coach updates.

## Part D link routing (included in stage B)
`app/report/[sessionId]/page.tsx`: **v3 is the default for every report link.** The old UI (v2 /
narrative / gated / simplified) is reachable ONLY by an operator (`aa_internal=1` cookie) at
`?report=legacy`. Parents can't reach it by URL. (Keep 2 weeks after deploy, then remove.)

**Runtime link check (dev):**
| URL | result |
|---|---|
| `/report/<id>` | PASS — v3 |
| `?report=v1` | PASS — v3 (old opt-in no longer works for parents) |
| `?report=v2` | PASS — v3 |
| `?report=narrative` | PASS — v3 |
| `?report=legacy` (parent, no cookie) | PASS — v3 (can't reach old) |
| `?report=legacy` + `aa_internal=1` (operator) | PASS — OLD UI |
| operator, no param | PASS — v3 default |
| bad UUID | PASS — "Report not found" |

## Screenshots (`v3-shots/`, 390px, phone)
Per profile: `card1…card6.png`, `week1.png` (readable Week-1 day-by-day), `plans.png`, `scroll.png`
(full page). Profiles: **storm × screens × boy**, **captain × reminders × girl**,
**inventor × giveup × null** (they/them), **magnet × finish × boy (tonight step fell back)**.
Plus `DESKTOP-1440-storm.png` (1440px desktop).

## Migration (dev only)
`migrations/phase_82_report_v3_tonight.sql` — `report_tonight_tap` (Card-5 tap, DB-only). Applied to dev
`ep-wild-paper-aqlx0vrm`. The broader v3 DB-only events (card_view/dwell/skip/plan_section) + admin
labels are **stage D**, per your note.

## Not done this turn — plainly (per your sequencing: B first, then C, then D)
- **Part C** (call-script reads v3 facts instead of report_v2; keep report_v2 only for the tonight step;
  re-run the 10-script fallback test) — next.
- **Part D** remainder (the DB-only tracking events, admin timeline labels, GA/Meta parity) — next.
  (Link routing + the legacy flag are DONE here.)
- **Lighthouse mobile + JS bundle vs old** — deferred to the C/D turn (better measured once B/C/D are all
  in and built). Per your note I'll run it against the **Vercel Preview** of this branch if local
  `next build` is flaky, and compare to the current prod report page; if the build fails I'll say so.
- One cosmetic: the "N" circle in the shots is the Next.js **dev-mode** indicator — it's not in a build.
