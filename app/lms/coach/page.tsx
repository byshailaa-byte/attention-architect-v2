import { getLmsUserContext } from "@/lib/lms/user-context";
import { loadCoachPageData } from "@/lib/lms/coach/thread";
import CoachScreen from "@/components/lms/coach/CoachScreen";

export const dynamic = "force-dynamic";

export default async function CoachPageV1({ searchParams }: { searchParams: Promise<{ prefill?: string; source?: string }> }) {
  const sp = await searchParams;
  const ctx = await getLmsUserContext(); // paid-only; redirects unpaid to the existing paywall
  const data = await loadCoachPageData(ctx);
  return <CoachScreen data={data} backHref="/lms" prefill={sp.prefill} initialSource={sp.source} />;
}
