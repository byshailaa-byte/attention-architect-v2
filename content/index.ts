// Runtime content lookups for report renderer (Phase 4) and LMS (Phase 6).
// Keys match the values produced by scorer.ts: archetype displayName and parent_pattern displayName.

import type { ArchetypeContent, PatternContent, FitContent, LmsWeekContent } from "./types";

// ── Archetypes ────────────────────────────────────────────────────────────────

import { storm }      from "./archetypes/storm";
import { glue }       from "./archetypes/glue";
import { captain }    from "./archetypes/captain";
import { inventor }   from "./archetypes/inventor";
import { explorer }   from "./archetypes/explorer";
import { magnet }     from "./archetypes/magnet";
import { live_wire }  from "./archetypes/live-wire";
import { all_in_kid } from "./archetypes/all-in-kid";

export const archetypeContent: Record<string, ArchetypeContent> = {
  "The Storm":       storm,
  "The Glue":        glue,
  "The Captain":     captain,
  "The Inventor":    inventor,
  "The Explorer":    explorer,
  "The Magnet":      magnet,
  "The Live Wire":   live_wire,
  "The All-In Kid":  all_in_kid,
};

// ── Parent patterns ───────────────────────────────────────────────────────────

import { pusher }      from "./patterns/pusher";
import { quick_fixer } from "./patterns/quick-fixer";
import { negotiator }  from "./patterns/negotiator";
import { steady_hand } from "./patterns/steady-hand";

export const patternContent: Record<string, PatternContent> = {
  "The Pusher":      pusher,
  "The Quick Fixer": quick_fixer,
  "The Negotiator":  negotiator,
  "The Steady Hand": steady_hand,
};

// ── Fit reveals (archetype × pattern) ────────────────────────────────────────

import { fit as storm__pusher }      from "./fits/storm--pusher";
import { fit as storm__quick_fixer } from "./fits/storm--quick-fixer";
import { fit as storm__negotiator }  from "./fits/storm--negotiator";
import { fit as storm__steady_hand } from "./fits/storm--steady-hand";
import { fit as glue__pusher }       from "./fits/glue--pusher";
import { fit as glue__quick_fixer }  from "./fits/glue--quick-fixer";
import { fit as glue__negotiator }   from "./fits/glue--negotiator";
import { fit as glue__steady_hand }  from "./fits/glue--steady-hand";
import { fit as captain__pusher }      from "./fits/captain--pusher";
import { fit as captain__quick_fixer } from "./fits/captain--quick-fixer";
import { fit as captain__negotiator }  from "./fits/captain--negotiator";
import { fit as captain__steady_hand } from "./fits/captain--steady-hand";
import { fit as inventor__pusher }      from "./fits/inventor--pusher";
import { fit as inventor__quick_fixer } from "./fits/inventor--quick-fixer";
import { fit as inventor__negotiator }  from "./fits/inventor--negotiator";
import { fit as inventor__steady_hand } from "./fits/inventor--steady-hand";
import { fit as explorer__pusher }      from "./fits/explorer--pusher";
import { fit as explorer__quick_fixer } from "./fits/explorer--quick-fixer";
import { fit as explorer__negotiator }  from "./fits/explorer--negotiator";
import { fit as explorer__steady_hand } from "./fits/explorer--steady-hand";
import { fit as magnet__pusher }      from "./fits/magnet--pusher";
import { fit as magnet__quick_fixer } from "./fits/magnet--quick-fixer";
import { fit as magnet__negotiator }  from "./fits/magnet--negotiator";
import { fit as magnet__steady_hand } from "./fits/magnet--steady-hand";
import { fit as live_wire__pusher }      from "./fits/live-wire--pusher";
import { fit as live_wire__quick_fixer } from "./fits/live-wire--quick-fixer";
import { fit as live_wire__negotiator }  from "./fits/live-wire--negotiator";
import { fit as live_wire__steady_hand } from "./fits/live-wire--steady-hand";
import { fit as all_in_kid__pusher }      from "./fits/all-in-kid--pusher";
import { fit as all_in_kid__quick_fixer } from "./fits/all-in-kid--quick-fixer";
import { fit as all_in_kid__negotiator }  from "./fits/all-in-kid--negotiator";
import { fit as all_in_kid__steady_hand } from "./fits/all-in-kid--steady-hand";

