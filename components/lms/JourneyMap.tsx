"use client";

import { useState } from "react";
import Link from "next/link";

const BG = `'Bricolage Grotesque', system-ui, sans-serif`;
const PP = `'Public Sans', 'Inter', system-ui, sans-serif`;

// Week display names from mockup
export const WEEK_NAMES: Record<number, string> = {
  1: "One Real Instance",
  2: "Screens, The Hard Case",
  3: "Sustained Duration",
  4: "When It Doesn't Go Well",
  5: "With Other People Around",
  6: "Making It Theirs",
};

export type WeekState = {
  week: number;
  completedDays: number[];   // days 1-5 that are complete
  weekendDone: boolean;
  reflections: Record<number, string>; // day → outcome
  unlocked: boolean;
  hasContent: boolean;
};

export type JourneyMapProps = {
  childName: string;
  archetype: string;
  ageBand: string;
  weeks: WeekState[];
  currentWeek: number;
  currentDay: number;           // 0 = weekend
  totalCompleted: number;       // total weekday completions
  workedCount: number;          // reflections with outcome='worked'
  totalReflections: number;
  week3PulseDone: boolean;
};

function root(children: React.ReactNode) {
  return (
    <div style={{ minHeight: "100dvh", background: "var(--jm-paper)", fontFamily: PP, color: "var(--jm-ink)" }}>
      {children}
    </div>
  );
}

type DayNodeState = "done" | "current" | "upcoming";

function DayNode({ label, state, href }: { label: string; state: DayNodeState; href?: string }) {
  const styles: Record<DayNodeState, React.CSSProperties> = {
    done: { background: "var(--jm-accent-b)", color: "#fff", border: "none" },
    current: { background: "var(--jm-white)", border: "2.5px solid var(--jm-accent-b)", color: "var(--jm-accent-b)" },
    upcoming: { background: "var(--jm-paper2)", color: "var(--jm-ink-faint)", border: "1px dashed var(--jm-rule)" },
  };

  const base: React.CSSProperties = {
    width: 38, height: 38, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12.5, fontWeight: 700, flexShrink: 0,
    textDecoration: "none",
    ...styles[state],
  };

  if (state !== "upcoming" && href) {
    return (
      <Link href={href} style={base} title={`Day ${label}`}>
        {state === "done" ? "✓" : label}
      </Link>
    );
  }

  return (
    <div style={base}>{state === "done" ? "✓" : label}</div>
  );
}

type WeekStatus = "done" | "active" | "locked";

function weekStatus(ws: WeekState, currentWeek: number): WeekStatus {
  if (!ws.unlocked) return "locked";
  const allDone = ws.completedDays.length >= 5;
  if (allDone && ws.weekendDone) return "done";
  if (ws.week < currentWeek && allDone) return "done";
  return "active";
}

function WeekBlock({
  ws,
  status,
  currentWeek,
  currentDay,
}: {
  ws: WeekState;
  status: WeekStatus;
  currentWeek: number;
  currentDay: number;
}) {
  const [open, setOpen] = useState(status === "active");
  const [lockedExpanded, setLockedExpanded] = useState(false);

  const badgeStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 800, flexShrink: 0,
    ...(status === "done" ? { background: "var(--jm-accent-soft)", color: "var(--jm-accent-b)" }
      : status === "active" ? { background: "var(--jm-accent-b)", color: "#fff" }
      : { background: "var(--jm-paper2)", color: "var(--jm-ink-faint)" }),
  };

  const weekName = WEEK_NAMES[ws.week] ?? `Week ${ws.week}`;

  let subtext = "";
  if (status === "done") subtext = "Complete · tap a day to review";
  else if (status === "active") {
    const inProgress = ws.completedDays.length > 0;
    subtext = inProgress ? `In progress · Day ${ws.completedDays.length + 1} of 6` : "Starting now";
  } else {
    subtext = `Unlocks after Week ${ws.week - 1}`;
  }

  function handleHeadClick() {
    if (status === "locked") {
      setLockedExpanded(e => !e);
    } else {
      setOpen(o => !o);
    }
  }

  // Determine node state for each day
  function nodeState(day: number): DayNodeState {
    if (ws.completedDays.includes(day)) return "done";
    if (ws.week === currentWeek && day === currentDay) return "current";
    return "upcoming";
  }

  function dayHref(day: number | "W"): string | undefined {
    if (day === "W") return `/lms/week/${ws.week}/weekend`;
    if (day === currentDay && ws.week === currentWeek) return `/lms/week/${ws.week}/day/${day}`;
    if (ws.completedDays.includes(day as number)) return `/lms/week/${ws.week}/day/${day}`;
    return undefined;
  }

  const weekendState: DayNodeState =
    ws.weekendDone ? "done"
    : ws.completedDays.length >= 5 ? "current"
    : "upcoming";

  return (
    <div style={{
      background: "var(--jm-white)",
      border: "1px solid var(--jm-rule)",
      boxShadow: "var(--jm-shadow)",
      borderRadius: 16,
      marginBottom: 12,
      overflow: "hidden",
    }}>
      <div
        onClick={handleHeadClick}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer" }}
      >
        <div style={badgeStyle}>
          {status === "done" ? "✓" : status === "locked" ? "🔒" : ws.week}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 14.5,
            color: status === "locked" ? "var(--jm-ink-faint)" : "var(--jm-ink)",
          }}>
            Week {ws.week} — {weekName}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--jm-ink-faint)" }}>{subtext}</div>
        </div>
        <div style={{ color: "var(--jm-ink-faint)", fontSize: 13, flexShrink: 0 }}>
          {status !== "locked" ? (open ? "▴" : "▾") : ""}
        </div>
      </div>

      {status !== "locked" && open && (
        <div style={{ display: "flex", gap: 10, padding: "4px 20px 18px", flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map(d => (
            <DayNode
              key={d}
              label={String(d)}
              state={nodeState(d)}
              href={dayHref(d)}
            />
          ))}
          <DayNode
            label="W"
            state={weekendState}
            href={weekendState !== "upcoming" ? dayHref("W") : undefined}
          />
        </div>
      )}

      {status === "locked" && lockedExpanded && (
        <div style={{ padding: "0 20px 18px", fontSize: 12.5, color: "var(--jm-ink-faint)" }}>
          This week isn&rsquo;t available yet — it unlocks automatically once the week before it is complete.
        </div>
      )}
    </div>
  );
}

