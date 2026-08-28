import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "explorer",
  week: 2,
  weekTitle: "The Same Notepad, Even With Screens",

  weeklyReading: {
    introShared: `Video-to-video, game-to-game — it looks like mindless drift, but watch closely and you'll usually find the same connecting-mind pattern that shows up everywhere else in {{child_name}}'s day, just moving faster. This week doesn't try to slow the drift down. It gives it the same lightweight home Week 1 built for tangents anywhere else — a way to note, not lose, without breaking the flow that makes screens feel good in the first place.`,

    moveCalibration: {
      "8-9":  `Keep the capture as simple as possible — a single sticky note near the screen, or just you jotting it down while {{child_pronoun_subj}} keeps watching. The goal is zero friction.`,
      "10-11": `Let {{child_pronoun_obj}} keep a running note {{child_pronoun_poss}} own way, and build in one moment to revisit it together — proving the capture is real, not just a delay tactic.`,
      "12-14": `Ask {{child_pronoun_obj}} to design {{child_pronoun_poss}} own version — a notes app tab, a mental bookmark, whatever fits how {{child_pronoun_subj}} already thinks. Ownership of the system matters more than its exact shape at this age.`,
    },

    moveOutroShared: `What makes this work is matching the system's speed to the domain. A capture method that's too slow or too formal won't survive screen-pace wandering — it needs to be nearly as fast as the drift itself.`,

    whatWorkingLooksLike: `A good week looks like the capture actually getting used, even loosely — not perfect discipline, just some evidence the "come back to it" idea survived contact with real screen speed. A "bad" week usually means the system was too heavy for the domain — simplify further before concluding it doesn't work.`,

    thingToHoldOnto: `The wandering was never a screen problem. It's the same mind, moving at the speed the domain allows. Next week, we build a version of this that holds across a whole week, not just single sessions.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "When {{child_name}} jumps video to video, is there a thread connecting them, or just pure drift? Just watch the pattern today — don't try to change it.",
        "10-11": "Notice today: when {{child_name}} moves from one video or game to another, is there a thread connecting them, or is it pure drift? Just watch the pattern on screens specifically.",
        "12-14": "Notice the thread — or lack of one — as {{child_name}} moves between videos or games. Just observe the pattern today. Don't act on it yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Give screen-time ideas the same \"write it down, come back\" landing spot.",
      content: {
        "8-9":   "If something makes {{child_name}} want to look something else up, write it down, come back after. You can keep the list — the pad can be yours. Zero friction for {{child_pronoun_obj}}.",
        "10-11": "Introduce a lightweight version of the \"come back to it\" pad — even for screens: *\"If something makes you want to look something else up, note it, we'll check it after.\"* Keep it as simple as possible.",
        "12-14": "Build a lightweight capture system together. Ask directly: *\"What's a fast way to note something without breaking your flow?\"* Use {{child_pronoun_poss}} own answer — the system has to be {{child_pronoun_poss}}, not imposed.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Today, actually revisit one of the noted ideas together — proving the capture is real, not just a delay.",
          mixed:      "Did the capture happen, or did it get skipped once the next video started? Keep the system even lighter — it needs to survive screen speed.",
          didnt_land: "The system may need to be lighter-weight to survive screen pace. Simplify it further and try again today.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and actually revisit one.",
      content: {
        "8-9":   "Same pad, same idea. And today: actually go back to one thing you noted. Even briefly — it's what proves the capture is a real system, not just a list.",
        "10-11": "Same move — and today, revisit one captured idea together. That's what proves it's a real system, not just a delay.",
        "12-14": "Same move. Today: follow up on one captured idea together — proving the system is {{child_pronoun_poss}}, not something imposed on {{child_pronoun_obj}}.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Set a real end time, and let the notepad hold what's unfinished.",
      content: {
        "8-9":   "Give the screen a real time edge today. Not on what {{child_pronoun_subj}} explores — only on how long.",
        "10-11": "Set a real time boundary too. Not on what {{child_pronoun_subj}} explores — only on how long. A clear edge, same as any other domain.",
        "12-14": "A real time boundary too. Discussed together — the same protected edge as any other domain in {{child_pronoun_poss}} day.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say the system worked, not that they logged off on time.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"That's the same thing you do with ideas everywhere — just faster.\"*",
        "10-11": "Tell {{child_name}}: *\"That's the exact same thing you do with your ideas everywhere — one thing leads to another. It's not mindless. It's just fast.\"*",
        "12-14": "Tell {{child_name}}: *\"You connect things fast, even on screen. That's not distraction — that's how your mind works.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Same mind, just quicker — the capture idea works on screens the same way it works everywhere else.{{/if}}{{#if week_trend == "mixed"}}Normal. Capture systems need to match the speed of the domain — if it wasn't quite fast enough, simplify.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the pad simple enough to actually use at screen speed? Even one extra step is often enough to break it.{{/if}}

The wandering was never a screen problem. Next week, the same system holds across a longer stretch.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}The wandering was never screen-specific — same connecting mind, just moving faster. The capture idea works anywhere.{{/if}}{{#if week_trend == "mixed"}}Normal. Capture systems need to match the speed of the domain — a method that's too slow won't survive screen pace.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the capture method lightweight enough to actually survive screen-speed? It needs to be nearly as fast as the drift itself — simplify further.{{/if}}

Next week, we build a version of this that holds across a whole week, not just single sessions.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Same connecting mind, just quicker on screen — the capture system works because it was {{child_pronoun_poss}}, not imposed.{{/if}}{{#if week_trend == "mixed"}}Normal. Screen-speed wandering needs near-zero-friction capture — if it wasn't quite fast enough, simplify.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the system genuinely {{child_pronoun_poss}}? Ownership of the capture method matters as much as its shape — a system that feels imposed won't survive.{{/if}}

The wandering was never a screen problem. It's the same mind, moving at the speed the domain allows.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
