// Shared tokens for the rebuilt /lms-v2 experience. Colours, fonts and spacing
// come straight from the approved mockups (~/astra-kb/lms-mockup).
export const V2 = {
  navy: "#1E3A5F",
  navyLt: "#2C4A70",
  cream: "#FDF8F0",
  gold: "#E8A33D",
  darkGold: "#8A6322",
  white: "#FFFFFF",
  line: "#EDE7DB",
  line2: "#E3DCCD",
  ink: "#2E3A4B",
  dim: "#5B6577",
  dim2: "#6B6552",
  onNavy: "#C9D6E6",
  onNavySoft: "#D6E0EC",
  greyCard: "#F4EFE5",
  tintBlue: "#E8EEF5",
  tintGold: "#FBF0E2",
  tintGreen: "#EAF0EA",
  tintPurple: "#EFEAF5",
  green: "#2F5D3A",
  greenInk: "#1F4A2A",
} as const;

export const HEAD = "'Newsreader', Georgia, serif";
export const BODY = "'Figtree', system-ui, sans-serif";

export const OUTCOMES: { value: "worked" | "mixed" | "didnt_land"; label: string }[] = [
  { value: "worked", label: "Worked" },
  { value: "mixed", label: "Mixed" },
  { value: "didnt_land", label: "Didn't land" },
];

export const OUTCOME_LABEL: Record<string, string> = {
  worked: "Worked",
  mixed: "Mixed",
  didnt_land: "Didn't land",
};
