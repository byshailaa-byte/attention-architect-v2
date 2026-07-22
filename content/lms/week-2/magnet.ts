import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 2,

  weeklyReading: {
    introShared: `Screens have one quality almost nothing else in {{child_name}}'s day has: they're always on, always available, and they never get bored of {{child_pronoun_obj}}. For {{child_name}} — a child whose focus is genuinely steadier with company than alone — that always-on availability is a real competitor to you, not a character flaw in {{child_pronoun_obj}}. This week doesn't fight screens by removing them faster. It offers the thing they're actually substituting for: real, low-pressure presence, given generously enough that the always-on companion has some real competition.`,

    moveCalibration: {
      "8-9":  `Sit close during a non-screen activity, doing your own simple thing — reading, folding laundry, anything low-key. Warmth and proximity matter more than any specific activity.`,
      "10-11": `Be present at the start of a non-screen block, and notice — without leaving completely — whether {{child_pronoun_subj}} settles better with you nearby than the screen pull would otherwise allow.`,
      "12-14": `Offer co-presence, not supervision — both of you doing your own things at the same table. A teen Magnet still benefits from this, but it has to read as company, not monitoring.`,
    },

    moveOutroShared: `What makes this work is that presence and screens are actually competing for the same job — being reliably there. Screens win by default when nobody else is offering. This week just makes sure someone is.`,

    whatWorkingLooksLike: `A good week looks like slightly less screen-reaching on days with real presence offered — not zero, just less. A "bad" week usually means the presence read as supervision rather than company, which doesn't compete with a screen's appeal, it just adds pressure.`,

    thingToHoldOnto: `The screen was never really the point. It was standing in for something that felt reliably available. Next week, we stretch that same presence across a longer stretch of time.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Does {{child_name}} reach for a screen more when alone? Just notice the pattern today — don't try to change it yet.",
        "10-11": "Notice today: does {{child_name}} reach for a screen more when alone versus when someone's nearby? Just observe the pattern, don't intervene yet.",
        "12-14": "Notice whether {{child_name}} reaches for a screen more when alone. Just observe — don't act on it yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Offer real presence during non-screen time.",
      content: {
        "8-9":   "Be nearby during a non-screen activity today — doing your own thing, low-key. Just present. See if the pull toward a screen is any different.",
        "10-11": "Sit with {{child_pronoun_obj}} during one non-screen activity — genuinely present, doing your own thing nearby. See if the pull toward a screen is any different with company there.",
        "12-14": "Offer co-presence, not supervision — both of you doing your own things nearby during a non-screen activity. Peer energy, not oversight.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Again today — and notice if {{child_name}} reaches for the screen less when you're there.",
          mixed:      "Was your presence genuine, or did it tip into supervision? The line matters — a screen never feels like supervision.",
          didnt_land: "Try being more clearly 'just there,' no agenda, a bit further from actively engaging. Warmth without oversight.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and watch the line.",
      content: {
        "8-9":   "Same — sit close, your own thing, no agenda. And today: notice if it tips into watching {{child_pronoun_obj}} instead of just being there. Only one of those competes with a screen.",
        "10-11": "Same move — genuinely present, your own thing nearby. Today: watch the line between presence and supervision. Only one of those competes with a screen's appeal.",
        "12-14": "Same move. For a teen, presence has to read as genuinely low-pressure — your own work, not checking on {{child_pronoun_obj}}. The line is subtle; notice it.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Set a real time boundary on screens too.",
      content: {
        "8-9":   "Give the screen a real time edge too. A clear limit, same as any other domain — presence doesn't replace the boundary, it just makes it less lonely to hold.",
        "10-11": "Set a real time boundary on screens too. A clear limit, same as any other domain — presence doesn't replace the boundary, it just makes the boundary less lonely to hold.",
        "12-14": "A real time boundary too — ideally discussed together, not announced. Presence is one axis; a real limit is another. Both can be true.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Name the connection.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"You didn't reach for your tablet as much with me here today.\"* Say it simply, once.",
        "10-11": "Tell {{child_name}}: *\"You didn't reach for your tablet as much today when I was around — that's real. Screens are always there. I'd rather be.\"*",
        "12-14": "Tell {{child_name}}: *\"Screens are always there. I'd rather actually be — and you reached for yours less when I was.\"* Honest, not sentimental.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Being near really helps — presence genuinely competes with the always-on pull of a screen.{{/if}}{{#if week_trend == "mixed"}}Normal. The line between presence and hovering takes practice — warmth without agenda is harder than it sounds.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did the presence feel warm, or like checking up? Those land very differently — only one of them competes with a screen.{{/if}}

The screen was standing in for something reliably available. This week, something else was.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}Presence really does compete with the always-on pull of a screen — company is a real resource here, and it worked.{{/if}}{{#if week_trend == "mixed"}}Normal. The line between presence and hovering takes practice — supervision doesn't compete with a screen's appeal, it just adds pressure.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the presence genuinely low-pressure, or did it read as watching? For this child, that distinction determines everything.{{/if}}

The screen was never really the point. It was standing in for something that felt reliably available.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Co-presence genuinely competes with an always-on screen — for {{child_name}}, company is a real alternative, not a consolation.{{/if}}{{#if week_trend == "mixed"}}The line is subtle. Peer energy and oversight feel completely different — a teen knows which one is happening.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did it feel like company or like being watched? For a teen Magnet, that's the whole question — and only one competes with a screen.{{/if}}

Next week, we stretch that same presence across a longer stretch of time.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
