// Fixture CRM source — sample data only, matching the mockups (A1–A4). NEVER real lead data;
// never reads aa-leads-followup.csv. Names are the mockup samples + a few invented ones.
import type { CrmSource } from "./source";
import type {
  Lead, Conversation, Thread, Template, Drip, Spend, Stats, QueueTab,
  ConversationFilter, ReportSummary,
} from "./types";

// ── Leads (Calls queue A1 rows + call screen A2 + people referenced from WhatsApp A3) ──────
const R = (p: Partial<ReportSummary> & Pick<ReportSummary, "worry" | "typeName" | "ageBand" | "goal">): ReportSummary => ({
  focusWhen: "", hardPart: "", tonightStep: "", parentInstinct: "", ...p,
});

const LEADS: Lead[] = [
  {
    id: "priya", parentName: "Priya", parentRelation: "Kabir’s mother", childName: "Kabir", ageBand: "10–11",
    phoneE164: "+919812345210", typeName: "Inventor", worry: "reminders", goal: "starts on his own",
    stage: "replied", status: "Callback", followUpDue: "Today 6:00 pm", followUpUrgent: true,
    lastNote: "“Asked about the 3 calls”", leadAt: "4 Oct", reportId: "fixture-priya",
    report: {
      worry: "You have to remind Kabir about almost everything.",
      focusWhen: "He’s working something out his own way.",
      hardPart: "Starting when the how has already been decided for him.",
      tonightStep: "Offer two ways to start. Let him pick.",
      parentInstinct: "Repeats the reminder",
      typeName: "Inventor", ageBand: "10–11", goal: "starts on his own",
    },
    timeline: [
      { at: "4 Oct 9:12 pm", text: "Finished the assessment, left her number" },
      { at: "4 Oct 9:20 pm", text: "Read all 7 cards" },
      { at: "4 Oct 9:24 pm", text: "Opened the plan page, looked at ₹4,999 · didn’t open checkout" },
      { at: "5 Oct 11:02 am", text: "Replied on WhatsApp: “What happens in the 3 calls?”" },
      { at: "5 Oct 7:40 pm", text: "You called · no answer" },
    ],
    calls: [{ id: "c1", at: "5 Oct 7:40 pm", outcome: "no_answer" }],
  },
  {
    id: "neha", parentName: "Neha", parentRelation: "Anaya’s mother", childName: "Anaya", ageBand: "8–9",
    phoneE164: "+919820011221", typeName: "All-In Kid", worry: "confidence", goal: "tries the hard thing first",
    stage: "reached_plan", status: "New", followUpDue: "Today", followUpUrgent: true,
    lastNote: "—", leadAt: "5 Oct", reportId: "fixture-neha",
    report: R({ worry: "Anaya asks for help before even trying.", focusWhen: "Once she’s into something she picked.",
      hardPart: "Starting cold, before she’s had time to sink in.", tonightStep: "Give her a small, safe first step.",
      parentInstinct: "Steps in to help", typeName: "All-In Kid", ageBand: "8–9", goal: "tries the hard thing first" }),
    timeline: [{ at: "5 Oct 8:40 pm", text: "Finished the assessment, left her number" }, { at: "5 Oct 8:51 pm", text: "Opened the plan page" }],
    calls: [],
  },
  {
    id: "ritu", parentName: "Ritu", parentRelation: "Vihaan’s mother", childName: "Vihaan", ageBand: "12–14",
    phoneE164: "+919833044556", typeName: "Storm", worry: "screens", goal: "screens off without a battle",
    stage: "reached_plan", status: "No answer ×1", followUpDue: "Today", followUpUrgent: true,
    lastNote: "Tried Mon 7:40 pm", leadAt: "3 Oct", reportId: "fixture-ritu",
    report: R({ worry: "Getting Vihaan off screens is a fight.", focusWhen: "When the idea is his own.",
      hardPart: "A stop he didn’t choose feels like a fight to win.", tonightStep: "Offer two stop times. Let him pick.",
      parentInstinct: "Waits it out", typeName: "Storm", ageBand: "12–14", goal: "screens off without a battle" }),
    timeline: [{ at: "3 Oct 7:10 pm", text: "Finished the assessment, left her number" }, { at: "Mon 7:40 pm", text: "You called · no answer" }],
    calls: [{ id: "c2", at: "Mon 7:40 pm", outcome: "no_answer" }],
  },
  {
    id: "sonal", parentName: "Sonal", parentRelation: "Meera’s mother", childName: "Meera", ageBand: "12–14",
    phoneE164: "+919845566778", typeName: "Live Wire", worry: "giveup", goal: "keeps going after the first try",
    stage: "reached_plan", status: "New", followUpDue: "Today", followUpUrgent: true,
    lastNote: "—", leadAt: "5 Oct", reportId: "fixture-sonal",
    report: R({ worry: "Meera gives up the moment it gets hard.", focusWhen: "With a clock to beat or someone watching.",
      hardPart: "Once the excitement drops, nothing is left to push for.", tonightStep: "Turn the next try into a quick challenge.",
      parentInstinct: "Reasons with her", typeName: "Live Wire", ageBand: "12–14", goal: "keeps going after the first try" }),
    timeline: [{ at: "5 Oct 6:02 pm", text: "Finished the assessment, left her number" }, { at: "5 Oct 6:12 pm", text: "Opened the plan page" }],
    calls: [],
  },
  {
    id: "kavita", parentName: "Kavita", parentRelation: "Aarav’s mother", childName: "Aarav", ageBand: "8–9",
    phoneE164: "+919856677889", typeName: "Explorer", worry: "homework", goal: "finishes what he starts",
    stage: "read_report", status: "Messaged", followUpDue: "Tomorrow", followUpUrgent: false,
    lastNote: "WhatsApp sent Mon", leadAt: "2 Oct", reportId: "fixture-kavita",
    report: R({ worry: "Aarav starts homework, then drifts.", focusWhen: "When a new idea catches his interest.",
      hardPart: "A new idea arrives and the task gets left behind.", tonightStep: "Keep a scrap pad beside him for side-ideas.",
      parentInstinct: "Pushes him to focus", typeName: "Explorer", ageBand: "8–9", goal: "finishes what he starts" }),
    timeline: [{ at: "2 Oct 5:30 pm", text: "Read all 7 cards" }, { at: "Mon", text: "WhatsApp sent" }],
    calls: [],
  },
  {
    id: "anjali-ira", parentName: "Anjali", parentRelation: "Ira’s mother", childName: "Ira", ageBand: "8–9",
    phoneE164: "+919867788990", typeName: "Magnet", worry: "confidence", goal: "tries before asking for help",
    stage: "read_report", status: "Interested", followUpDue: "Thu", followUpUrgent: false,
    lastNote: "“Will discuss with husband”", leadAt: "1 Oct", reportId: "fixture-anjali-ira",
    report: R({ worry: "Ira asks for help before trying.", focusWhen: "With someone nearby.",
      hardPart: "Trying alone, when with someone nearby she’s braver.", tonightStep: "Sit beside her for the first bit.",
      parentInstinct: "Pushes her on", typeName: "Magnet", ageBand: "8–9", goal: "tries before asking for help" }),
    timeline: [{ at: "1 Oct", text: "Read all 7 cards" }, { at: "2 Oct", text: "“Will discuss with husband”" }],
    calls: [],
  },
  {
    id: "pooja", parentName: "Pooja", parentRelation: "Dev’s mother", childName: "Dev", ageBand: "10–11",
    phoneE164: "+919878899001", typeName: "Explorer", worry: "reminders", goal: "starts on his own",
    stage: "not_opened", status: "New", followUpDue: "—", followUpUrgent: false,
    lastNote: "Report link resent", leadAt: "5 Oct", reportId: "fixture-pooja",
    report: R({ worry: "You remind Dev about almost everything.", focusWhen: "When something new catches his interest.",
      hardPart: "A new idea arrives and the task gets left behind.", tonightStep: "Offer two ways to start.",
      parentInstinct: "Repeats the reminder", typeName: "Explorer", ageBand: "10–11", goal: "starts on his own" }),
    timeline: [{ at: "5 Oct", text: "Report link resent" }],
    calls: [],
  },
  // People referenced from the WhatsApp inbox (A3) that aren't in the A1 queue:
  {
    id: "rohit", parentName: "Rohit", parentRelation: "Meera’s father", childName: "Meera", ageBand: "10–11",
    phoneE164: "+919811122334", typeName: "Captain", worry: "homework", goal: "runs her own homework",
    stage: "read_report", status: "New", followUpDue: "Today", followUpUrgent: true,
    lastNote: "“Is this online or in person?”", leadAt: "5 Oct", reportId: "fixture-rohit",
    report: R({ worry: "Homework with Meera is a daily negotiation.", focusWhen: "When it’s truly hers to run.",
      hardPart: "Homework is someone else’s plan, and she wants to run things.", tonightStep: "Hand her the real call on how to start.",
      parentInstinct: "Takes over", typeName: "Captain", ageBand: "10–11", goal: "runs her own homework" }),
    timeline: [{ at: "5 Oct 9:30 am", text: "Read the report" }, { at: "5 Oct 9:47 am", text: "Replied on WhatsApp" }],
    calls: [],
  },
  {
    id: "anjali-aarav", parentName: "Anjali", parentRelation: "Aarav’s mother", childName: "Aarav", ageBand: "10–11",
    phoneE164: "+919800220044", typeName: "Glue", worry: "finish", goal: "finishes what he starts",
    stage: "reached_plan", status: "Interested", followUpDue: "Tomorrow", followUpUrgent: false,
    lastNote: "“Will check with my husband”", leadAt: "4 Oct", reportId: "fixture-anjali-aarav",
    report: R({ worry: "Aarav starts strong, then drifts before the end.", focusWhen: "When things feel settled.",
      hardPart: "Something on his mind pulls him away midway.", tonightStep: "A few settled minutes first, then begin.",
      parentInstinct: "Reasons with him", typeName: "Glue", ageBand: "10–11", goal: "finishes what he starts" }),
    timeline: [{ at: "4 Oct", text: "Opened the plan page" }, { at: "Yesterday", text: "“Thank you, will check with my husband”" }],
    calls: [],
  },
  {
    id: "neha-ishaan", parentName: "Neha", parentRelation: "Ishaan’s mother", childName: "Ishaan", ageBand: "12–14",
    phoneE164: "+919700330055", typeName: "Storm", worry: "screens", goal: "screens off without a battle",
    stage: "read_report", status: "Messaged", followUpDue: "—", followUpUrgent: false,
    lastNote: "Plan link sent Sat", leadAt: "Thu", reportId: "fixture-neha-ishaan",
    report: R({ worry: "Getting Ishaan off screens is a battle.", focusWhen: "When the idea is his own.",
      hardPart: "A stop he didn’t choose feels like losing.", tonightStep: "Offer two stop times.",
      parentInstinct: "Waits it out", typeName: "Storm", ageBand: "12–14", goal: "screens off without a battle" }),
    timeline: [{ at: "Thu", text: "Read the report" }, { at: "Sat", text: "Plan link sent (drip)" }],
    calls: [],
  },
];

