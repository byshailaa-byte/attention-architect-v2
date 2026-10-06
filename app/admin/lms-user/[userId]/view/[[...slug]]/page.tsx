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
import LmsV1Home from "@/app/lms/page";
import V1WeekPage from "@/app/lms/week/[week]/page";
import V1DayPage from "@/app/lms/week/[week]/day/[day]/page";
import V1WeekendPage from "@/app/lms/week/[week]/weekend/page";
import V1Onboarding from "@/app/lms/onboarding/page";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageFn = (props?: any) => Promise<ReactElement> | ReactElement;

// Map the LMS sub-path (catch-all slug) to the real page component + its params, per version.
function resolve(version: "v1" | "v2", slug: string[]): { Comp: PageFn; props?: unknown } | null {
  const s = slug ?? [];
  const P = (o: Record<string, string>) => ({ params: Promise.resolve(o) });
  if (version === "v2") {
    if (s.length === 0) return { Comp: LmsV2Home };
    if (s[0] === "onboarding" && s.length === 1) return { Comp: V2Onboarding };
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
  if (!route) notFound();

  // Audit: one row per viewed path. Defensive: a missing table must not break the view.
  const path = "/" + (slug ?? []).join("/");
  try {
    await sql`INSERT INTO admin_view_log (viewed_user_id, path) VALUES (${userId}, ${path})`;
  } catch (e) {
    console.error("[admin_view_log] insert failed (table may not exist yet):", (e as Error).message);
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
