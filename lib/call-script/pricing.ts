import "server-only";
// The ONLY commercial facts a script may use (sourced from lib/report-v2/v3-copy.ts — the live plan
// page). No compare-at "discounts", no deadlines, no pressure. If it isn't here, the script must not
// say it. The validator enforces this.
export const PRICING_FACTS = {
  planOnly: "₹2,999",
  planWithCalls: "₹4,999",
  addCallsLater: "₹2,000",
  perDayOnly: "about ₹71 a day",
  perDayWithCalls: "about ₹119 a day",
  refund: "7-day full refund — full money back",
} as const;

// Allowed rupee amounts, so the validator can reject any invented number.
export const ALLOWED_AMOUNTS = ["2,999", "4,999", "2,000", "71", "119"];

export function pricingPromptBlock(trialEligible: boolean): string {
  return [
    "ALLOWED COMMERCIAL FACTS — use ONLY these, invent nothing:",
    "- The plan is a ONE-TIME payment, not a subscription.",
    `- ${PRICING_FACTS.planOnly} = the 6-week plan on its own (${PRICING_FACTS.perDayOnly}).`,
    `- ${PRICING_FACTS.planWithCalls} = the plan WITH guided calls (${PRICING_FACTS.perDayWithCalls}). Calls can be added later for ${PRICING_FACTS.addCallsLater}.`,
    `- ${PRICING_FACTS.refund} if it isn't right for them.`,
    trialEligible
      ? "- A FREE 4-day Attention Coach trial is available for this parent (they haven't tried or bought yet)."
      : "- Do NOT offer a free trial (this parent has already trialed or bought).",
    "- NEVER invent a discount, a deadline, or say things like \"only this week\", \"hurry\", \"limited\", \"last chance\". No pressure.",
  ].join("\n");
}
