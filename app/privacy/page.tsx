import SiteFooter from "@/app/components/SiteFooter";
import { ENTITY } from "@/lib/entity";

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
            Last updated: 30 September 2026
          </p>

          <Section title="Who We Are">
            <p style={p}>
              Attention Architect is a brand of {ENTITY.legalName}, a proprietorship
              registered under the {ENTITY.registrationAct} (registration no.{" "}
              {ENTITY.registrationNumber}), with its registered address at {ENTITY.address}.
              In this policy, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;our&rdquo; refer
              to {ENTITY.legalName}, which is the data fiduciary responsible for the personal
              data described below.
            </p>
          </Section>

          <Section title="1. What We Collect">
            <p style={p}>We collect the following, grouped by where it is collected:</p>
            <ul style={ul}>
              <li style={li}><strong>The free assessment</strong> — your child&rsquo;s first name, age band, gender (optional), the answers to the assessment questions, and the concern(s) you select (and any follow-up detail you add).</li>
              <li style={li}><strong>The report gate</strong> (to send you the report) — your name, your WhatsApp phone number, and your email address, and optionally what you&rsquo;ve already tried and what &ldquo;better&rdquo; would look like for your family.</li>
              <li style={li}><strong>The handbook form</strong> (if you request the free handbook) — your name, your phone number, and your child&rsquo;s age band.</li>
              <li style={li}><strong>Purchase</strong> — if you buy the course, our payment processor (Razorpay) collects your payment details directly; we do not store your card or bank information. We keep a record of the purchase (tier, amount, and payment/order references).</li>
              <li style={li}><strong>Course account (LMS)</strong> — if you buy the course, we create an account with your email address and the password you set. Passwords are stored only in hashed form, never in plain text.</li>
            </ul>
          </Section>

          <Section title="2. How We Use It">
            <ul style={ul}>
              <li style={li}>To generate your child&rsquo;s personalised report and, if purchased, the weekly course content. To create the narrative report, your child&rsquo;s first name, age band, gender, and assessment answers are sent to our AI provider (Anthropic) — see Section 3.</li>
              <li style={li}>To deliver the report and follow-up messages on WhatsApp, and to send the course link and reminders.</li>
              <li style={li}>To send email — your report/account emails, purchase receipts, and set-password / access links.</li>
              <li style={li}>To measure advertising — we send a hashed version of your email and phone number to Meta so we can measure which ads led to a lead or purchase (see Section 3).</li>
              <li style={li}>To improve the assessment and content over time, using aggregated patterns.</li>
            </ul>
            <p style={p}>We do not sell your data. We do not share your child&rsquo;s individual answers with any third party for marketing purposes.</p>
          </Section>

          <Section title="3. Who We Share Data With">
            <ul style={ul}>
              <li style={li}><strong>Anthropic</strong> — AI report generation. Receives your child&rsquo;s first name, age band, gender, and assessment answers, in order to write the personalised report. Under Anthropic&rsquo;s commercial terms, data sent to it through its API is not used to train its models.</li>
              <li style={li}><strong>WATI</strong> — WhatsApp delivery and chat. Receives your name, phone number, your child&rsquo;s first name, their attention pattern from the report, and report links, to send your report and follow-ups. Some replies to your WhatsApp messages may come from an automated AI assistant; you can ask for a person at any time.</li>
              <li style={li}><strong>Meta</strong> — (a) the WhatsApp Cloud API, used to deliver the free handbook, receives your name and phone number; (b) the Conversions API, used for advertising measurement, receives a hashed version of your email and phone number only.</li>
              <li style={li}><strong>Resend</strong> — email delivery. Receives your email address (and email content).</li>
              <li style={li}><strong>Razorpay</strong> — payment processing, if you purchase. Handles your payment details directly.</li>
              <li style={li}><strong>Vercel</strong> — hosting.</li>
              <li style={li}><strong>Neon</strong> — database, to store your data securely.</li>
            </ul>
            <p style={p}>Some of these providers process data outside India. We share only what each needs for the purpose stated.</p>
          </Section>

          <Section title="4. Data Retention">
            <p style={p}>
              If you take the assessment but don&rsquo;t purchase, we delete your data and your child&rsquo;s data 24 months after your last activity with us. If you purchase, we delete it 24 months after your last activity on the course. Purchase and payment records are kept for as long as tax and accounting law requires. You can ask us to delete your data, or your child&rsquo;s, at any time before then by emailing{" "}
              <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: "var(--calm-text)" }}>{ENTITY.supportEmail}</a>, and we will do so within 30 days, except for records we are legally required to keep.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p style={p}>
              You can request a copy of the data we hold about you, or ask us to delete it, by emailing{" "}
              <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: "var(--calm-text)" }}>{ENTITY.supportEmail}</a>.
            </p>
            <p style={p}>
              To stop WhatsApp messages at any time, reply <strong>STOP</strong> to any of our WhatsApp messages, or email us to opt out.
            </p>
          </Section>

          <Section title="6. Children&rsquo;s Data">
            <p style={p}>
              This service is designed for parents to complete on behalf of their child. We do not knowingly collect data directly from children, and the assessment is intended to be answered by a parent or guardian, not the child themselves. By completing the assessment, you confirm you are the child&rsquo;s parent or legal guardian and consent to this processing on their behalf.
            </p>
          </Section>

          <Section title="7. Grievance Officer">
            <p style={p}>
              In accordance with India&rsquo;s Information Technology Rules, 2021, the Grievance Officer for data-related complaints is:
            </p>
            <p style={p}>
              <strong>Shashank Agrawal</strong><br />
              {ENTITY.legalName}, {ENTITY.address}<br />
              Email:{" "}
              <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: "var(--calm-text)" }}>{ENTITY.supportEmail}</a>
            </p>
            <p style={p}>
              If you have a complaint about how your data (or your child&rsquo;s data) has been handled, you can write directly to the Grievance Officer above.
            </p>
          </Section>

          <Section title="8. Contact">
            <p style={p}>
              General questions about this policy:{" "}
              <a href={`mailto:${ENTITY.supportEmail}`} style={{ color: "var(--calm-text)" }}>{ENTITY.supportEmail}</a>
              {" "}or WhatsApp{" "}
              <a href={`https://wa.me/91${ENTITY.phone}`} target="_blank" rel="noopener" style={{ color: "var(--calm-text)" }}>{ENTITY.phoneDisplay}</a>.
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
