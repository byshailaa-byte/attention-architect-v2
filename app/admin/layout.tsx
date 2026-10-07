// Admin shell for every /admin page (existing + CRM). Auth is handled upstream by middleware.ts
// (HTTP Basic Auth on /admin/*). Provides the light navy sidebar from the mockups.
// AdminShell reads ?tab= via useSearchParams, so it must sit under a Suspense boundary.
import { Suspense } from "react";
import { getCallingSource } from "@/lib/admin/crm/real";
import { needsLookCount } from "@/lib/admin/coach";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nav-badge counts from the live calling queue. On a DB error we show honest zeros — NEVER a
  // silent fall back to fixtures (that masked a stale/broken deploy as working preview data).
  let callsDue = 0;
  let needsReply = 0;
  try {
    const stats = await getCallingSource().getStats();
    callsDue = stats.callsDue;
    needsReply = stats.needsReply;
  } catch (e) {
    console.error("[admin/layout] calling stats failed", e);
  }
  const coachNeedsLook = await needsLookCount().catch(() => 0); // 0 pre-migration / on error
  return (
    <Suspense fallback={null}>
      <AdminShell callsDue={callsDue} needsReply={needsReply} coachNeedsLook={coachNeedsLook}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
