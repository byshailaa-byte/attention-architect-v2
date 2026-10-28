import "server-only";
// Single source of truth for prices: read from the live plan-page config, NOT re-typed here.
// PRICE_TIER1 / PRICE_TIER2 are defined in lib/report-v2/v3-copy.ts (lines 431 & 441).
import { PRICE_TIER1, PRICE_TIER2 } from "@/lib/report-v2/v3-copy";

export const PRICING_FACTS = {
  planOnly: PRICE_TIER1.price,          // "₹2,999"  (v3-copy.ts:443)
  planWithCalls: PRICE_TIER2.price,     // "₹4,999"  (v3-copy.ts:434)
  addCallsLater: "₹2,000",              // from PRICE_TIER1.body "Add calls later for ₹2,000." (v3-copy.ts:444)
  perDayOnly: PRICE_TIER1.perDay,       // "One time · about ₹71 a day"
  perDayWithCalls: PRICE_TIER2.perDay,  // "One time · about ₹119 a day"
  refund: "7-day full refund — full money back",
} as const;

// The ONLY rupee amounts a script may say (digits only), derived from the config above. The validator
// rejects any other number. Built from the prices so it stays in sync if the config changes.
const digitsOf = (s: string) => (s.match(/[\d,]+/g) ?? []).map((x) => x.replace(/,+$/, ""));
export const ALLOWED_AMOUNTS = Array.from(new Set([
  ...digitsOf(PRICE_TIER1.price), ...digitsOf(PRICE_TIER2.price), "2,000",
  ...digitsOf(PRICE_TIER1.perDay), ...digitsOf(PRICE_TIER2.perDay), // 71, 119
]));

export function pricingPromptBlock(trialEligible: boolean): string {
  return [
    "ALLOWED COMMERCIAL FACTS — use ONLY these, invent nothing:",
    "- The plan is a ONE-TIME payment, not a subscription.",
    `- ${PRICING_FACTS.planOnly} = the 6-week plan on its own (${PRICING_FACTS.perDayOnly}).`,
    `- ${PRICING_FACTS.planWithCalls} = the plan WITH guided calls (${PRICING_FACTS.perDayWithCalls}). Calls can be added later for ${PRICING_FACTS.addCallsLater}.`,
    `- ${PRICING_FACTS.refund} if it isn't right for them.`,
    trialEligible
      ? "- A FREE 4-day Attention Coach trial is available for this parent (they haven't tried or bought yet)."
      : "- This parent is NOT eligible for a free trial (already trialed or bought). Do NOT mention a trial at all.",
    "- NEVER invent a discount, a deadline, or say things like \"only this week\", \"hurry\", \"limited\", \"last chance\". No pressure.",
  ].join("\n");
}