export const fitContent: Record<string, FitContent> = {
  "The Storm|The Pusher":       storm__pusher,
  "The Storm|The Quick Fixer":  storm__quick_fixer,
  "The Storm|The Negotiator":   storm__negotiator,
  "The Storm|The Steady Hand":  storm__steady_hand,
  "The Glue|The Pusher":        glue__pusher,
  "The Glue|The Quick Fixer":   glue__quick_fixer,
  "The Glue|The Negotiator":    glue__negotiator,
  "The Glue|The Steady Hand":   glue__steady_hand,
  "The Captain|The Pusher":     captain__pusher,
  "The Captain|The Quick Fixer": captain__quick_fixer,
  "The Captain|The Negotiator": captain__negotiator,
  "The Captain|The Steady Hand": captain__steady_hand,
  "The Inventor|The Pusher":    inventor__pusher,
  "The Inventor|The Quick Fixer": inventor__quick_fixer,
  "The Inventor|The Negotiator": inventor__negotiator,
  "The Inventor|The Steady Hand": inventor__steady_hand,
  "The Explorer|The Pusher":    explorer__pusher,
  "The Explorer|The Quick Fixer": explorer__quick_fixer,
  "The Explorer|The Negotiator": explorer__negotiator,
  "The Explorer|The Steady Hand": explorer__steady_hand,
  "The Magnet|The Pusher":      magnet__pusher,
  "The Magnet|The Quick Fixer": magnet__quick_fixer,
  "The Magnet|The Negotiator":  magnet__negotiator,
  "The Magnet|The Steady Hand": magnet__steady_hand,
  "The Live Wire|The Pusher":   live_wire__pusher,
  "The Live Wire|The Quick Fixer": live_wire__quick_fixer,
  "The Live Wire|The Negotiator": live_wire__negotiator,
  "The Live Wire|The Steady Hand": live_wire__steady_hand,
  "The All-In Kid|The Pusher":  all_in_kid__pusher,
  "The All-In Kid|The Quick Fixer": all_in_kid__quick_fixer,
  "The All-In Kid|The Negotiator": all_in_kid__negotiator,
  "The All-In Kid|The Steady Hand": all_in_kid__steady_hand,
};

export function getFitContent(archetype: string, pattern: string): FitContent | undefined {
  return fitContent[`${archetype}|${pattern}`];
}

// ── LMS Week 1 ────────────────────────────────────────────────────────────────

import { weekContent as stormWeek1 }     from "./lms/week-1/storm";
import { weekContent as glueWeek1 }      from "./lms/week-1/glue";
import { weekContent as captainWeek1 }   from "./lms/week-1/captain";
import { weekContent as inventorWeek1 }  from "./lms/week-1/inventor";
import { weekContent as explorerWeek1 }  from "./lms/week-1/explorer";
import { weekContent as magnetWeek1 }    from "./lms/week-1/magnet";
import { weekContent as liveWireWeek1 }  from "./lms/week-1/live-wire";
import { weekContent as allInKidWeek1 }  from "./lms/week-1/all-in-kid";

export const lmsWeek1Content: Record<string, LmsWeekContent> = {
  "The Storm":      stormWeek1,
  "The Glue":       glueWeek1,
  "The Captain":    captainWeek1,
  "The Inventor":   inventorWeek1,
  "The Explorer":   explorerWeek1,
  "The Magnet":     magnetWeek1,
  "The Live Wire":  liveWireWeek1,
  "The All-In Kid": allInKidWeek1,
};

// ── LMS Week 2 ────────────────────────────────────────────────────────────────

import { weekContent as stormWeek2 }     from "./lms/week-2/storm";
import { weekContent as glueWeek2 }      from "./lms/week-2/glue";
import { weekContent as captainWeek2 }   from "./lms/week-2/captain";
import { weekContent as inventorWeek2 }  from "./lms/week-2/inventor";
import { weekContent as explorerWeek2 }  from "./lms/week-2/explorer";
import { weekContent as magnetWeek2 }    from "./lms/week-2/magnet";
import { weekContent as liveWireWeek2 }  from "./lms/week-2/live-wire";
import { weekContent as allInKidWeek2 }  from "./lms/week-2/all-in-kid";

export const lmsWeek2Content: Record<string, LmsWeekContent> = {
  "The Storm":      stormWeek2,
  "The Glue":       glueWeek2,
  "The Captain":    captainWeek2,
  "The Inventor":   inventorWeek2,
  "The Explorer":   explorerWeek2,
  "The Magnet":     magnetWeek2,
  "The Live Wire":  liveWireWeek2,
  "The All-In Kid": allInKidWeek2,
};

// ── Phrase tables ─────────────────────────────────────────────────────────────

export { objectivePhrases } from "./phrases/objective";
export { triedPhrases }     from "./phrases/tried";
export { betterPhrases }    from "./phrases/better";
