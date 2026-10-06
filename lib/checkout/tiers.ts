// The only two plans that can be sold today. Legacy tiers (module1 ₹499 / full ₹999 / topup) are
// still READ elsewhere so existing buyers keep full LMS access, but a new order can never use them.
export const SELLABLE_TIERS = ["tier1", "tier2"] as const;

export function isSellableTier(tier: string): boolean {
  return (SELLABLE_TIERS as readonly string[]).includes(tier);
}
