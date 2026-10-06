"use client";
// Chrome for the admin "view as user" LMS render:
//  - sticky amber read-only banner with an Exit link,
//  - ReadOnlyContext=true so every LMS action control disables itself,
//  - a capture-phase click interceptor that keeps in-LMS navigation inside the admin route
//    (rewrites /lms and /lms-v2 links to /admin/lms-user/<id>/view/...), so the operator never
//    lands on the real /lms/* (where impersonation does not apply).
import { useRouter } from "next/navigation";
import { ReadOnlyContext } from "@/components/lms/ReadOnlyContext";

export function AdminLmsView({
  userId, firstName, version, children,
}: { userId: string; firstName: string; version: "v1" | "v2"; children: React.ReactNode }) {
  const router = useRouter();
  const base = `/admin/lms-user/${userId}/view`;

  function mapHref(href: string): string | null {
    let rest: string | null = null;
    if (href === "/lms-v2" || href === "/lms") rest = "";
    else if (href.startsWith("/lms-v2/")) rest = href.slice("/lms-v2".length);
    else if (href.startsWith("/lms/")) {
      // leave auth pages alone — they are not customer LMS content
      if (/^\/lms\/(login|set-password|forgot-password|reset-password)/.test(href)) return null;
      rest = href.slice("/lms".length);
    } else return null;
    return base + rest;
  }

  function onClickCapture(e: React.MouseEvent) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const a = (e.target as HTMLElement)?.closest?.("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    const mapped = mapHref(href);
    if (mapped) { e.preventDefault(); router.push(mapped); }
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#fff" }}>
      {/* Sticky read-only banner */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100, display: "flex", alignItems: "center", gap: 12,
        background: "#FBF1DC", borderBottom: "1px solid #E8D9B5", color: "#7A4E12",
        padding: "10px 16px", fontSize: 14, fontWeight: 600,
        fontFamily: "var(--font-figtree), Figtree, system-ui, sans-serif",
      }}>
        <span>Viewing {firstName}&rsquo;s LMS as admin · read-only</span>
        <span style={{ color: "#B59248" }}>· {version.toUpperCase()}</span>
        <a href={`/admin/lms-user/${userId}`} style={{ marginLeft: "auto", color: "#1E3A5F", fontWeight: 700, textDecoration: "none", border: "1px solid #C9B079", borderRadius: 8, padding: "6px 14px", background: "#fff" }}>
          Exit
        </a>
      </div>
      <ReadOnlyContext.Provider value={true}>
        <div onClickCapture={onClickCapture}>{children}</div>
      </ReadOnlyContext.Provider>
    </div>
  );
}
