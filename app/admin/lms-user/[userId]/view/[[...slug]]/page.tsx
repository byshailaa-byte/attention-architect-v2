import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { getSql } from "@/lib/db/client";
import { getLmsVersion } from "@/lib/lms/lms-version";
import { runImpersonated } from "@/lib/lms/impersonation";
import { AdminLmsView } from "../AdminLmsView";

// Reuse the REAL LMS page components + data loaders. Importing the default export is just a module
// import; each page's own `dynamic`/metadata exports are ignored when called this way.
import LmsV2Home from "@/app/lms-v2/page";
import V2WeekOverview from "@/app/lms-v2/week/[week]/page";
import V2DayPage from "@/app/lms-v2/week/[week]/day/[day]/page";
import V2ModulePage from "@/app/lms-v2/week/[week]/module/[module]/page";
import V2WeekendPage from "@/app/lms-v2/week/[week]/weekend/page";
import V2Onboarding from "@/app/lms-v2/onboarding/page";
import V2Progress from "@/app/lms-v2/progress/page";
import V2Resources from "@/app/lms-v2/resources/page";
import V2ResourceSlug from "@/app/lms-v2/resources/[slug]/page";
import V2WhatToSay from "@/app/lms-v2/what-to-say/page";
import LmsV1Home from "@/app/lms/page";
import V1WeekPage from "@/app/lms/week/[week]/page";
import V1DayPage from "@/app/lms/week/[week]/day/[day]/page";
import V1WeekendPage from "@/app/lms/week/[week]/weekend/page";
import V1Onboarding from "@/app/lms/onboarding/page";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageFn = (props?: any) => Promise<ReactElement> | ReactElement;

// Map the LMS sub-path (catch-all slug) to the real page component + its params, per version.
// Covers every content page under app/lms-v2 and app/lms (auth pages — login/*-password — are
// intentionally excluded). Anything not matched returns null → a friendly card (never a bare 404),
// so a newly-added LMS page degrades gracefully until it's mapped here.
function resolve(version: "v1" | "v2", slug: string[]): { Comp: PageFn; props?: unknown } | null {
  const s = slug ?? [];
  const P = (o: Record<string, string>) => ({ params: Promise.resolve(o) });
  if (version === "v2") {
    if (s.length === 0) return { Comp: LmsV2Home };
    if (s[0] === "onboarding" && s.length === 1) return { Comp: V2Onboarding };
    if (s[0] === "progress" && s.length === 1) return { Comp: V2Progress };
    if (s[0] === "what-to-say" && s.length === 1) return { Comp: V2WhatToSay };
    if (s[0] === "resources") {
      if (s.length === 1) return { Comp: V2Resources };
      if (s[1] && s.length === 2) return { Comp: V2ResourceSlug, props: P({ slug: s[1] }) };
    }
    if (s[0] === "week" && s[1]) {
      if (s.length === 2) return { Comp: V2WeekOverview, props: P({ week: s[1] }) };
      if (s[2] === "day" && s[3] && s.length === 4) return { Comp: V2DayPage, props: P({ week: s[1], day: s[3] }) };
      if (s[2] === "module" && s[3] && s.length === 4) return { Comp: V2ModulePage, props: P({ week: s[1], module: s[3] }) };
      if (s[2] === "weekend" && s.length === 3) return { Comp: V2WeekendPage, props: P({ week: s[1] }) };
    }
    return null;
  }
  if (s.length === 0) return { Comp: LmsV1Home };
  if (s[0] === "onboarding" && s.length === 1) return { Comp: V1Onboarding };
  if (s[0] === "week" && s[1]) {
    if (s.length === 2) return { Comp: V1WeekPage, props: P({ week: s[1] }) };
    if (s[2] === "day" && s[3] && s.length === 4) return { Comp: V1DayPage, props: P({ week: s[1], day: s[3] }) };
    if (s[2] === "weekend" && s.length === 3) return { Comp: V1WeekendPage, props: P({ week: s[1] }) };
  }
  return null;
}

function UnavailableCard({ userId }: { userId: string }) {
  return (
    <div style={{ fontFamily: "var(--font-figtree), Figtree, system-ui, sans-serif", minHeight: "60dvh", background: "#FBF6EE", padding: "48px 22px", textAlign: "center", color: "#1E3A5F" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", background: "#fff", border: "1px solid #E7E0D2", borderRadius: 18, padding: 28 }}>
        <div style={{ fontSize: 26, marginBottom: 10 }} aria-hidden>👁️</div>
        <p style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700 }}>This page isn&rsquo;t available in admin view</p>
        <p style={{ margin: "0 0 18px", fontSize: 14, color: "#5B6577" }}>Some LMS pages (sign-in and account screens) can&rsquo;t be viewed as a user.</p>
        <a href={`/admin/lms-user/${userId}/view`} style={{ display: "inline-block", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, background: "#1E3A5F", color: "#fff", textDecoration: "none" }}>Back to their LMS home</a>
      </div>
    </div>
  );
}

export default async function AdminLmsViewPage({
  params,
}: { params: Promise<{ userId: string; slug?: string[] }> }) {
  const { userId, slug } = await params;
  const sql = getSql();

  // Confirm the user is a paying LMS customer and get the parent's FIRST name only (never
  // phone/email). notFound if there is no paid assessment for this id.
  const prows = (await sql`
    SELECT a.parent_name
    FROM assessments a JOIN purchases p ON p.assessment_id = a.id
    WHERE p.user_id = ${userId} AND p.status = 'paid'
    ORDER BY p.created_at DESC LIMIT 1
  `) as unknown as { parent_name: string | null }[];
  if (prows.length === 0) notFound();
  const firstName = (prows[0].parent_name ?? "").trim().split(/\s+/)[0] || "this parent";

  const version = await getLmsVersion(sql, userId);
  const route = resolve(version, slug ?? []);

  // Audit: one row per viewed path. Defensive: a missing table must not break the view.
  const path = "/" + (slug ?? []).join("/");
  try {
    await sql`INSERT INTO admin_view_log (viewed_user_id, path) VALUES (${userId}, ${path})`;
  } catch (e) {
    console.error("[admin_view_log] insert failed (table may not exist yet):", (e as Error).message);
  }

  // Unknown sub-path (e.g. an auth page, or a route not yet mapped) → friendly card, never a 404.
  if (!route) {
    return (
      <AdminLmsView userId={userId} firstName={firstName} version={version}>
        <UnavailableCard userId={userId} />
      </AdminLmsView>
    );
  }

  // Render the real LMS component for the target user. getLmsUserContext() resolves the target via
  // runImpersonated (no customer cookie touched). Invoked as a function so its data loads run
  // INSIDE the impersonation context.
  const content = await runImpersonated({ userId, readOnly: true }, async () =>
    route.props ? await route.Comp(route.props) : await route.Comp(),
  );

  return (
    <AdminLmsView userId={userId} firstName={firstName} version={version}>
      {content}
    </AdminLmsView>
  );
}
