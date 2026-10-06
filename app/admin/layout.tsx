// Admin shell for every /admin page (existing + CRM). Auth is handled upstream by middleware.ts
// (HTTP Basic Auth on /admin/*). Provides the light navy sidebar from the mockups.
// AdminShell reads ?tab= via useSearchParams, so it must sit under a Suspense boundary.
import { Suspense } from "react";
import { getCrmSource } from "@/lib/admin/crm";
import { needsLookCount } from "@/lib/admin/coach";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const stats = await getCrmSource().getStats();
  const coachNeedsLook = await needsLookCount().catch(() => 0); // 0 pre-migration / on error
  return (
    <Suspense fallback={null}>
      <AdminShell callsDue={stats.callsDue} needsReply={stats.needsReply} coachNeedsLook={coachNeedsLook}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
