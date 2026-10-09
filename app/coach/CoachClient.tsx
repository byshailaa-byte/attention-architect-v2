"use client";

// Attention Coach — mobile-first trial chat UI (coach-trial branch). Pure client island; the
// server page (app/coach/page.tsx) resolves all copy/cards and passes them as props. We never
// invent parent-facing sentences — only tiny UI labels ("Send", "Day N"). Design system mirrors
// FlowShell / PlanV2: cream ground, navy ink, gold accent, Newsreader headings, Figtree body.
import { useEffect, useRef, useState } from "react";
import { baselineConfirm } from "@/lib/coach-trial/onboarding";
import { splitBold } from "@/lib/coach-trial/markdown";

const C = {
  cream: "#FBF6EE", navy: "#1E3A5F", navyLt: "#2C4A70", gold: "#E8A33D", goldSoft: "#F2C77E",
  ink: "#2E3A4B", dim: "#5B6577", white: "#FFFFFF", line: "#E7E0D2", sel: "#FFF8EC", onNavy: "#CFE0F2",
} as const;
const HEAD = "var(--font-newsreader), Georgia, serif";
const BODY = "var(--font-figtree), system-ui, sans-serif";

type Chip = { label: string; value: string };
type TrialDayCard = {
  trialDay: number; lmsDay: number | null; source: "report" | "lms"; title: string;
  instead?: string; say?: string; after?: string; steps?: string[]; body?: string; fullHref: string;
};
type Props = {
  childName: string; trialDay: number; endsAt: string; messagesLeft: number;
  onboardingDone: boolean; worry: string;
  intro: string; howItWorks: string[];
  baselineQuestion: string; baselineChips: Chip[];
  commitQuestion: string; commitChips: Chip[]; commitDone: string;
  stepEyebrow: string; readFullLabel: string;
  days: TrialDayCard[]; // 4 cards, index 0 = trial day 1
};

// A single transcript entry. "card" renders the highlighted step card for a given day.
type Bubble =
  | { kind: "coach"; text: string }
  | { kind: "parent"; text: string }
  | { kind: "card"; day: TrialDayCard };

// ── Message API shapes ────────────────────────────────────────────────────────
type MessageOk = { reply: string; role: "coach" | "safety"; messagesLeft: number };
type MessageErr = { error: string; reply?: string; messagesLeft?: number };

