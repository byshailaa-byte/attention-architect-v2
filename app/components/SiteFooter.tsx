import Link from "next/link";
import { ENTITY } from "@/lib/entity";

export default function SiteFooter() {
  return (
    <footer style={{ background: "var(--ink)", color: "#9c9aa8", padding: "56px 0 36px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "32px",
          paddingBottom: "32px",
          borderBottom: "1px solid rgba(255,255,255,.1)",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "#fff", borderRadius: 10, padding: "8px 16px",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-horizontal-icon-wordmark.png"
              alt="Attention Architect"
              style={{ height: 36, width: "auto", display: "block" }}
            />
          </div>
          <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
            <Link href="/privacy" style={{ color: "#9c9aa8", textDecoration: "none", fontSize: "13.5px", fontWeight: 500 }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ color: "#9c9aa8", textDecoration: "none", fontSize: "13.5px", fontWeight: 500 }}>
              Terms of Service
            </Link>
            <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: "#9c9aa8", textDecoration: "none", fontSize: "13.5px", fontWeight: 500 }}>
              {ENTITY.supportEmail}
            </a>
            <a href={`tel:${ENTITY.phone}`} style={{ color: "#9c9aa8", textDecoration: "none", fontSize: "13.5px", fontWeight: 500 }}>
              {ENTITY.phone}
            </a>
          </div>
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          paddingTop: "24px",
          fontSize: "12px",
          color: "#5c5a68",
        }}>
          <div>
            <div>{ENTITY.brandLine}</div>
            <div>{ENTITY.copyright}</div>
          </div>
          <div>Made for parents who want to understand, not diagnose.</div>
        </div>
      </div>
    </footer>
  );
}
