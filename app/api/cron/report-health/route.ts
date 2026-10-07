import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/lib/db/client";
import { yesterdayFallback } from "@/lib/report-v2/health";
import { sendReportHealthAlert } from "@/lib/auth/email";

// Runs once a day via Vercel Cron. Checks yesterday's (IST) report fallback rate and emails
// ADMIN_ALERT_EMAIL when it breaches the threshold: ≥5 reports AND >15% fallback. Counts only — no
// session ids or customer data. Checking the just-completed day keeps it to one alert per bad day.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const y = await yesterdayFallback(getSql());
  let alerted = false;
  if (y.breach) {
    const r = await sendReportHealthAlert(
      `${y.pct}% fallback on ${y.date} (${y.fallback}/${y.total})`,
      `On ${y.date}, ${y.fallback} of ${y.total} reports fell back to static copy — ${y.pct}% (threshold: >15% on a day with ≥5 reports).\nSee Admin → Overview → "AI-written reports" for the 7-day reason breakdown.`,
    );
    alerted = r.sent;
    console.error(`[cron/report-health] ${y.date}: ${y.pct}% fallback (${y.fallback}/${y.total}) — alert ${r.sent ? "sent" : "not sent: " + r.detail}`);
  }
  return NextResponse.json({ checked: y.date, total: y.total, fallbackPct: y.pct, breach: y.breach, alerted });
}
