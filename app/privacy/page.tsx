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
            Last updated: 12-Feb-2026
          </p>

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
              We retain your data for as long as needed to provide the service, and continue to hold it unless you ask us to delete it. You can request deletion of your data — yours or your child&rsquo;s — at any time by contacting us, and we&rsquo;ll remove it within a reasonable period.
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

          <Section title="7. Grievance Officer">
            <p style={p}>
              In accordance with India&rsquo;s Information Technology Rules, 2021, the Grievance Officer for data-related complaints is:
            </p>
            <p style={p}>
              <strong>Shashank Agrawal</strong><br />
              Email:{" "}
              <a href="mailto:shashankagrawal033@gmail.com" style={{ color: "var(--calm-text)" }}>shashankagrawal033@gmail.com</a>
            </p>
            <p style={p}>
              If you have a complaint about how your data (or your child&rsquo;s data) has been handled, you can write directly to the Grievance Officer above.
            </p>
          </Section>

          <Section title="8. Contact">
            <p style={p}>
              General questions about this policy:{" "}
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
      <h2
        style={{ fontFamily: BG2, fontWeight: 700, fontSize: "19px", color: "var(--ink)", margin: "32px 0 12px" }}
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {children}
    </div>
  );
}

const p: React.CSSProperties = { fontSize: "15px", lineHeight: 1.75, color: "var(--ink-dim)", marginBottom: "12px" };
const ul: React.CSSProperties = { paddingLeft: "20px", marginBottom: "16px" };
const li: React.CSSProperties = { fontSize: "15px", lineHeight: 1.75, color: "var(--ink-dim)", marginBottom: "12px" };
