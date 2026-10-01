// Admin Leads — everyone who reached us, from any channel, merged into one
// person by phone number. Admin-only (middleware HTTP Basic Auth on /admin/*).
//
// Server component: runs the four plain SELECTs (lib/leads/fetch.ts), merges
// them (lib/leads/merge.ts), filters to the selected period, counts by first
// channel, and hands a plain array to the client view.

import { getSql } from "@/lib/db/client";
import { fetchLeadSources, fetchInternalPhones } from "@/lib/leads/fetch";
import { mergeLeads, type Lead, type Channel } from "@/lib/leads/merge";
import LeadsView from "./LeadsView";

export const dynamic = "force-dynamic";

function boundsFor(range: string): { from: number; to: number } {
  const to = Date.now();
  if (range === "today") return { from: to - 1 * 86_400_000, to };
  if (range === "7d") return { from: to - 7 * 86_400_000, to };
  return { from: to - 30 * 86_400_000, to }; // default: last 30 days
}

export type SourceCounts = {
  all: number;
  web: number;
  whatsapp_ad: number;
  whatsapp_direct: number;
  handbook: number;
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const activeRange = range === "7d" || range === "today" ? range : "30d";
  const { from, to } = boundsFor(activeRange);

  let leads: Lead[] = [];
  let error: string | null = null;
  try {
    const sql = getSql();
    const [sources, internalPhones] = await Promise.all([fetchLeadSources(sql), fetchInternalPhones(sql)]);
    const all = mergeLeads(sources, internalPhones);
    // Period filter: leads with activity inside the window.
    leads = all.filter((l) => {
      const t = new Date(l.lastActivityAt).getTime();
      return t >= from && t <= to;
    });
  } catch (e) {
    error = (e as Error).message;
  }

  const counts: SourceCounts = { all: leads.length, web: 0, whatsapp_ad: 0, whatsapp_direct: 0, handbook: 0 };
  for (const l of leads) counts[l.firstChannel as Channel]++;

  return <LeadsView leads={leads} counts={counts} range={activeRange} error={error} />;
}
