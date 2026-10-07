// CRM data contract. The UI depends ONLY on these types + the CrmSource interface
// (lib/admin/crm/source.ts) resolved via getCrmSource() (lib/admin/crm/index.ts).
// The real backend (next prompt) implements CrmSource and swaps in with zero UI changes.

export type LeadStage = "not_opened" | "read_report" | "reached_plan" | "replied" | "bought";

export type CallOutcome = "connected" | "no_answer" | "call_back" | "wrong_number";
export type LeadStatus = "interested" | "thinking" | "bought" | "not_now";
export type Objection = "price" | "time" | "will_it_work" | "ask_spouse" | "later" | "other";

// The call screen's talking points, assembled from the parent's report.
export type ReportSummary = {
  worry: string;          // "You have to remind Kabir about almost everything."
  focusWhen: string;      // "He's working something out his own way."
  hardPart: string;       // "Starting when the how has already been decided for him."
  tonightStep: string;    // "Offer two ways to start. Let him pick."
  parentInstinct: string; // "Repeats the reminder" (never named on the call)
  typeName: string;       // "Inventor"
  ageBand: string;        // "10–11"
  goal: string;           // "starts on his own"
};

export type TimelineEvent = {
  at: string;             // display stamp, e.g. "4 Oct 9:12 pm"
  text: string;           // "Finished the assessment, left her number"
};

export type CallLog = {
  id: string;
  at: string;
  outcome: CallOutcome;
  status?: LeadStatus;
  objection?: Objection;
  note?: string;
  nextFollowUp?: string;  // "Tomorrow" | "In 3 days" | an ISO date
};

export type Lead = {
  id: string;
  parentName: string;         // "Priya"
  parentRelation: string;     // "Kabir's mother"
  childName: string;          // "Kabir"
  ageBand: string;            // "10–11"
  phoneE164: string;          // "+919812345210" — full number only in tel:/wa.me hrefs
  typeName: string;           // archetype, "Inventor"
  worry: string;              // "reminders"
  goal: string;               // "starts on his own"
  stage: LeadStage;
  status: string;             // Follow-up/status column: "Callback" | "New" | "No answer ×1" | "Messaged" | "Interested"
  followUpDue: string;        // "Today 6:00 pm" | "Today" | "Tomorrow" | "Thu" | "—"
  followUpUrgent: boolean;    // true → render in warm-alert colour (due today)
  lastNote: string;           // "Asked about the 3 calls" | "—"
  leadAt: string;             // "4 Oct"
  reportId: string;           // Open report ↗  → /report/<reportId>
  report: ReportSummary;
  timeline: TimelineEvent[];
  calls: CallLog[];
};

export type MessageDirection = "in" | "out";
export type MessageSource = "auto" | "manual";
export type MessageCategory = "utility" | "marketing";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export type Message = {
  id: string;
  direction: MessageDirection;
  body: string;
  source: MessageSource;
  templateName?: string;
  label?: string;             // AUTO header override, e.g. "DRIP STEP 3" (templateName is reused across steps)
  category?: MessageCategory;
  status: MessageStatus;
  at: string;                 // "9:13 pm" | ISO
};

export type Conversation = {
  id: string;
  leadId: string | null;      // null → not matched to a lead
  matched: boolean;
  displayName: string;        // "Priya · Kabir's mother" or masked phone
  childName?: string;
  phoneE164: string;
  stage?: LeadStage;
  lastPreview: string;        // last message preview
  lastAt: string;             // "11:02" | "Yesterday" | "Sun"
  lastInboundAt: string | null; // ISO of last INBOUND message (drives the reply window); null if none
  needsReply: boolean;
  optedOut: boolean;
  dripState: string | null;   // "step 3 of 5 on Thu" | "paused at step 1 of 5" | null
};

// A full thread: the conversation + its messages + the side context used by A3's right panel.
export type Thread = {
  conversation: Conversation;
  messages: Message[];
  savedReplies: { label: string; body: string }[];
  context: {
    report: ReportSummary;
    reportId: string;
    lastCall: string;         // "5 Oct · no answer"
    nextFollowUp: string;     // "today · call"
    drip: string;             // "paused at step 1 of 5"
  } | null;                   // null when unmatched
};

export type Template = {
  name: string;
  category: MessageCategory;
  status: "approved" | "in_review" | "rejected";
  usedFor: string;
  costInr: number;            // per-message cost, e.g. 0.12 or 0.86
};

export type DripStep = {
  order: number;
  label: string;              // "Right away" | "Next morning, 10 am" | "Day 3" …
  title: string;              // "Report ready"
  delay: string;              // human delay used in copy (same as label here)
  description: string;        // "Link to {child}'s report"
  templateName: string;
  category: MessageCategory;
  costInr: number;
  stats: { sent: number; read: number; replied: number };
};

export type Drip = {
  on: boolean;
  parentsInIt: number;
  steps: DripStep[];
};

export type Spend = {
  monthInr: number;           // 412
  freeReplies: number;        // 1000
  usedReplies: number;        // 186
};

export type QueueTab =
  | "due_today" | "replied" | "reached_plan" | "read_report" | "callbacks" | "interested" | "done";

export type Stats = {
  dueToday: number;
  reachedPlanNotBought: number;
  readReportOnly: number;
  callbacksThisWeek: number;
  boughtThisMonth: number;
  calledThisMonth: number;
  // nav badges:
  callsDue: number;
  needsReply: number;
  // live calling queue: count per segment A–E (absent on fixture/preview data).
  segments?: { A: number; B: number; C: number; D: number; E: number };
};

export type LogCallInput = {
  leadId: string;
  outcome: CallOutcome;
  status?: LeadStatus;
  objection?: Objection;
  note?: string;
  nextFollowUp?: string;
};

export type SendMessageInput = {
  conversationId: string;
  body: string;
  templateName?: string;      // required when the reply window is closed
};

export type ConversationFilter = "needs_reply" | "all" | "drip_running" | "opted_out";
