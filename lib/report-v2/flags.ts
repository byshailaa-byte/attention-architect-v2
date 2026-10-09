// Report v3 build-time flags.
//
// SHOW_COMPARE_AT controls the strikethrough compare-at prices on the plan page's price cards
// (PRICE_COMPARE_AT in v3-copy.ts). Per the spec's OPEN DECISION (aa-report-redesign-content.md
// §155): ₹2,999 and ₹4,999 have NEVER been charged at a higher price — the struck ₹4,999 /
// ₹7,999 would be anchors, not earlier prices. Until that is decided, build the price cards
// WITHOUT strikethrough. Flip this one constant to true to switch the strikethrough on.
export const SHOW_COMPARE_AT = false;
