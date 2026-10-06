import Link from "next/link";
import { WEEK_TITLES } from "@/lib/report/skills";
import { UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { V2, BODY } from "./v2ui";

// Shared locked-WEEK card for v2 (reuses the locked-DAY card styling). Shown by the week overview,
// module reader, weekend and day pages whenever the whole week is still locked.
//   - Week N-1 not finished  → "Opens after you finish Week {N-1}."
//   - Week N-1 Day 5 done, 24h still running → "Opens {weekday} at {time}" (IST, = Day5 + 24h).
export function LockedWeekCard({
  week, prevDay5Time, now,
}: { week: number; prevDay5Time?: Date; now: Date }) {
  const title = WEEK_TITLES[week] ?? `Week ${week}`;
  let line: string;
  if (prevDay5Time) {
    const unlockAt = new Date(prevDay5Time.getTime() + UNLOCK_DELAY_MS);
    const weekday = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(unlockAt);
    const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(unlockAt).toLowerCase();
    line = `Opens ${weekday} at ${time}.`;
  } else {
    line = `Opens after you finish Week ${week - 1}.`;
  }
  void now;
  return (
    <div style={{ fontFamily: BODY, color: V2.navy, minHeight: "100dvh", background: V2.cream, padding: "40px 22px" }}>
      <Link href="/lms-v2" style={{ fontSize: 14, color: V2.dim, textDecoration: "none" }}>← Your six weeks</Link>
      <div style={{ marginTop: 24, background: V2.white, border: `1px solid ${V2.line}`, borderRadius: 18, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 26, marginBottom: 10 }} aria-hidden>🔒</div>
        <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>Week {week}: {title}</p>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: V2.dim }}>{line}</p>
        <Link href="/lms-v2" style={{ display: "inline-block", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, background: V2.navy, color: V2.white, textDecoration: "none" }}>Back to your six weeks</Link>
      </div>
    </div>
  );
}
