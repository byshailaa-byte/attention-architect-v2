// Single source of truth for the legal entity behind the Attention Architect brand.
// Attention Architect is a brand of CAPSDEV GURUKUL.
//
// Deliberately NOT here: the domain, base URLs, RESEND_FROM, and any navigation
// or report links. The domain migration is separate — do not add those here.
export const ENTITY = {
  legalName: "CAPSDEV GURUKUL",
  // Standard footer / brand-attribution line.
  brandLine: "Attention Architect is a brand of CAPSDEV GURUKUL.",
  proprietor: "Smt. Shashi Agrawal",
  registrationAct: "MP Shops and Establishments Act",
  registrationNumber: "INDO230603SE001303",
  address: "E-2602, Sudama Nagar, Indore, Madhya Pradesh",
  supportEmail: "support@capsdevgurukul.in",
  // Phone is unchanged by the entity rename.
  phone: "9993374923",
  phoneDisplay: "+91 99933 74923",
  copyright: "© 2026 CAPSDEV GURUKUL. All rights reserved.",
} as const;
