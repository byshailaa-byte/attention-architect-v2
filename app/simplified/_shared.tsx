"use client";
import { useState } from "react";

// ─── Nav items (all hrefs wired) ─────────────────────────────────────────────

export const NAV_ITEMS = [
  { id: "home",       label: "Home",                href: "/simplified" },
  { id: "health",     label: "Attention Health",    href: "/simplified/health" },
  { id: "archetypes", label: "8 Types of Children", href: "/simplified/children" },
  { id: "instincts",  label: "4 Types of Parents",  href: "/simplified/parents" },
  { id: "resources",  label: "Resources",           href: "/simplified/resources" },
  { id: "about",      label: "About us",            href: "/simplified/about" },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

export function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div style={{
      font: "var(--type-eyebrow)",
      letterSpacing: "var(--tracking-eyebrow)",
      textTransform: "uppercase",
      color: light ? "var(--amber-500)" : "var(--text-eyebrow)",
    }}>{children}</div>
  );
}

export function Wrap({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <div style={{ maxWidth: narrow ? 880 : "var(--site-max)", margin: "0 auto", padding: "0 var(--page-pad)" }}>
      {children}
    </div>
  );
}

export const headingStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontWeight: "var(--weight-bold)",
  letterSpacing: "var(--tracking-tight)",
  color: "var(--navy-800)",
};

// ─── SiteNav ─────────────────────────────────────────────────────────────────

