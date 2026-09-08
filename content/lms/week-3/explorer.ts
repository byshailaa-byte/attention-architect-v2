import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "explorer",
  week: 3,
  weekTitle: "Staying with it on an ordinary day",

  weeklyReading: {
    introShared: `Week 1 introduced something simple: a place for new ideas to go instead of getting chased mid-task or lost entirely. Week 2 tested that same system around screens, one of the biggest sources of pulling attention in a new direction. This week asks whether the system becomes something your child reaches for by default — not because you prompted it, but because it's simply how they now handle a new idea showing up at the wrong moment.

The core idea worth holding onto: an Explorer's attention isn't unfocused. It moves toward connections and new ideas constantly, and the actual skill isn't suppressing that movement — it's giving it somewhere to go that doesn't derail what they're already doing. Weeks 1 and 2 proved the system works when it's fresh and prompted. This week tests whether it holds up as a standing habit across a whole week, without reminders.

This week's move: instead of prompting your child to use the capture system for a specific tangent, let it become the default expectation for the entire week — any idea that pulls their attention away from what they're doing gets captured, not chased and not lost, without you having to say anything about it.

There's a second move this week that wasn't part of Weeks 1–2: actually going back through what got captured earlier in the week, together. This closes the loop — the system isn't just a way to make ideas disappear quietly, it's a real place they get revisited. That step matters as much as the capturing itself.`,

    moveCalibration: {
      "8-9": `Some ideas will still get chased instead of written down — notice which ones, and whether it's the most exciting ideas or the moments when the notebook is harder to reach for. That's the thing to adjust, not the rule itself.`,
      "10-11": `Some tangents will still get chased instead of captured, and that's genuinely useful information, not a sign the system failed. Notice what kind of idea breaks the habit — is it the excitement level of the idea, or the timing (right when something else is already hard)? That pattern will tell you more about what to adjust than whether the week went perfectly.`,
      "12-14": `At this age, the real temptation isn't reminding {{child_name}} to use the system — it's checking whether {{child_pronoun_subj}} actually used it. The urge to glance at the notebook, ask what got captured, or quietly confirm the habit is holding usually shows up when nothing's obviously going wrong — genuine curiosity dressed up as help. But a system {{child_name}} owns has to include not being monitored for it. If {{child_pronoun_subj}} skips a day, that's real information about what the system still needs, not something to correct on your end. Step back far enough that the only way you'd know it's working is what {{child_name}} chooses to show you.`,
    },

    moveOutroShared: `That's the work this week — not a single successful capture, but the system becoming something your child reaches for on their own, across a whole week, and something that genuinely gets revisited rather than just filed away.`,

    whatWorkingLooksLike: `You may notice your child reaching for the capture system without being reminded — genuinely treating it as the default move rather than something you have to prompt each time. When you revisit the list together, real engagement with what's there (not just going through the motions) is often a stronger sign than a long list itself — a shorter list that was actually looked at again matters more than a long one that wasn't. Some ideas will still get chased instead of captured, especially the most exciting ones — that's expected, not a sign the system isn't working.`,

    thingToHoldOnto: `The system doesn't need to catch everything to be working. It needs to catch enough, consistently, that fewer things get lost entirely — and it needs to actually get reopened, not just used as a place where ideas go to be forgotten more politely.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "Just watch. Notice: does {{child_name}} write down new ideas, or do they just get forgotten?",
        "10-11": "Just watch. Notice how often {{child_name}} uses the capture system from Week 1 versus how often a tangent just gets dropped and forgotten because the system wasn't reached for.",
        "12-14": "Notice how consistently {{child_name}} reaches for the capture system versus how often ideas still just get chased or dropped.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Make the notepad the standing setup, not a this-week experiment.",
      content: {
        "8-9": "Make writing ideas down the normal thing. All week, when a new idea pulls {{child_name}} away from what {{child_pronoun_subj}}'s doing, {{child_pronoun_subj}} writes it down instead of chasing it or losing it.",
        "10-11": `Make the system the default, not the exception. Instead of prompting {{child_name}} to use the capture system for one tangent, make it the standing expectation for the whole week: any idea that pulls {{child_pronoun_subj}} away from what {{child_pronoun_subj}}'s doing gets captured, not chased or dropped.`,
        "12-14": `Tell {{child_name}}: *"This week, any idea that pulls you away gets captured — that's just how we do it now, not something I'll remind you about."*`,
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Check in on it.",
      content: {
        "8-9": "Do it again. Fork: Worked — keep it going without reminders. Mixed — notice which kind of idea still gets chased instead of written down. Didn't land — make the notebook or list easier to grab quickly.",
        "10-11": `Do it again. Fork: Worked — keep the expectation standing. Don't remind {{child_name}} each time; let {{child_pronoun_subj}} own the habit. Mixed — some tangents got captured, others got chased anyway. Notice what kind of idea breaks the habit — is it excitement level, or timing? Didn't land — the system may need to be more visible or accessible (a running note, not something buried). Make it easier to reach for before asking for more consistency.`,
        "12-14": "**Worked** — let {{child_name}} own the habit without reminders. **Mixed** — talk about what kind of idea still breaks the habit. **Didn't land** — make the capture method more accessible before asking for more consistency.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Go back through the list together at least once.",
      content: {
        "8-9": "Look back at the list together. Go through what {{child_name}} wrote down earlier this week. Was any of it worth doing something with?",
        "10-11": "Revisit what got captured. This is new this week: actually go back through the captured ideas from earlier in the week with {{child_name}}. Did any of them turn out to be worth following up on? This closes the loop — capture isn't just a holding pen, it's genuinely revisited.",
        "12-14": "Actually go back through what got captured this week with {{child_name}}. Was any of it worth following up on? This closes the loop.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it's become how they work now.",
      content: {
        "8-9": `Name it. "You caught your own ideas all week instead of losing them. That's your system now."`,
        "10-11": `Name it. Tell {{child_name}}: "You've been catching your own ideas all week instead of losing them or chasing every one. That's a real system, and it's yours."`,
        "12-14": `*"You've been catching your own ideas all week instead of losing them. That's a real system, and it's yours."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did writing ideas down become the normal thing, and was looking back worth it?",
      "10-11": "Did the system hold as a default across the whole week, and did revisiting captured ideas feel worthwhile to {{child_name}}?",
      "12-14": "Ask {{child_name}} whether revisiting the captured ideas felt worthwhile.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
