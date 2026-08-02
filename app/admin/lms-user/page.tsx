// Admin-only — protected by middleware HTTP Basic Auth on /admin/*
// Look up any user by email or phone and view their exact LMS state.
// Read-only: no actions taken on the user's behalf.

import { getSql } from "@/lib/db/client";
import Link from "next/link";
import type { SearchParams } from "next/dist/server/request/search-params";

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type Props = { searchParams: Promise<SearchParams> };

export default async function LmsUserLookupPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  const sql = getSql();
  let results: UserRow[] = [];
  let searchError: string | null = null;

  if (query) {
    try {
      results = (await sql`
        SELECT id, email, phone, created_at
        FROM users
        WHERE
          (email ILIKE ${"%" + query + "%"})
          OR (phone ILIKE ${"%" + query + "%"})
        ORDER BY created_at DESC
        LIMIT 20
      `) as unknown as UserRow[];
    } catch (e: unknown) {
      searchError = (e as Error).message;
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "860px", margin: "40px auto", padding: "0 24px" }}>
      {/* Admin banner */}
      <div style={{
        background: "#1a1a2e", color: "#e0e0e0", padding: "12px 24px",
        fontSize: "13px", marginBottom: "32px", borderRadius: "8px",
        display: "flex", alignItems: "center", gap: "16px",
      }}>
        <span style={{ fontWeight: 700, color: "#ffd700", letterSpacing: ".05em" }}>
          ⚠ ADMIN — LMS USER VIEW
        </span>
        <span style={{ color: "#888", fontSize: "12px" }}>Read-only. No actions taken on behalf of any user.</span>
        <Link href="/admin" style={{ marginLeft: "auto", color: "#aaa", fontSize: "12px", textDecoration: "none" }}>
          ← Admin dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px", color: "#111" }}>
        LMS — View as user
      </h1>
      <p style={{ fontSize: "14px", color: "#666", margin: "0 0 24px" }}>
        Look up a user by email or phone number to see their exact LMS state.
      </p>

      {/* Search form */}
      <form method="GET" style={{ display: "flex", gap: "10px", marginBottom: "32px" }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Email or phone number"
          style={{
            flex: 1, padding: "10px 14px", border: "1.5px solid #ddd",
            borderRadius: "8px", fontSize: "14px", outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px", background: "#111", color: "#fff",
            border: "none", borderRadius: "8px", fontSize: "14px",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Look up
        </button>
      </form>

      {searchError && (
        <p style={{ color: "#c00", fontSize: "14px" }}>Error: {searchError}</p>
      )}

      {query && results.length === 0 && !searchError && (
        <p style={{ color: "#888", fontSize: "14px" }}>No users found matching &ldquo;{query}&rdquo;.</p>
      )}

      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {results.map((u) => (
            <Link
              key={u.id}
              href={`/admin/lms-user/${u.id}`}
              style={{
                display: "block", padding: "14px 18px",
                background: "#f9f9f9", border: "1px solid #e5e5e5",
                borderRadius: "8px", textDecoration: "none", color: "#111",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>
                    {u.email ?? u.phone ?? "—"}
                  </span>
                  {u.email && u.phone && (
                    <span style={{ color: "#888", fontSize: "12px", marginLeft: "10px" }}>{u.phone}</span>
                  )}
                </div>
                <span style={{ fontSize: "12px", color: "#aaa" }}>
                  {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div style={{ marginTop: "4px", fontFamily: "monospace", fontSize: "11px", color: "#bbb" }}>
                {u.id}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