const byId = new Map(LEADS.map((l) => [l.id, l]));

// Tab → ordered lead ids (matches A1's "Due today" exactly; others filter by stage/status).
const QUEUE_ORDER: Record<QueueTab, string[]> = {
  due_today: ["priya", "neha", "ritu", "sonal", "kavita", "anjali-ira", "pooja"],
  replied: ["priya"],
  reached_plan: ["neha", "ritu", "sonal", "anjali-aarav"],
  read_report: ["kavita", "anjali-ira", "rohit", "neha-ishaan"],
  callbacks: ["priya"],
  interested: ["anjali-ira", "anjali-aarav"],
  done: [],
};

// ── Conversations (WhatsApp inbox A3) ──────────────────────────────────────────
const NOW = () => new Date();
const hoursAgoIso = (h: number) => new Date(NOW().getTime() - h * 3600_000).toISOString();

const CONVERSATIONS: Conversation[] = [
  {
    id: "priya", leadId: "priya", matched: true, displayName: "Priya · Kabir’s mother", childName: "Kabir",
    phoneE164: "+919812345210", stage: "reached_plan", lastPreview: "What happens in the 3 calls?",
    lastAt: "11:02", lastInboundAt: hoursAgoIso(3), needsReply: true, optedOut: false, dripState: "paused at step 1 of 5",
  },
  {
    id: "rohit", leadId: "rohit", matched: true, displayName: "Rohit · Meera’s father", childName: "Meera",
    phoneE164: "+919811122334", stage: "read_report", lastPreview: "Is this online or do we have to come somewhere?",
    lastAt: "09:47", lastInboundAt: hoursAgoIso(1), needsReply: true, optedOut: false, dripState: "paused (she replied)",
  },
  {
    id: "anjali-aarav", leadId: "anjali-aarav", matched: true, displayName: "Anjali · Aarav’s mother", childName: "Aarav",
    phoneE164: "+919800220044", stage: "reached_plan", lastPreview: "Thank you, will check with my husband",
    lastAt: "Yesterday", lastInboundAt: hoursAgoIso(22), needsReply: true, optedOut: false, dripState: "paused (she replied)",
  },
  {
    id: "unmatched-418", leadId: null, matched: false, displayName: "+91 99•• ••• 418",
    phoneE164: "+919912345418", lastPreview: "Price?", lastAt: "Sun", lastInboundAt: hoursAgoIso(72),
    needsReply: true, optedOut: false, dripState: null,
  },
  {
    id: "neha-ishaan", leadId: "neha-ishaan", matched: true, displayName: "Neha · Ishaan’s mother", childName: "Ishaan",
    phoneE164: "+919700330055", stage: "read_report", lastPreview: "You: Here’s the plan link for Ishaan…  ✓✓",
    lastAt: "Sat", lastInboundAt: null, needsReply: false, optedOut: false, dripState: "step 3 of 5 on Thu",
  },
];

