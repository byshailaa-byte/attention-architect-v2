"use client";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { T } from "./crm-theme";

type NavItem = {
  label: string;
  href: string;
  key: string;              // identity for active-state matching (route path, or "tab:<id>")
  badge?: number;
  badgeKind?: "amber" | "wa";
  noActive?: boolean;       // placeholder item that never highlights (e.g. Purchases)
};
type NavGroup = { label: string; items: NavItem[] };

// Single source of truth for the whole /admin nav. Each item routes to the destination it had
// before this pass: CRM/standalone pages go to their own routes; the old dashboard's internal
// sections become ?tab= on /admin (AdminDashboard reads ?tab= and renders that section).
function buildGroups(callsDue: number, needsReply: number): NavGroup[] {
  return [
    {
      label: "Sell",
      items: [
        { label: "Calls", href: "/admin/calls", key: "/admin/calls", badge: callsDue, badgeKind: "amber" },
        { label: "WhatsApp inbox", href: "/admin/whatsapp", key: "/admin/whatsapp", badge: needsReply, badgeKind: "wa" },
        { label: "Templates and drip", href: "/admin/whatsapp/templates", key: "/admin/whatsapp/templates" },
        { label: "Leads", href: "/admin/leads", key: "/admin/leads" },
        { label: "Purchases", href: "/admin", key: "purchases", noActive: true },
      ],
    },
    {
      label: "Funnel",
      items: [
        { label: "Overview", href: "/admin", key: "tab:overview" },
        { label: "Funnel", href: "/admin?tab=funnel", key: "tab:funnel" },
        { label: "Start flow", href: "/admin/start-flow", key: "/admin/start-flow" },
        { label: "Drop-offs", href: "/admin?tab=dropoffs", key: "tab:dropoffs" },
        { label: "User journeys", href: "/admin?tab=journeys", key: "tab:journeys" },
        { label: "Events", href: "/admin?tab=events", key: "tab:events" },
      ],
    },
    {
      label: "Product",
      items: [
        { label: "Users", href: "/admin?tab=users", key: "tab:users" },
        { label: "LMS activity", href: "/admin?tab=lms", key: "tab:lms" },
        { label: "Archetypes", href: "/admin?tab=archetypes", key: "tab:archetypes" },
        { label: "Report previews", href: "/admin/report-preview", key: "/admin/report-preview" },
        { label: "Handbook", href: "/admin?tab=handbook", key: "tab:handbook" },
        { label: "View as user", href: "/admin/lms-user", key: "/admin/lms-user" },
      ],
    },
  ];
}

// Which nav item is active, derived from the pathname (and ?tab= for the dashboard sections).
// Longest-prefix order matters: /admin/whatsapp/templates before /admin/whatsapp.
function activeKeyFor(pathname: string, tab: string | null): string {
  if (pathname === "/admin") return `tab:${tab || "overview"}`;
  if (pathname.startsWith("/admin/whatsapp/templates")) return "/admin/whatsapp/templates";
  if (pathname.startsWith("/admin/whatsapp")) return "/admin/whatsapp";
  if (pathname.startsWith("/admin/calls")) return "/admin/calls";
  if (pathname.startsWith("/admin/leads")) return "/admin/leads";
  if (pathname.startsWith("/admin/start-flow")) return "/admin/start-flow";
  if (pathname.startsWith("/admin/report-preview")) return "/admin/report-preview";
  if (pathname.startsWith("/admin/lms-user")) return "/admin/lms-user";
  return "";
}

const GROUP_LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#8AA0BC",
  textTransform: "uppercase", padding: "14px 8px 6px",
};

export function AdminShell({ children, callsDue, needsReply }: { children: React.ReactNode; callsDue: number; needsReply: number }) {
  const pathname = usePathname() || "/admin";
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const groups = buildGroups(callsDue, needsReply);
  const activeKey = activeKeyFor(pathname, searchParams.get("tab"));

  const Badge = ({ n, kind }: { n: number; kind: "amber" | "wa" }) => (
    <span style={{
      background: kind === "amber" ? T.amber : T.wa, color: kind === "amber" ? T.navy : T.waText,
      borderRadius: 999, padding: "0 7px", fontSize: 12, fontWeight: 700,
    }}>{n}</span>
  );

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div style={{ fontFamily: T.FONT_HEAD, fontSize: 18, fontWeight: 600, color: "#FFFFFF", padding: "0 8px 8px" }}>
        Attention Architect
      </div>
      {groups.map((group) => (
        <div key={group.label}>
          <div style={GROUP_LABEL}>{group.label}</div>
          {group.items.map((it) => {
            const active = !it.noActive && it.key === activeKey;
            const hasBadge = it.badge !== undefined && it.badge > 0;
            return (
              <a key={it.key} href={it.href} onClick={onNavigate} style={{
                padding: "8px", borderRadius: 8, textDecoration: "none", color: active ? "#FFFFFF" : "#C9D6E6",
                fontWeight: active ? 600 : 400, background: active ? "rgba(255,255,255,0.12)" : undefined,
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }}>
                <span>{it.label}</span>
                {hasBadge && <Badge n={it.badge!} kind={it.badgeKind!} />}
              </a>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.page, color: T.text, fontFamily: T.FONT_BODY }}>
      {/* Desktop sidebar */}
      <div className="aa-admin-desktop" style={{ display: "flex", minHeight: "100vh" }}>
        <nav style={{ width: 200, flexShrink: 0, background: T.navy, color: "#C9D6E6", padding: "20px 14px", display: "flex", flexDirection: "column", gap: 2, fontSize: 14, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <NavLinks />
        </nav>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>

      {/* Mobile top bar + drawer */}
      <div className="aa-admin-mobile" style={{ display: "none", minHeight: "100vh", flexDirection: "column" }}>
        <div style={{ background: T.navy, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: T.FONT_HEAD, fontSize: 17, fontWeight: 600 }}>Attention Architect</span>
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" aria-expanded={menuOpen} style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 18, cursor: "pointer" }}>≡</button>
        </div>
        {menuOpen && (
          <nav style={{ background: T.navy, color: "#C9D6E6", padding: "8px 14px 16px", display: "flex", flexDirection: "column", gap: 2, fontSize: 15 }}>
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
