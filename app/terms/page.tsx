import SiteFooter from "@/app/components/SiteFooter";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

export default function TermsPage() {
  return (
    <>
      <main style={{ background: "var(--paper)", padding: "72px 0" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", color: "var(--ink)", marginBottom: "8px" }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ink-dim)", marginBottom: "40px" }}>
            Last updated: [DATE — fill before launch]
          </p>

          <div style={{ background: "#FDECEA", border: "1px dashed var(--redpen)", borderRadius: "10px", padding: "16px 20px", fontSize: "13px", color: "#B8382A", marginBottom: "32px", lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: "4px" }}>🔴 Requires real legal review before production.</strong>
            Same standing note as the Privacy Policy — this covers the standard structure for a digital course/assessment product, but the specific liability limitations, governing law clause, and refund-mechanism wording should be confirmed against actual business practice and reviewed by counsel before launch.
          </div>

          <Section title="1. What This Service Is">
            <p style={p}>
              Attention Architect provides a free assessment and, for purchasers, a paid weekly course (&ldquo;Attention System&rdquo;) based on your child&rsquo;s assessment results. This is educational content designed to help parents understand and support their child&rsquo;s attention —{" "}
              <strong>it is not a medical diagnosis, psychological evaluation, or substitute for professional advice.</strong>
            </p>
          </Section>

          <Section title="2. Payment &amp; Refunds">
            <p style={p}>
              Course purchases are processed via Razorpay. We offer a 7-day guarantee: if the course isn&rsquo;t the right fit, email us within 7 days of purchase for a full refund, no questions asked.
            </p>
          </Section>

          <Section title="3. Your Responsibilities">
            <ul style={ul}>
              <li style={li}>Answer assessment questions honestly and to the best of your knowledge as the child&rsquo;s parent or guardian.</li>
              <li style={li}>Use the course content for your own family&rsquo;s purposes — not for redistribution or resale.</li>
            </ul>
          </Section>

          <Section title="4. Our Responsibilities">
            <p style={p}>
              We&rsquo;ll do our best to keep the service running and your data secure, but we don&rsquo;t guarantee uninterrupted access, and we&rsquo;re not liable for outcomes related to how you choose to apply the course content — this is guidance, not a guaranteed result.
            </p>
          </Section>

          <Section title="5. Changes to These Terms">
            <p style={p}>
              We may update these terms occasionally. Continued use of the service after changes means you accept the updated terms.
            </p>
          </Section>

          <Section title="6. Governing Law">
            <p style={p}>[Fill in — typically the jurisdiction where the business is legally registered.]</p>
          </Section>

          <Section title="7. Contact">
            <p style={p}>
              Questions about these terms:{" "}
              <a href="mailto:support@thehumandecision.in" style={{ color: "var(--calm-text)" }}>support@thehumandecision.in</a>
            </p>
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
      <h2 style={{ fontFamily: BG2, fontWeight: 700, fontSize: "19px", color: "var(--ink)", margin: "32px 0 12px" }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  );
}

const p: React.CSSProperties = { fontSize: "15px", lineHeight: 1.75, color: "var(--ink-dim)", marginBottom: "12px" };
const ul: React.CSSProperties = { paddingLeft: "20px", marginBottom: "16px" };
const li: React.CSSProperties = { fontSize: "15px", lineHeight: 1.75, color: "var(--ink-dim)", marginBottom: "12px" };
