import SiteFooter from "@/app/components/SiteFooter";

const BG = "var(--font-bricolage), 'Bricolage Grotesque', sans-serif";

export default function PrivacyPage() {
  return (
    <>
      <main style={{ background: "var(--paper)", padding: "72px 0" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "0 24px" }}>
          <h1 style={{ fontFamily: BG, fontWeight: 800, fontSize: "34px", color: "var(--ink)", marginBottom: "8px" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ink-dim)", marginBottom: "40px" }}>
            Last updated: [DATE — fill before launch]
          </p>

          <div style={{ background: "#FDECEA", border: "1px dashed var(--redpen)", borderRadius: "10px", padding: "16px 20px", fontSize: "13px", color: "#B8382A", marginBottom: "32px", lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: "4px" }}>🔴 Requires real legal review before production.</strong>
            This is a structurally complete draft using standard clauses for this type of product (assessment + course + LMS, collecting personal data, processing payment via a third party). It is not a substitute for review by qualified legal counsel, particularly for: the correct registered legal entity name, business address, and jurisdiction; whether a Grievance Officer disclosure is required under India&rsquo;s IT Rules, 2021 (likely applicable given this platform collects personal data from Indian users); and exact data retention periods, which should reflect actual practice, not a placeholder.
          </div>

          <Section title="1. What We Collect">
            <p style={p}>
              When you use the free assessment, we collect: your child&rsquo;s first name, age band, and answers to the assessment questions. Optionally, you may share your child&rsquo;s gender, what you&rsquo;ve already tried, and what &ldquo;better&rdquo; would look like for your family.
            </p>
            <p style={p}>
              To show you the report, we collect your name and email address. If you purchase the course, our payment processor (Razorpay) collects payment details directly — we do not store your card or bank information.
            </p>
          </Section>

          <Section title="2. How We Use It">
            <ul style={ul}>
              <li style={li}>To generate your child&rsquo;s personalized Attention Blueprint and, if purchased, the weekly course content.</li>
              <li style={li}>To send you your report and any course-related communication you&rsquo;ve opted into.</li>
              <li style={li}>To improve the assessment and content over time, using anonymized or aggregated patterns — never your child&rsquo;s name or identifying details in that process.</li>
            </ul>
            <p style={p}>We do not sell your data. We do not share your child&rsquo;s individual answers with any third party for marketing purposes.</p>
          </Section>

          <Section title="3. Who We Share Data With">
            <ul style={ul}>
              <li style={li}><strong>Razorpay</strong> — for payment processing, if you purchase the course.</li>
              <li style={li}><strong>[Hosting/database provider — fill in]</strong> — to store your data securely.</li>
            </ul>
          </Section>

          <Section title="4. Data Retention">
            <p style={p}>
              [Fill in actual retention period — e.g., &ldquo;We retain your data for as long as your account is active, and for a reasonable period after for legal and operational purposes.&rdquo;] You can request deletion of your data at any time by contacting us.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p style={p}>
              You can request a copy of the data we hold about you, or ask us to delete it, by emailing{" "}
              <a href="mailto:support@thehumandecision.in" style={{ color: "var(--calm-text)" }}>support@thehumandecision.in</a>.
            </p>
          </Section>

          <Section title="6. Children&rsquo;s Data">
            <p style={p}>
              This service is designed for parents to complete on behalf of their child. We do not knowingly collect data directly from children, and the assessment is intended to be answered by a parent or guardian, not the child themselves.
            </p>
          </Section>

          <Section title="7. Contact">
            <p style={p}>
              Questions about this policy:{" "}
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