const SAVED_REPLIES = [
  { label: "What the 3 calls are", body: "Hi {name}, good question. Here’s how the calls work for {child}’s plan: …" },
  { label: "Price and what’s included", body: "The plan is ₹2,999, or ₹4,999 with three 1:1 calls. Here’s what each covers: …" },
  { label: "Plan link", body: "Here’s {child}’s plan: attentionparents…/r/•••• " },
  { label: "Can I call you?", body: "Would a quick 10-minute call help? When suits you today?" },
];

function buildThread(id: string): Thread | null {
  const conv = CONVERSATIONS.find((c) => c.id === id);
  if (!conv) return null;
  const lead = conv.leadId ? byId.get(conv.leadId) ?? null : null;
  // Priya has the fully-authored thread from A3; others get a short representative thread.
  const messages = id === "priya"
    ? [
        { id: "m1", direction: "out", source: "auto", templateName: "report_ready", category: "utility", status: "read",
          at: "9:13 pm", body: "Hi Priya, Kabir’s attention report is ready. Open it here: attentionparents…/r/••••" } as const,
        { id: "m2", direction: "out", source: "auto", templateName: "step_check_in", category: "marketing", status: "read",
          at: "10:00 am", body: "Did tonight’s step work with Kabir? Reply here and tell us how it went." } as const,
        { id: "m3", direction: "in", source: "manual", status: "delivered", at: "11:02 am",
          body: "What happens in the 3 calls?" } as const,
      ]
    : [
        { id: "m1", direction: "out", source: "auto", templateName: "report_ready", category: "utility", status: "read",
          at: conv.lastAt, body: `Hi ${conv.displayName.split(" ")[0]}, the attention report is ready. Open it here: attentionparents…/r/••••` } as const,
        ...(conv.lastInboundAt
          ? [{ id: "m2", direction: "in", source: "manual", status: "delivered", at: conv.lastAt, body: conv.lastPreview } as const]
          : [{ id: "m2", direction: "out", source: "auto", templateName: "step_check_in", category: "marketing", status: "read", at: conv.lastAt, body: conv.lastPreview.replace(/^You:\s*/, "") } as const]),
      ];
  return {
    conversation: conv,
    messages: [...messages],
    savedReplies: SAVED_REPLIES,
    context: lead ? {
      report: lead.report, reportId: lead.reportId,
      lastCall: lead.calls[0] ? `${lead.calls[0].at} · no answer` : "none yet",
      nextFollowUp: lead.followUpDue !== "—" ? `${lead.followUpDue.toLowerCase()} · call` : "none set",
      drip: conv.dripState ?? "not running",
    } : null,
  };
}

