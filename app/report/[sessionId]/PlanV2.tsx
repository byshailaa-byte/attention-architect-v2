// Plan v2 (?report=v2&plan=1) — full scrolling plan lands in Part 3. Placeholder for now so
// the cards' "See the six-week plan" link resolves and the route builds.
import type { ReportV2Content } from "@/lib/report-v2/types";

export default function PlanV2({ content }: {
  sessionId: string; content: ReportV2Content; ageBand: string;
  goalOptions: { key: string; text: string }[]; calendlyUrl: string; checkinEnabled: boolean;
}) {
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ color: "#555" }}>{content.childName}’s six-week plan — coming in the next step.</p>
    </main>
  );
}
