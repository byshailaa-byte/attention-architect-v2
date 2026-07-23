import type { TonightTip } from "@/content/types";

// Tonight-tips — keyed by archetype displayName — §6 TRY THIS TONIGHT.
export const tonightTips: Record<string, TonightTip> = {
  "The Storm": {
    instead: "\"Here's what we're doing tonight.\"",
    try:     "\"You choose — which one first?\"",
    why:     "One small real choice removes the switch-off before it happens.",
  },
  "The Explorer": {
    instead: "\"Go finish your homework.\"",
    try:     "\"Let's just open the notebook together.\"",
    why:     "Opening it together removes the hardest step — starting.",
  },
  "The Captain": {
    instead: "\"Do it this way.\"",
    try:     "\"You're in charge of this one — how do you want to run it?\"",
    why:     "Handing over command, even for one task, is often enough.",
  },
  "The All-In Kid": {
    instead: "\"You have twenty minutes.\"",
    try:     "\"Take as long as you need on this one.\"",
    why:     "Removing the clock removes the fence — that's the whole shift tonight.",
  },
  "The Inventor": {
    instead: "\"Here's how to do it.\"",
    try:     "\"Show me how you'd do it.\"",
    why:     "Asking, not telling, keeps the pen in {{child_pronoun_poss}} hand — that's the whole shift tonight.",
  },
  "The Magnet": {
    instead: "\"Go do your homework in your room.\"",
    try:     "\"I'll sit here while you start.\"",
    why:     "Presence is the fuel — sitting nearby without managing IS the move.",
  },
  "The Glue": {
    instead: "jumping straight to the task.",
    try:     "\"Before we start — is everything okay?\"",
    why:     "Clearing the air is the actual first step, not a delay before it.",
  },
  "The Live Wire": {
    instead: "\"Just get through it.\"",
    try:     "\"Let's see if you can beat yesterday's time.\"",
    why:     "A little real charge changes a flat task — that's the whole shift.",
  },
};