export function SiteNav({ onCta, active }: { onCta: () => void; active: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header style={{ background: "var(--surface-footer)", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{
        background: "var(--white)",
        maxWidth: 1160, margin: "0 auto", padding: "var(--space-4) var(--page-pad)",
        display: "flex", alignItems: "center", gap: "var(--space-6)",
      }}>
        <a href="/simplified" style={{ flex: "0 0 auto", display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 34, width: "auto", display: "block" }} />
        </a>

        <nav style={{ flex: 1, display: "var(--nav-display)", alignItems: "center", justifyContent: "flex-end", gap: "var(--space-6)" }}>
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={item.href} style={{
              whiteSpace: "nowrap", textDecoration: "none", paddingBottom: 2,
              borderBottom: active === item.id ? "2px solid var(--amber-500)" : "2px solid transparent",
              font: `var(--weight-${active === item.id ? "bold" : "medium"}) var(--text-sm)/1.4 var(--font-sans)`,
              color: active === item.id ? "var(--navy-800)" : "var(--ink-600)",
            }}>{item.label}</a>
          ))}
        </nav>

        <button onClick={onCta} style={{
          all: "unset", cursor: "pointer", whiteSpace: "nowrap", flex: "0 0 auto",
          display: "var(--nav-cta-display)",
          background: "var(--navy-800)", color: "#fff",
          font: "var(--weight-bold) var(--text-sm)/1.3 var(--font-sans)",
          padding: "9px 18px", borderRadius: "var(--radius-button)",
          boxShadow: "var(--shadow-button)",
        }}>Take free assessment</button>

        <button onClick={() => setOpen((o) => !o)} aria-label="Menu" style={{
          all: "unset", cursor: "pointer", display: "var(--nav-toggle-display)", flex: "0 0 auto",
          font: "var(--weight-bold) var(--text-xl)/1 var(--font-sans)",
          color: "var(--navy-800)", padding: "0 4px",
        }}>{open ? "×" : "≡"}</button>
      </div>

      {open && (
        <div style={{
          background: "var(--white)", display: "flex", flexDirection: "column",
          borderTop: "1px solid var(--border-divider)",
          padding: "var(--space-3) var(--page-pad) var(--space-5)",
        }}>
          {NAV_ITEMS.map((item) => (
            <a key={item.id} href={item.href} onClick={() => setOpen(false)} style={{
              padding: "var(--space-3) 0",
              font: "var(--weight-medium) var(--text-base)/1.4 var(--font-sans)",
              color: "var(--ink-600)", textDecoration: "none",
              borderBottom: "1px solid var(--border-divider)",
            }}>{item.label}</a>
          ))}
          <div style={{ paddingTop: "var(--space-4)" }}>
            <button onClick={() => { setOpen(false); onCta(); }} style={{
              all: "unset", cursor: "pointer",
              background: "var(--amber-500)", color: "var(--navy-800)",
              font: "var(--weight-bold) var(--text-sm)/1.3 var(--font-sans)",
              padding: "10px 20px", borderRadius: "var(--radius-button)",
            }}>Take free assessment</button>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── SiteFooterFull ───────────────────────────────────────────────────────────

export function SiteFooterFull() {
  const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-3)" };
  const colHead: React.CSSProperties = {
    font: "var(--weight-bold) var(--text-xs)/1.4 var(--font-sans)",
    letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase",
    color: "var(--amber-500)",
  };
  const lnk: React.CSSProperties = { font: "var(--type-body-sm)", color: "var(--text-on-navy-muted)", textDecoration: "none" };

  return (
    <footer style={{ background: "var(--surface-footer)", color: "var(--text-on-navy-muted)" }}>
      <Wrap>
        <div style={{
          padding: "var(--space-16) 0 var(--space-12)",
          display: "grid", gridTemplateColumns: "var(--grid-footer)", gap: "var(--space-10)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: "#fff", borderRadius: 10, padding: "8px 16px", alignSelf: "flex-start",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 36, width: "auto", display: "block" }} />
            </div>
            <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-on-navy-muted)", maxWidth: 220 }}>
              We help parents build the capability that sits underneath everything else they want for their child: the ability to direct their own attention.
            </p>
          </div>
          <div style={col}>
            <div style={colHead}>Attention Health</div>
            {([
              ["What is Attention Health?", "/simplified/health"],
              ["The 8 kinds of children",   "/simplified/children"],
              ["The 4 kinds of parents",    "/simplified/parents"],
            ] as [string, string][]).map(([t, h]) => <a key={t} href={h} style={lnk}>{t}</a>)}
          </div>
          <div style={col}>
            <div style={colHead}>For parents</div>
            {([
              ["Real cases & articles", "/simplified/resources"],
            ] as [string, string][]).map(([t, h]) => <a key={t} href={h} style={lnk}>{t}</a>)}
          </div>
          <div style={col}>
            <div style={colHead}>Practice</div>
            {([
              ["About us",        "/simplified/about"],
              ["Privacy Policy",  "/privacy"],
              ["Terms of Service","/terms"],
            ] as [string, string][]).map(([t, h]) => <a key={t} href={h} style={lnk}>{t}</a>)}
          </div>
          <div style={col}>
            <div style={colHead}>Contact</div>
            <span style={lnk}>support@thehumandecision.in</span>
            <span style={lnk}>+91 99933 74923</span>
            <span style={lnk}>The Human Decision, India</span>
          </div>
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: "var(--space-6) 0 var(--space-10)" }}>
          <p style={{ margin: "0 0 var(--space-3)", font: "var(--type-body-sm)", color: "var(--text-on-navy-muted)", opacity: 0.7, maxWidth: 720 }}>
            Attention Architect helps parents understand their child. It is not a medical or diagnostic service. Nothing here names, rules out, or tests for any condition. If something at home worries you, please speak to a qualified professional.
          </p>
          <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-on-navy-muted)", opacity: 0.5 }}>
            © 2026 The Human Decision. All rights reserved.{"  "} Made with care for parents.
          </p>
        </div>
      </Wrap>
    </footer>
  );
}

// ─── CloseBand ───────────────────────────────────────────────────────────────

export function CloseBand({ title, lead, onCta }: { title: string; lead: string; onCta: () => void }) {
  return (
    <section style={{ background: "var(--surface-navy)", padding: "var(--site-section-gap) 0" }}>
      <Wrap>
        <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 22 }}>
          <Eyebrow light>Free · 5 minutes · No sign-up</Eyebrow>
          <h2 style={{
            margin: 0, fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)",
            fontSize: "var(--type-display-size)", lineHeight: 1.16,
            letterSpacing: "var(--tracking-tight)", color: "var(--white)",
          }}>{title}</h2>
          <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-on-navy-muted)" }}>{lead}</p>
          <div style={{ paddingTop: 4 }}>
            <button onClick={onCta} style={{
              all: "unset", cursor: "pointer",
              background: "var(--amber-500)", color: "var(--navy-800)",
              font: "var(--weight-bold) var(--text-base)/1.3 var(--font-sans)",
              padding: "16px 28px", borderRadius: "var(--radius-button)",
              boxShadow: "var(--shadow-button)", display: "inline-block",
            }}>See where my child is today →</button>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
