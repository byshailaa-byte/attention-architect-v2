import SiteFooter from "@/app/components/SiteFooter";
import { ENTITY } from "@/lib/entity";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

export default function ContactPage() {
  return (
    <>
      <main style={{ background: "var(--paper)", padding: "72px 0" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", color: "var(--ink)", marginBottom: "8px" }}>
            Contact
          </h1>

          <Section title="Get in touch">
            <p style={p}>Entity: {ENTITY.legalName}</p>
            <p style={p}>
              Email:{" "}
              <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: "var(--calm-text)" }}>{ENTITY.supportEmail}</a>
            </p>
            <p style={p}>
              WhatsApp:{" "}
              <a href={`https://wa.me/91${ENTITY.phone}`} target="_blank" rel="noopener" style={{ color: "var(--calm-text)" }}>{ENTITY.phoneDisplay}</a>
            </p>
            <p style={p}>Address: {ENTITY.address}</p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const BG2 = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";
  return (
    <div>
      <h2
        style={{ fontFamily: BG2, fontWeight: 700, fontSize: "19px", color: "var(--ink)", margin: "32px 0 12px" }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  );
}

const p: React.CSSProperties = { fontSize: "15px", lineHeight: 1.75, color: "var(--ink-dim)", marginBottom: "12px" };
