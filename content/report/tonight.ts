import type { TonightTip } from "@/content/types";

// Tonight-tips — keyed by archetype displayName — §6 TRY THIS TONIGHT.
export const tonightTips: Record<string, TonightTip> = {
  "The Storm": {
    instead: "\"Here's what we're doing tonight.\"",
    try:     "\"You choose — which one first?\"",
    why:     "A Storm's attention switches on with real ownership, off the moment something feels handed to {{child_pronoun_obj}}. One small real choice removes the switch-off before it happens.",
  },
  "The Explorer": {
    instead: "\"Go finish your homework.\"",
    try:     "\"Let's just open the notebook together.\"",
    why:     "{{child_name}}'s attention needs a door to walk through, not an instruction to obey. Opening it together removes the hardest step — starting.",
  },
  "The Captain": {
    instead: "\"Do it this way.\"",
    try:     "\"You're in charge of this one — how do you want to run it?\"",
    why:     "A Captain's attention holds when the lead is {{child_pronoun_poss}} own — not following someone else's plan. Handing over command, even for one task, is often enough.",
  },
  "The All-In Kid": {
    instead: "\"You have twenty minutes.\"",
    try:     "\"Take as long as you need on this one.\"",
    why:     "Goes all the way in when the moment is genuinely protected, and scatters the instant it feels boxed in. Removing the clock removes the fence.",
  },
  "The Inventor": {
    instead: "\"Here's how to do it.\"",
    try:     "\"Show me how you'd do it.\"",
    why:     "Locks in when the approach is genuinely {{child_pronoun_poss}} own, drifts the moment it feels like someone else's method. Asking, not telling, keeps the pen in {{child_pronoun_poss}} hand.",
  },
  "The Magnet": {
    instead: "\"Go do your homework in your room.\"",
    try:     "\"I'll sit here while you start.\"",
    why:     "Draws focus from someone simply being present, not from being managed. Presence is the fuel, not correction.",
  },
  "The Glue": {
    instead: "jumping straight to the task.",
    try:     "\"Before we start — is everything okay?\"",
    why:     "Can't concentrate until the people around {{child_pronoun_obj}} feel connected first. Clearing the air is the actual first step, not a delay before it.",
  },
  "The Live Wire": {
    instead: "\"Just get through it.\"",
    try:     "\"Let's see if you can beat yesterday's time.\"",
    why:     "Shows up fully when something real is at stake, fades fast when it isn't. A little real charge changes a flat task.",
  },
};
