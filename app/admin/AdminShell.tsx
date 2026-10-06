"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { T } from "./crm-theme";

type NavItem = { label: string; href: string; badge?: number; badgeKind?: "amber" | "wa" };

export function AdminShell({ children, callsDue, needsReply }: { children: React.ReactNode; callsDue: number; needsReply: number }) {
  const pathname = usePathname() || "/admin";
  const [menuOpen, setMenuOpen] = useState(false);

  const items: NavItem[] = [
    { label: "Overview", href: "/admin" },
    { label: "Funnel", href: "/admin" },
    { label: "User journeys", href: "/admin/leads" },
    { label: "Calls", href: "/admin/calls", badge: callsDue, badgeKind: "amber" },
    { label: "WhatsApp inbox", href: "/admin/whatsapp", badge: needsReply, badgeKind: "wa" },
    { label: "Templates and drip", href: "/admin/whatsapp/templates" },
    { label: "Purchases", href: "/admin" },
  ];

  const activeHref = (() => {
    if (pathname.startsWith("/admin/whatsapp/templates")) return "/admin/whatsapp/templates";
    if (pathname.startsWith("/admin/whatsapp")) return "/admin/whatsapp";
    if (pathname.startsWith("/admin/calls")) return "/admin/calls";
    if (pathname.startsWith("/admin/leads")) return "/admin/leads";
    return "/admin";
  })();

  const Badge = ({ n, kind }: { n: number; kind: "amber" | "wa" }) => (
    <span style={{
      background: kind === "amber" ? T.amber : T.wa, color: kind === "amber" ? T.navy : T.waText,
      borderRadius: 999, padding: "0 7px", fontSize: 12, fontWeight: 700,
    }}>{n}</span>
  );

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div style={{ fontFamily: T.FONT_HEAD, fontSize: 18, fontWeight: 600, color: "#FFFFFF", padding: "0 8px 16px" }}>
        Attention Architect
      </div>
      {items.map((it, i) => {
        const active = it.href === activeHref && !(it.label === "Funnel" || it.label === "Purchases");
        return (
          <a key={i} href={it.href} onClick={onNavigate} style={{
            padding: 8, borderRadius: 8, textDecoration: "none", color: active ? "#FFFFFF" : "#C9D6E6",
            fontWeight: active ? 600 : 400, background: active ? "rgba(255,255,255,0.12)" : undefined,
            display: it.badge !== undefined ? "flex" : undefined, justifyContent: it.badge !== undefined ? "space-between" : undefined,
            alignItems: "center",
          }}>
            {it.label}{it.badge !== undefined && it.badge > 0 && <Badge n={it.badge} kind={it.badgeKind!} />}
          </a>
        );
      })}
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.page, color: T.text, fontFamily: T.FONT_BODY }}>
      {/* Desktop sidebar */}
      <div className="aa-admin-desktop" style={{ display: "flex", minHeight: "100vh" }}>
        <nav style={{ width: 200, flexShrink: 0, background: T.navy, color: "#C9D6E6", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 4, fontSize: 14 }}>
          <NavLinks />
        </nav>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>

      {/* Mobile top bar + drawer */}
      <div className="aa-admin-mobile" style={{ display: "none", minHeight: "100vh", flexDirection: "column" }}>
        <div style={{ background: T.navy, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: T.FONT_HEAD, fontSize: 17, fontWeight: 600 }}>Attention Architect</span>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 18, cursor: "pointer" }}>≡</button>
        </div>
        {menuOpen && (
          <nav style={{ background: T.navy, color: "#C9D6E6", padding: "8px 14px 16px", display: "flex", flexDirection: "column", gap: 4, fontSize: 15 }}>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
          </nav>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .aa-admin-desktop { display: none !important; }
          .aa-admin-mobile { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
