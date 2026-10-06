// The data contract the CRM UI calls. The fixture implementation lives in fixtures.ts; the
// real backend (next prompt) implements this same interface and is swapped in via index.ts —
// no UI change required. All methods are async so the backend can do real I/O.
import type {
  Lead, Conversation, Thread, Template, Drip, Spend, Stats, QueueTab,
  ConversationFilter, LogCallInput, SendMessageInput,
} from "./types";

export interface CrmSource {
  getStats(): Promise<Stats>;
  getQueue(tab: QueueTab): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  getConversations(filter: ConversationFilter): Promise<Conversation[]>;
  getThread(id: string): Promise<Thread | null>;
  getTemplates(): Promise<Template[]>;
  getDrip(): Promise<Drip>;
  getSpend(): Promise<Spend>;

  // Write actions. In fixture mode these mutate in-memory state and the UI shows
  // "Preview data: not saved".
  logCall(input: LogCallInput): Promise<void>;
  sendMessage(input: SendMessageInput): Promise<void>;
  setDrip(leadId: string, action: "pause" | "resume" | "stop"): Promise<void>;

  // True in fixture mode → UI renders the "Preview data. Nothing is saved or sent." banner.
  readonly isPreview: boolean;
}
