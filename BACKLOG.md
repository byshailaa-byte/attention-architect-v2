# Backlog

Items logged here are real follow-ups, not conversation ephemera. Work them in priority order.

---

## UX

### Replace `alert()` with inline error on pricing page
**File:** `app/report/[sessionId]/PriceCards.tsx` — `openModal()`, lines ~90–94  
**What:** When `/api/checkout/order` returns a non-OK response, the current code calls `alert(error)`. The user clicks OK and is back on the pricing page with no inline feedback and no next action.  
**Why:** `alert()` is a dead end. The correct pattern is an inline error state below the buy button — same pattern used on the login and set-password pages.  
**Notes:** The null-email 400 (added 2026-07-26) is the most likely trigger if ever hit. The path is structurally near-unreachable through normal navigation (the report gate enforces email before checkout is accessible), but the UX should be correct regardless.

---

## QA

### Confirm valid-email checkout path end-to-end on production
**What:** Run one real (or internal test) checkout all the way through — report gate → pricing card → Razorpay modal → payment → webhook → set-password email received → LMS access.  
**Why:** The null-email guard changes (`checkout/order` + `capturePayment`) were verified locally against staging, but staging's missing Razorpay keys meant the normal path only reached a 503. The fix is structurally sound but hasn't been exercised through a live payment on the new code.  
**When:** No need to force a special test run. Confirm opportunistically the next time a real or internal test purchase happens on production.
