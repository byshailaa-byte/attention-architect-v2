// Single entry point for the CRM UI. UI code imports ONLY from here — data via getCrmSource()
// and all types re-exported below. The next prompt replaces FixtureSource with the real backend
// here; no UI file changes.
import { FixtureSource } from "./fixtures";
import type { CrmSource } from "./source";

let _source: CrmSource | null = null;

export function getCrmSource(): CrmSource {
  if (!_source) _source = new FixtureSource();
  return _source;
}

export type { CrmSource } from "./source";
export * from "./types";
export {
  replyWindow, composerMode, rowPill, waLink, telLink, maskPhone, nextLeadId, formatInr,
  COMPOSER_FREE_NOTE, type ReplyWindow, type RowPill,
} from "./logic";