const TEMPLATES: Template[] = [
  { name: "report_ready", category: "utility", status: "approved", usedFor: "Drip, right away", costInr: 0.12 },
  { name: "payment_confirmed", category: "utility", status: "approved", usedFor: "After Razorpay payment, with the login link", costInr: 0.12 },
  { name: "step_check_in", category: "marketing", status: "approved", usedFor: "Drip, next morning", costInr: 0.86 },
  { name: "checking_in_plan", category: "marketing", status: "in_review", usedFor: "Manual, from the inbox when the window is closed", costInr: 0.86 },
  { name: "daily_call_list", category: "utility", status: "approved", usedFor: "8:30 am to you: who’s due today", costInr: 0.12 },
];

const DRIP: Drip = {
  on: true, parentsInIt: 23,
  steps: [
    { order: 1, label: "Right away", title: "Report ready", delay: "Right away", description: "Link to {child}’s report", templateName: "report_ready", category: "utility", costInr: 0.12, stats: { sent: 61, read: 54, replied: 3 } },
    { order: 2, label: "Next morning, 10 am", title: "Did tonight’s step work?", delay: "Next morning, 10 am", description: "Asks how the step went, invites a reply", templateName: "step_check_in", category: "marketing", costInr: 0.86, stats: { sent: 52, read: 41, replied: 9 } },
    { order: 3, label: "Day 3", title: "What the plan covers", delay: "Day 3", description: "Plan link · only if they haven’t bought", templateName: "step_check_in", category: "marketing", costInr: 0.86, stats: { sent: 38, read: 29, replied: 4 } },
    { order: 4, label: "Day 5", title: "Can I call you?", delay: "Day 5", description: "Buttons: “Yes, call me” · “Not now”", templateName: "step_check_in", category: "marketing", costInr: 0.86, stats: { sent: 30, read: 22, replied: 5 } },
    { order: 5, label: "Day 10", title: "Last check-in", delay: "Day 10", description: "Short, no pressure, then the drip ends", templateName: "step_check_in", category: "marketing", costInr: 0.86, stats: { sent: 19, read: 12, replied: 1 } },
  ],
};

