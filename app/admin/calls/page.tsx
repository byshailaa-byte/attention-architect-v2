import { getCallingSource } from "@/lib/admin/crm/real";
import type { QueueTab } from "@/lib/admin/crm";
import { CallsView } from "./CallsView";

export const dynamic = "force-dynamic";

const TABS: QueueTab[] = ["due_today", "replied", "reached_plan", "read_report", "callbacks", "interested", "done"];

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS.includes(sp.tab as QueueTab) ? sp.tab : "due_today") as QueueTab;
  const src = getCallingSource();
  const [stats, leads] = await Promise.all([src.getStats(), src.getQueue(tab)]);
  return <CallsView stats={stats} leads={leads} tab={tab} />;
}
