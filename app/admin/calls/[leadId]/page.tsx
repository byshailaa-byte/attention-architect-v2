import { getCallingSource } from "@/lib/admin/crm/real";
import type { QueueTab } from "@/lib/admin/crm";
import { nextLeadId } from "@/lib/admin/crm";
import { CallScreen } from "./CallScreen";
import { T } from "../../crm-theme";

export const dynamic = "force-dynamic";

export default async function CallLeadPage({ params, searchParams }: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { leadId } = await params;
  const sp = await searchParams;
  const tab = (sp.tab as QueueTab) || "due_today";
  const src = getCallingSource();
  const [lead, queue] = await Promise.all([src.getLead(leadId), src.getQueue(tab)]);
  if (!lead) {
    return <main style={{ padding: 28, fontFamily: T.FONT_BODY, color: T.text }}><p>Lead not found.</p></main>;
  }
  const next = nextLeadId(leadId, queue.map((l) => l.id));
  return <CallScreen lead={lead} tab={tab} nextId={next} />;
}
