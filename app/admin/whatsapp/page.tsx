import { getCrmSource } from "@/lib/admin/crm";
import type { ConversationFilter } from "@/lib/admin/crm";
import { InboxView } from "./InboxView";

export const dynamic = "force-dynamic";

const FILTERS: ConversationFilter[] = ["needs_reply", "all", "drip_running", "opted_out"];

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ c?: string; filter?: string }> }) {
  const sp = await searchParams;
  const filter = (FILTERS.includes(sp.filter as ConversationFilter) ? sp.filter : "needs_reply") as ConversationFilter;
  const src = getCrmSource();
  const [conversations, templates] = await Promise.all([src.getConversations(filter), src.getTemplates()]);
  const selectedId = sp.c || conversations[0]?.id || null;
  const thread = selectedId ? await src.getThread(selectedId) : null;
  return <InboxView conversations={conversations} thread={thread} filter={filter} templates={templates} />;
}
