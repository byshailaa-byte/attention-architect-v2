// Admin shell for every /admin page (existing + CRM). Auth is handled upstream by middleware.ts
// (HTTP Basic Auth on /admin/*). Provides the light navy sidebar from the mockups.
import { getCrmSource } from "@/lib/admin/crm";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const stats = await getCrmSource().getStats();
  return (
    <AdminShell callsDue={stats.callsDue} needsReply={stats.needsReply}>
      {children}
    </AdminShell>
  );
}
