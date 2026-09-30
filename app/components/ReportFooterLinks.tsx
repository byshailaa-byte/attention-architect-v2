import { ENTITY } from "@/lib/entity";

// Extracted from the report footer (simplified-v1/client.tsx). Same markup and styles;
// adds a Contact link. Shared so the report and the funnel pages render one legal-links row.
const NAVY = "#14284D";

export default function ReportFooterLinks() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", justifyContent: "center", font: "400 14px/1.5 ‘Instrument Sans’,sans-serif" }}>
      <a href="/privacy" style={{ color: NAVY, textDecoration: "none" }}>Privacy Policy</a>
      <a href="/terms" style={{ color: NAVY, textDecoration: "none" }}>Terms of Service</a>
      <a href="/contact" style={{ color: NAVY, textDecoration: "none" }}>Contact</a>
      <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: NAVY, textDecoration: "none" }}>{ENTITY.supportEmail}</a>
    </div>
  );
}