export default function JourneyMap({
  childName,
  archetype,
  ageBand,
  weeks,
  currentWeek,
  currentDay,
  totalCompleted,
  workedCount,
  totalReflections,
}: JourneyMapProps) {
  const overallDay = totalCompleted + 1;
  const progressPct = Math.round((totalCompleted / 30) * 100);

  const archetypeLabel = archetype.startsWith("The ") ? archetype : `The ${archetype}`;
  const ageBandLabel = ageBand === "10-11" ? "10–11" : ageBand === "12-14" ? "12–14" : ageBand;

  return root(
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 60px" }}>
      {/* Logo */}
      <div style={{ display: "flex", justifyContent: "center", padding: "22px 0 6px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 34, width: "auto" }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 13, color: "var(--jm-ink-soft)" }}>
          {childName}&rsquo;s journey · <strong style={{ color: "var(--jm-ink)" }}>Day {overallDay} of 30</strong>
        </div>
        <div style={{
          background: "var(--jm-white)",
          border: "1px solid var(--jm-rule)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--jm-ink-soft)",
        }}>
          {archetypeLabel} · {ageBandLabel}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--jm-paper2)", borderRadius: 20, height: 8, overflow: "hidden", margin: "6px 0 18px" }}>
        <div style={{ background: "var(--jm-accent-b)", height: "100%", borderRadius: 20, width: `${progressPct}%`, transition: "width .4s" }} />
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          { v: `${totalCompleted}`, l: "Days shown up so far" },
          { v: `Week ${currentWeek}`, l: "Currently on" },
          { v: totalReflections > 0 ? `${workedCount} of ${totalReflections}` : "—", l: "Worked, of reflections" },
        ].map(({ v, l }) => (
          <div key={l} style={{
            background: "var(--jm-white)",
            border: "1px solid var(--jm-rule)",
            boxShadow: "var(--jm-shadow)",
            borderRadius: 12,
            padding: "12px 16px",
            flex: 1,
            minWidth: 110,
          }}>
            <div style={{ fontFamily: BG, fontWeight: 800, fontSize: 20, color: "var(--jm-accent)" }}>{v}</div>
            <div style={{ fontSize: 11, color: "var(--jm-ink-faint)", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Attention Health hub card */}
      <Link href="/handbook" style={{ textDecoration: "none" }}>
        <div style={{
          background: "var(--jm-ink)",
          color: "#F4EFE3",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 24,
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>💡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>What is Attention Health?</div>
            <div style={{ fontSize: 12, color: "rgba(244,239,227,.6)" }}>A quick refresher on the idea behind all six weeks</div>
          </div>
          <div style={{ marginLeft: "auto", color: "var(--jm-gold)", fontWeight: 700, fontSize: 12.5, whiteSpace: "nowrap" as const }}>Open →</div>
        </div>
      </Link>

      {/* Week blocks */}
      {weeks.map(ws => {
        const status = weekStatus(ws, currentWeek);
        return (
          <WeekBlock
            key={ws.week}
            ws={ws}
            status={status}
            currentWeek={currentWeek}
            currentDay={currentDay}
          />
        );
      })}
    </div>
  );
}
