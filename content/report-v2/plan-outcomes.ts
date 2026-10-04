// DRAFT — for Shaily. Plan v2 "What changes, week by week": one outcome line per worry,
// per week, mapped onto the 6 WEEK_TITLES (lib/report/skills.ts). Gold voice, concrete,
// outcome-first. NO "homework" unless the worry itself is homework.
//
// Week order (titles): 1 Getting started · 2 Changing the first small thing ·
// 3 Staying with it on an ordinary day · 4 Coming back after a slip ·
// 5 Doing it without you in the room · 6 Running it themselves.
import { canonicalConcern } from "@/lib/report-v2/goal-mapping";

export const WEEK_OUTCOMES: Record<string, [string, string, string, string, string, string]> = {
  reminders: [
    "Starts the first task without being told twice.",
    "Gets going even when something easier is calling.",
    "Begins on a normal day, not just a good one.",
    "Starts again after a day it didn't happen.",
    "Starts without a reminder, even when you're not in the room.",
    "Gets going on their own, most days.",
  ],
  homework: [
    "Sits down to homework without the fight.",
    "Stays with it when something pulls them away.",
    "Gets through homework on a normal evening.",
    "Picks it back up after a rough night.",
    "Starts homework calmly, even when you're not in the room.",
    "Runs their homework routine themselves.",
  ],
  screens: [
    "Turns it off at the agreed time, calmly.",
    "Stops even when the next thing is tempting.",
    "The handover works on an ordinary evening.",
    "Back to calm stops after one that went wrong.",
    "Screens go off even when you're not in the room.",
    "Manages their own screen time, mostly.",
  ],
  confidence: [
    "Tries the first hard bit before asking.",
    "Keeps trying when it would be easier to stop.",
    "Has a go on an ordinary day, not just an easy one.",
    "Tries again after one that didn't work.",
    "Tries the hard part before calling you in.",
    "Backs themselves to try first, most times.",
  ],
  giveup: [
    "Has a second go after the first try fails.",
    "Pushes past the first wobble, not just the easy start.",
    "Keeps going on a normal day.",
    "Comes back the day after a big flop.",
    "Keeps going after a mistake, even with you out of the room.",
    "Keeps going on their own, most of the time.",
  ],
  finish: [
    "Gets going with the end already in sight.",
    "Stays with it through the dull middle.",
    "Finishes on an ordinary day, not just a fun one.",
    "Comes back to finish after stopping early.",
    "Finishes the task with you out of the room.",
    "Sees things through on their own, mostly.",
  ],
  other: [
    "Gets started without the usual push.",
    "Stays with it when something pulls them away.",
    "Starts and keeps going on a normal day.",
    "Gets back on track after an off day.",
    "Keeps the habit going when you're not watching.",
    "Starts and finishes on their own, most days.",
  ],
};

export function weekOutcomesFor(concernKey: string | null | undefined): [string, string, string, string, string, string] {
  return WEEK_OUTCOMES[canonicalConcern(concernKey)] ?? WEEK_OUTCOMES.other;
}