const STATS: Stats = {
  dueToday: 7, reachedPlanNotBought: 18, readReportOnly: 24, callbacksThisWeek: 3,
  boughtThisMonth: 1, calledThisMonth: 12, callsDue: 7, needsReply: 4,
};

const SPEND: Spend = { monthInr: 412, freeReplies: 1000, usedReplies: 186 };

export class FixtureSource implements CrmSource {
  readonly isPreview = true;
  async getStats() { return STATS; }
  async getQueue(tab: QueueTab) { return (QUEUE_ORDER[tab] ?? []).map((id) => byId.get(id)!).filter(Boolean); }
  async getLead(id: string) { return byId.get(id) ?? null; }
  async getConversations(filter: ConversationFilter) {
    if (filter === "needs_reply") return CONVERSATIONS.filter((c) => c.needsReply && !c.optedOut);
    if (filter === "drip_running") return CONVERSATIONS.filter((c) => c.dripState?.startsWith("step"));
    if (filter === "opted_out") return CONVERSATIONS.filter((c) => c.optedOut);
    return CONVERSATIONS;
  }
  async getThread(id: string) { return buildThread(id); }
  async getTemplates() { return TEMPLATES; }
  async getDrip() { return DRIP; }
  async getSpend() { return SPEND; }
  // Preview mode: no-op writes (UI shows an optimistic update + "Preview data: not saved").
  async logCall() { /* preview: not saved */ }
  async sendMessage() { /* preview: not saved */ }
  async setDrip() { /* preview: not saved */ }
}