export default function CoachClient(props: Props) {
  const {
    childName, trialDay, onboardingDone, worry, intro, howItWorks,
    baselineQuestion, baselineChips, commitQuestion, commitChips, commitDone,
    stepEyebrow, readFullLabel, days,
  } = props;
  void childName;

  const todayCard = days[Math.min(Math.max(trialDay, 1), days.length) - 1] ?? days[0];

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [messagesLeft, setMessagesLeft] = useState<number>(props.messagesLeft);
  // Onboarding gating: which chip sets are still open, and whether the input bar is revealed.
  const [baselineOpen, setBaselineOpen] = useState<boolean>(!onboardingDone);
  const [commitOpen, setCommitOpen] = useState<boolean>(false);
  const [inputReady, setInputReady] = useState<boolean>(onboardingDone);
  const [draft, setDraft] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const seeded = useRef<boolean>(false);

  // Seed the transcript once. Onboarding reveals bubbles sequentially (a small staged feel);
  // the returning-day path shows a short opener + today's card and opens input immediately.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    if (onboardingDone) {
      const queue: Bubble[] = [
        { kind: "coach", text: `Day ${trialDay}` },
        { kind: "card", day: todayCard },
      ];
      revealSequentially(queue);
      return;
    }

    // Fresh onboarding: intro, each how-it-works line, the baseline question. Chips open after.
    const queue: Bubble[] = [
      { kind: "coach", text: intro },
      ...howItWorks.map((t): Bubble => ({ kind: "coach", text: t })),
      { kind: "coach", text: baselineQuestion },
    ];
    revealSequentially(queue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reveal bubbles one-by-one on a short timer so they read as distinct, staged messages.
  function revealSequentially(queue: Bubble[], gap = 420) {
    queue.forEach((b, i) => {
      window.setTimeout(() => setBubbles((prev) => [...prev, b]), i * gap);
    });
  }

  // Keep the transcript pinned to the latest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles, inputReady, baselineOpen, commitOpen, notice]);

  // ── Onboarding step c: baseline chip tapped ──
  async function onBaseline(chip: Chip) {
    setBaselineOpen(false);
    setBubbles((prev) => [...prev, { kind: "parent", text: chip.label }]);
    try {
      await fetch("/api/coach/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baselineValue: chip.value }),
      });
    } catch {
      /* non-blocking: the confirm bubble + flow still proceed */
    }
    const confirm = baselineConfirm(worry, chip.value, chip.label);
    // d) today's step card, then e) the commit question + chips.
    revealSequentially([
      { kind: "coach", text: confirm },
      { kind: "card", day: days[0] ?? todayCard },
      { kind: "coach", text: commitQuestion },
    ]);
    window.setTimeout(() => setCommitOpen(true), 3 * 420);
  }

  // ── Onboarding step e: commit chip tapped ──
  async function onCommit(chip: Chip) {
    setCommitOpen(false);
    setBubbles((prev) => [...prev, { kind: "parent", text: chip.label }]);
    try {
      await fetch("/api/coach/onboarding", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitSlot: chip.value }),
      });
    } catch {
      /* non-blocking */
    }
    setBubbles((prev) => [...prev, { kind: "coach", text: commitDone }]);
    window.setTimeout(() => setInputReady(true), 420);
  }

  // ── Input bar: send a typed message ──
  async function onSend() {
    const text = draft.trim();
    if (!text || sending || messagesLeft <= 0) return;
    setNotice("");
    setDraft("");
    setSending(true);
    setBubbles((prev) => [...prev, { kind: "parent", text }]);
    try {
      const res = await fetch("/api/coach/message", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data: MessageOk | MessageErr = await res.json().catch(() => ({ error: "failed" }));

      if (res.ok && "reply" in data && data.reply) {
        setBubbles((prev) => [...prev, { kind: "coach", text: data.reply ?? "" }]);
        if (typeof (data as MessageOk).messagesLeft === "number") setMessagesLeft((data as MessageOk).messagesLeft);
        setSending(false);
        return;
      }

      const err = data as MessageErr;
      if (res.status === 429 || err.error === "daily_limit") {
        setMessagesLeft(0);
        setNotice("No messages left today — back tomorrow");
      } else if (res.status === 403 || err.error === "trial_ended") {
        setMessagesLeft(0);
        setNotice("Your Quick Start has ended. Your report stays open.");
      } else if ((res.status === 502 || err.error === "model_failed") && err.reply) {
        setBubbles((prev) => [...prev, { kind: "coach", text: err.reply ?? "" }]);
      } else {
        setNotice("Something went wrong. Please try again.");
      }
    } catch {
      setNotice("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const noneLeft = messagesLeft <= 0;

  return (
    <div style={{ minHeight: "100dvh", background: C.cream, display: "flex", justifyContent: "center", fontFamily: BODY, color: C.ink }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", minHeight: "100dvh", boxSizing: "border-box" }}>
        {/* HEADER (sticky) */}
        <header style={{ position: "sticky", top: 0, zIndex: 10, background: C.navy, color: "#fff", padding: "14px 18px 12px" }}>
          <div style={{ fontFamily: HEAD, fontSize: 19, fontWeight: 600, lineHeight: 1.2 }}>Attention Coach</div>
          <div style={{ fontSize: 12.5, color: C.onNavy, marginTop: 2 }}>Free Quick Start · Day {trialDay} of 4</div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {[1, 2, 3, 4].map((seg) => (
              <div key={seg} style={{ flex: 1, height: 5, borderRadius: 999, background: seg <= trialDay ? C.gold : "rgba(255,255,255,.22)" }} />
            ))}
          </div>
        </header>

        {/* TRANSCRIPT */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px 10px", display: "flex", flexDirection: "column", gap: 12 }}>
          {bubbles.map((b, i) => <BubbleRow key={i} bubble={b} stepEyebrow={stepEyebrow} readFullLabel={readFullLabel} />)}

          {/* baseline chips (onboarding step c) */}
          {baselineOpen && <ChipRow chips={baselineChips} onPick={onBaseline} />}
          {/* commit chips (onboarding step e) */}
          {commitOpen && <ChipRow chips={commitChips} onPick={onCommit} />}
        </div>

        {/* INPUT BAR (sticky bottom) — only once onboarding has handed off */}
        {inputReady && (
          <div style={{ position: "sticky", bottom: 0, background: C.cream, borderTop: `1px solid ${C.line}`, padding: "10px 14px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.dim, fontWeight: 600 }}>
                {noneLeft ? "No messages left today — back tomorrow" : `${messagesLeft} left today`}
              </span>
              {notice && <span style={{ fontSize: 12, color: "#8C3F22", fontWeight: 600, textAlign: "right" }}>{notice}</span>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSend(); } }}
                placeholder={noneLeft ? "Back tomorrow" : "Ask the Coach…"}
                rows={1}
                disabled={noneLeft || sending}
                style={{
                  flex: 1, resize: "none", minHeight: 44, maxHeight: 120, padding: "11px 13px", borderRadius: 12,
                  border: `1.5px solid ${C.line}`, background: C.white, color: C.ink, fontFamily: BODY, fontSize: 15,
                  lineHeight: 1.4, outline: "none", boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => void onSend()}
                disabled={noneLeft || sending || !draft.trim()}
                style={{
                  flexShrink: 0, minHeight: 44, padding: "0 18px", borderRadius: 12, border: "none",
                  background: (noneLeft || sending || !draft.trim()) ? C.goldSoft : C.gold, color: "#1a1a1a",
                  fontWeight: 700, fontSize: 15, cursor: (noneLeft || sending || !draft.trim()) ? "default" : "pointer",
                  fontFamily: BODY,
                }}
              >
                {sending ? "…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Render **bold** only — safe markdown (no HTML, no other tags), via the shared splitBold helper.
function renderBold(text: string): React.ReactNode[] {
  return splitBold(text).map((p, i) =>
    p.bold ? <strong key={i} style={{ fontWeight: 700 }}>{p.text}</strong> : <span key={i}>{p.text}</span>,
  );
}

// ── A transcript row: coach bubble (left/white), parent bubble (right/gold), or step card ──
function BubbleRow({ bubble, stepEyebrow, readFullLabel }: { bubble: Bubble; stepEyebrow: string; readFullLabel: string }) {
  if (bubble.kind === "card") return <StepCard day={bubble.day} stepEyebrow={stepEyebrow} readFullLabel={readFullLabel} />;

  const isParent = bubble.kind === "parent";
  return (
    <div style={{ display: "flex", justifyContent: isParent ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "82%", padding: "10px 14px", fontSize: 15, lineHeight: 1.5,
          borderRadius: isParent ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isParent ? C.gold : C.white,
          color: isParent ? "#1a1a1a" : C.ink,
          border: isParent ? "none" : `1px solid ${C.line}`,
          fontWeight: isParent ? 600 : 400,
          whiteSpace: "pre-wrap",
        }}
      >
        {isParent ? bubble.text : renderBold(bubble.text)}
      </div>
    </div>
  );
}

// ── Tappable chips shown under a coach question (parent side, gold-tinted) ──
function ChipRow({ chips, onPick }: { chips: Chip[]; onPick: (c: Chip) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", paddingTop: 2 }}>
      {chips.map((chip) => (
        <button
          key={chip.value}
          onClick={() => onPick(chip)}
          style={{
            minHeight: 40, padding: "8px 14px", borderRadius: 999, cursor: "pointer",
            border: `1.5px solid ${C.gold}`, background: C.sel, color: C.navy, fontWeight: 600,
            fontSize: 14, fontFamily: BODY,
          }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

// ── The highlighted "TODAY'S STEP" card ──
function StepCard({ day, stepEyebrow, readFullLabel }: { day: TrialDayCard; stepEyebrow: string; readFullLabel: string }) {
  return (
    <div
      style={{
        background: C.white, border: `1.5px solid ${C.line}`, borderLeft: `4px solid ${C.gold}`,
        borderRadius: "0 14px 14px 0", padding: "16px 18px", margin: "2px 0",
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".1em", color: C.gold, textTransform: "uppercase", marginBottom: 8 }}>
        {stepEyebrow}
      </div>
      <div style={{ fontFamily: HEAD, fontSize: 18, color: C.navy, lineHeight: 1.3, marginBottom: 10 }}>{day.title}</div>

      {day.source === "report" ? (
        <>
          {day.instead && <p style={{ fontSize: 14.5, color: C.dim, lineHeight: 1.5, margin: "0 0 8px" }}>Instead of {day.instead}</p>}
          {day.say && (
            <p style={{ fontFamily: HEAD, fontSize: 16.5, color: C.navy, lineHeight: 1.5, margin: "0 0 10px" }}>
              “{day.say}”
            </p>
          )}
          {day.steps && day.steps.length > 0 && (
            <ol style={{ margin: "0 0 12px", paddingLeft: 20 }}>
              {day.steps.map((s, i) => (
                <li key={i} style={{ fontSize: 15, lineHeight: 1.5, color: C.ink, marginBottom: 6 }}>{s}</li>
              ))}
            </ol>
          )}
        </>
      ) : (
        day.body && <p style={{ fontSize: 15.5, lineHeight: 1.55, color: C.ink, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{day.body}</p>
      )}

      {/* "Read the full step" only on Day 1 (the report) — trial users can't open the paid LMS
          library, so Days 2–4 show the inline step text only. */}
      {day.source === "report" && (
        <a
          href={day.fullHref}
          style={{
            display: "inline-block", fontSize: 14, fontWeight: 700, color: C.navy,
            textDecoration: "underline", textDecorationColor: C.gold, textUnderlineOffset: 3,
          }}
        >
          {readFullLabel}
        </a>
      )}
    </div>
  );
}
