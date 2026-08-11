// Admin-only — protected by middleware HTTP Basic Auth on /admin/*
// Shows one user's full LMS state as they currently experience it.
// Read-only: no actions taken on behalf of any user. Gate 3 clean: no honest_flag/honest_trigger.

import { getSql } from "@/lib/db/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserProgress, isDayUnlocked, UNLOCK_DELAY_MS } from "@/lib/lms/progress";
import { getLmsWeekContent } from "@/lib/lms/content";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Promise<{ userId: string }>;

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

type PurchaseRow = {
  tier: string;
  status: string;
  created_at: string;
  archetype: string | null;
  child_name: string | null;
};

function formatDuration(ms: number): string {
  if (ms <= 0) return "now";
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms % (60 * 60 * 1000)) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTs(d: Date): string {
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  }) + " IST";
}

const DAY_CELLS = [1, 2, 3, 4, 5, 0]; // 0 = weekend

export default async function LmsUserDetailPage({ params }: { params: Params }) {
  const { userId } = await params;
  if (!UUID_RE.test(userId)) notFound();

  const sql = getSql();
  const now = new Date();

  // Fetch user
  const users = (await sql`
    SELECT id, email, phone, created_at FROM users WHERE id = ${userId}::uuid LIMIT 1
  `) as unknown as UserRow[];
  if (users.length === 0) notFound();
  const user = users[0];

  // Fetch purchase + archetype (most recent paid purchase)
  const purchases = (await sql`
    SELECT p.tier, p.status, p.created_at, a.archetype, a.child_name
    FROM purchases p
    JOIN assessments a ON a.id = p.assessment_id
    WHERE p.user_id = ${userId}::uuid AND p.status = 'paid'
    ORDER BY p.created_at DESC
    LIMIT 1
  `) as unknown as PurchaseRow[];
  const purchase = purchases[0] ?? null;
  const archetype = purchase?.archetype ?? null;

  // Fetch lms_progress and lms_reflections for weeks 1–3
  const [week1Progress, week2Progress, week3Progress] = await Promise.all([
    getUserProgress(userId, 1),
    getUserProgress(userId, 2),
    getUserProgress(userId, 3),
  ]);

  const week2HasContent = archetype !== null && getLmsWeekContent(archetype, 2) !== null;
  const week2Unlocked = week2HasContent && isDayUnlocked(1, 2, week2Progress, week1Progress, now);

  const week3HasContent = archetype !== null && getLmsWeekContent(archetype, 3) !== null;
  const week3Unlocked = week3HasContent && isDayUnlocked(1, 3, week3Progress, week2Progress, now);

  // Build week summary rows
  function buildWeekSummary(weekNum: number, prog: typeof week1Progress, prevProg: typeof week1Progress | null) {
    return DAY_CELLS.map((day) => {
      const complete = prog.completedDays.has(day);
      const completedAt = prog.completionTimes.get(day);

      let unlocked: boolean;
      if (weekNum === 1 && day === 1) {
        unlocked = true;
      } else if (day === 0) {
        unlocked = isDayUnlocked(0, weekNum, prog, prevProg, now);
      } else if (day === 1 && weekNum > 1) {
        unlocked = isDayUnlocked(1, weekNum, prog, prevProg, now);
      } else {
        unlocked = isDayUnlocked(day, weekNum, prog, prevProg, now);
      }

      let unlockEta: string | null = null;
      if (!unlocked) {
        // Compute when it will unlock
        const prereqDay = day === 0 ? 5 : day === 1 && weekNum > 1 ? 5 : day - 1;
        const prereqProg = day === 1 && weekNum > 1 ? prevProg : prog;
        const prereqTime = prereqProg?.completionTimes.get(prereqDay);
        if (prereqTime) {
          const remaining = UNLOCK_DELAY_MS - (now.getTime() - prereqTime.getTime());
          unlockEta = remaining > 0 ? `unlocks in ${formatDuration(remaining)}` : "unlocking soon";
        }
      }

      return { day, complete, completedAt, unlocked, unlockEta, reflection: prog.reflections.get(day) };
    });
  }

  const week1Summary = buildWeekSummary(1, week1Progress, null);
  const week2Summary = buildWeekSummary(2, week2Progress, week1Progress);
  const week3Summary = buildWeekSummary(3, week3Progress, week2Progress);

  const dayLabel = (d: number) => d === 0 ? "Weekend" : `Day ${d}`;

  const statusColor = (complete: boolean, unlocked: boolean) =>
    complete ? "#155724" : unlocked ? "#0c5460" : "#555";
  const statusBg = (complete: boolean, unlocked: boolean) =>
    complete ? "#d4edda" : unlocked ? "#d1ecf1" : "#f0f0f0";
  const statusText = (complete: boolean, unlocked: boolean) =>
    complete ? "✓ done" : unlocked ? "unlocked" : "locked";

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "860px", margin: "0 auto", padding: "0 0 60px" }}>
      {/* Sticky admin banner */}
      <div style={{
        background: "#1a1a2e", color: "#e0e0e0", padding: "12px 24px",
        fontSize: "13px", position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap",
      }}>
        <span style={{ fontWeight: 700, color: "#ffd700", letterSpacing: ".05em" }}>
          ⚠ ADMIN — LMS VIEW AS USER
        </span>
        <span style={{ color: "#aaa", fontSize: "12px" }}>Read-only. Nothing submitted on this user&apos;s behalf.</span>
        <Link href="/admin/lms-user" style={{ marginLeft: "auto", color: "#aaa", fontSize: "12px", textDecoration: "none" }}>
          ← Search
        </Link>
        <Link href="/admin" style={{ color: "#aaa", fontSize: "12px", textDecoration: "none" }}>
          Admin dashboard
        </Link>
      </div>

      <div style={{ padding: "32px 24px 0" }}>
        {/* User card */}
        <div style={{
          background: "#f9f9f9", border: "1px solid #e5e5e5", borderRadius: "10px",
          padding: "20px 24px", marginBottom: "32px",
        }}>
          <p style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#111" }}>
            {user.email ?? user.phone ?? "Unknown user"}
          </p>
          {user.email && user.phone && (
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#666" }}>{user.phone}</p>
          )}
          <p style={{ margin: "0 0 4px", fontFamily: "monospace", fontSize: "11px", color: "#bbb" }}>{user.id}</p>
          <p style={{ margin: "0", fontSize: "12px", color: "#888" }}>
            Registered {formatTs(new Date(user.created_at))}
          </p>
          {purchase && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e0e0e0" }}>
              <span style={{
                display: "inline-block", padding: "3px 10px", borderRadius: "5px",
                fontSize: "12px", fontWeight: 600, background: "#d4edda", color: "#155724", marginRight: "10px",
              }}>
                {purchase.tier === "full" ? "Full 6-week" : "Week 1 only"}
              </span>
              {archetype && (
                <span style={{ fontSize: "13px", color: "#444" }}>
                  Archetype: <strong>{archetype}</strong>
                  {purchase.child_name && <span style={{ color: "#888" }}> · {purchase.child_name}</span>}
                </span>
              )}
            </div>
          )}
          {!purchase && (
            <p style={{ marginTop: "10px", fontSize: "13px", color: "#c00" }}>No paid purchase found — LMS access unknown.</p>
          )}
        </div>

        {/* Current position callout */}
        <div style={{ marginBottom: "32px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#888", margin: "0 0 8px" }}>
            Current position
          </p>
          {week3Unlocked ? (
            <p style={{ margin: 0, fontSize: "15px", color: "#111" }}>
              <strong>Week 3</strong>{" "}
              {week3Progress.completedDays.size > 0
                ? `· ${week3Progress.completedDays.size} day(s) complete`
                : "· Not started yet"}
              {" "}· Week 3 unlocked{" "}
              {week2Progress.completionTimes.get(5)
                ? `(W2 Day 5 was ${formatDuration(now.getTime() - week2Progress.completionTimes.get(5)!.getTime())} ago)`
                : ""}
            </p>
          ) : week2Unlocked ? (
            <p style={{ margin: 0, fontSize: "15px", color: "#111" }}>
              <strong>Week 2</strong>{" "}
              {week2Progress.completedDays.size > 0
                ? `· ${week2Progress.completedDays.size} day(s) complete`
                : "· Not started yet"}
              {" "}· Week 2 unlocked{" "}
              {week1Progress.completionTimes.get(5)
                ? `(W1 Day 5 was ${formatDuration(now.getTime() - week1Progress.completionTimes.get(5)!.getTime())} ago)`
                : ""}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "15px", color: "#111" }}>
              <strong>Week 1</strong>{" "}
              · {week1Progress.completedDays.size} day(s) complete
              {!week2HasContent && " · Week 2 content not available"}
            </p>
          )}
        </div>

        {/* Week 1 table */}
        <WeekTable
          weekNum={1}
          summary={week1Summary}
          now={now}
          dayLabel={dayLabel}
          statusBg={statusBg}
          statusColor={statusColor}
          statusText={statusText}
          formatTs={formatTs}
        />

        {/* Week 2 table */}
        <div style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#888", margin: 0 }}>
              Week 2
            </p>
            {!week2HasContent && (
              <span style={{ fontSize: "12px", color: "#aaa" }}>No content available yet</span>
            )}
            {week2HasContent && !week2Unlocked && (
              <span style={{ fontSize: "12px", color: "#c00", fontWeight: 600 }}>LOCKED</span>
            )}
            {week2Unlocked && (
              <span style={{ fontSize: "12px", color: "#155724", fontWeight: 600 }}>UNLOCKED</span>
            )}
          </div>
          {week2HasContent ? (
            <WeekTable
              weekNum={2}
              summary={week2Summary}
              now={now}
              dayLabel={dayLabel}
              statusBg={statusBg}
              statusColor={statusColor}
              statusText={statusText}
              formatTs={formatTs}
            />
          ) : (
            <p style={{ fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>
              Week 2 content not yet available for this user&apos;s archetype.
            </p>
          )}
        </div>

        {/* Week 3 table */}
        <div style={{ marginTop: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#888", margin: 0 }}>
              Week 3
            </p>
            {!week3HasContent && (
              <span style={{ fontSize: "12px", color: "#aaa" }}>No content available yet</span>
            )}
            {week3HasContent && !week3Unlocked && (
              <span style={{ fontSize: "12px", color: "#c00", fontWeight: 600 }}>LOCKED</span>
            )}
            {week3Unlocked && (
              <span style={{ fontSize: "12px", color: "#155724", fontWeight: 600 }}>UNLOCKED</span>
            )}
          </div>
          {week3HasContent ? (
            <WeekTable
              weekNum={3}
              summary={week3Summary}
              now={now}
              dayLabel={dayLabel}
              statusBg={statusBg}
              statusColor={statusColor}
              statusText={statusText}
              formatTs={formatTs}
            />
          ) : (
            <p style={{ fontSize: "13px", color: "#aaa", fontStyle: "italic" }}>
              Week 3 content not yet available for this user&apos;s archetype.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WeekTable sub-component ───────────────────────────────────────────────────

function WeekTable({
  weekNum,
  summary,
  dayLabel,
  statusBg,
  statusColor,
  statusText,
  formatTs,
}: {
  weekNum: number;
  summary: {
    day: number;
    complete: boolean;
    completedAt: Date | undefined;
    unlocked: boolean;
    unlockEta: string | null;
    reflection: string | undefined;
  }[];
  now: Date;
  dayLabel: (d: number) => string;
  statusBg: (c: boolean, u: boolean) => string;
  statusColor: (c: boolean, u: boolean) => string;
  statusText: (c: boolean, u: boolean) => string;
  formatTs: (d: Date) => string;
}) {
  return (
    <div>
      <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "#888", margin: "0 0 12px" }}>
        Week {weekNum}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e5e5", textAlign: "left" }}>
            {["Day", "Status", "Completed at", "Reflection", "Unlock info"].map((h) => (
              <th key={h} style={{ padding: "6px 12px", fontWeight: 600, color: "#555", fontSize: "12px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.map(({ day, complete, completedAt, unlocked, unlockEta, reflection }, i) => (
            <tr
              key={day}
              style={{
                borderBottom: "1px solid #f0f0f0",
                background: i % 2 === 0 ? "#fff" : "#fafafa",
              }}
            >
              <td style={{ padding: "9px 12px", fontWeight: 600 }}>{dayLabel(day)}</td>
              <td style={{ padding: "9px 12px" }}>
                <span style={{
                  display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "12px",
                  fontWeight: 600, background: statusBg(complete, unlocked), color: statusColor(complete, unlocked),
                }}>
                  {statusText(complete, unlocked)}
                </span>
              </td>
              <td style={{ padding: "9px 12px", color: "#555" }}>
                {completedAt ? formatTs(completedAt) : "—"}
              </td>
              <td style={{ padding: "9px 12px", color: "#666" }}>
                {reflection ?? "—"}
              </td>
              <td style={{ padding: "9px 12px", color: "#888", fontSize: "12px" }}>
                {complete
                  ? "—"
                  : unlocked
                  ? "Available now"
                  : unlockEta ?? "Prereq not complete"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
