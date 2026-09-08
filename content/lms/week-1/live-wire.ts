import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-remaining-six.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc, shared across archetypes per authoring notes.
// {{child_pronoun_subj|cap}} in Day 4 12-14 content: |cap modifier supported by fillLmsContent.
export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 1,
  weekTitle: "Getting started without the push",

  weeklyReading: {
    introShared: `Watch {{child_name}} in the two states {{child_pronoun_subj}} moves between, and the pattern is almost comical in its clarity. In one, {{child_pronoun_subj}}'s barely present — a task rolls past {{child_pronoun_obj}} and {{child_pronoun_subj}} can't seem to make {{child_pronoun_poss}} mind land on it, no matter how many times you ask. In the other, {{child_pronoun_subj}}'s *completely* alive — locked in, sharp, fully there, the same child you couldn't reach ten minutes ago now impossible to pull away. The difference between those two states is not mood, and it's not effort. It's stakes.

The Live Wire needs something real on the line for a task to register at all. Not as a nice-to-have — as the actual trigger for {{child_pronoun_poss}} attention to switch on. When there's a genuine stake — a race to win, a deadline that bites, an audience watching, a result that actually happens — {{child_pronoun_poss}} focus is total. When there's nothing on the line, the task simply doesn't clear the bar of {{child_pronoun_poss}} attention. It reads, at some level below decision, as *not important right now* — and {{child_pronoun_subj}} moves on to something that is.

This is why "just do your homework because you have to" fails so completely with this child. "Because you have to" is not a real stake. It's an abstraction, a someday-consequence, and the Live Wire's attention is built for the immediate and the real. The nagging escalates, the task stays undone, and everyone concludes {{child_pronoun_subj}}'s lazy or oppositional — when the truth is {{child_pronoun_subj}} was never actually reached, because nothing in the ask registered as real.

So this week does one thing: it stops trying to will {{child_pronoun_obj}} into caring and instead puts something genuinely real on the line. A timer to actually beat. A small bet. Someone really watching. A result that truly happens. Not a threat — threats create a different, worse kind of stake — but a live, immediate reason for the task to matter *right now*. And then, as the week goes on, it hands the stake-setting to {{child_pronoun_obj}}, because a Live Wire almost always knows better than you what genuinely registers as real.

The trap to avoid is the manufactured stake — the sticker chart, the fake urgency, the reward that's obviously just a reward. This child can smell a pretend stake instantly, and a pretend stake is worse than none, because it teaches {{child_pronoun_obj}} that you don't understand what real means. The stakes this week have to be genuine. When they are, you may see the switch flip — and may understand for the first time that the focus was never missing. It was waiting for something worth turning on for.`,

    moveCalibration: {
      "8-9": `For a younger Live Wire, keep the stakes real but light and fun — the point is genuine, immediate, and playful, never scary. Add a "right now" to one task: beat the timer, race a sibling, show someone the result at the end. At this age the stake can be small as long as it's real in the moment. Examples: "can you beat the clock?"; a quick race where finishing actually wins something; performing or showing the finished thing to a real audience of one. Keep it a game with a real edge, not pressure.`,
      "10-11": `At this age, the stakes can be a bit more varied and a bit more real, and you can start handing {{child_name}} the wheel: ask what would make a task worth doing right now, and use {{child_pronoun_poss}} answer. The middle-band Live Wire responds well to variety — the same stake twice starts to feel like nothing — so mix the kind of "real" you attach. Examples: a genuine timed challenge with a real (small) reward; an audience or a deadline that actually lands; letting {{child_pronoun_obj}} name the stake that would make it matter, which is almost always more real than one you invent.`,
      "12-14": `With a teen Live Wire, the stakes have to be genuinely meaningful — not gamified-for-kids, which a 12–14 will find faintly insulting. Attach something {{child_pronoun_subj}} actually cares about at this age: a real consequence, a real audience {{child_pronoun_subj}} respects, a real deadline, a reward that genuinely matters to {{child_pronoun_obj}}. And lean hard on letting {{child_pronoun_obj}} set the stake — at this age {{child_pronoun_subj}} knows better than you what registers as real, and being asked is itself respectful. Examples: tying the task to something with genuine stakes in {{child_pronoun_poss}} actual life; a real audience or real deadline, not a manufactured one; asking "what would actually make this worth your time right now?" and taking the answer seriously.`,
    },

    moveOutroShared: `What makes this work is not pressure — it's reality. A real stake and a threat can both create urgency, but they do opposite things to a Live Wire: a real stake switches the focus *on* and feels alive; a threat switches on anxiety and feels like a trap. The distinction the whole week turns on is *genuine* versus *manufactured*. This child's attention is a remarkably honest instrument — it turns on for what's really at stake and stays off for what isn't, and no amount of insisting changes what it reads as real. Give it something true, and it responds every time.`,

    whatWorkingLooksLike: `A good week does not look like {{child_name}} suddenly caring about low-stakes tasks for their own sake — that's not how this child is built, and chasing it will only frustrate you both. It looks like the focus reliably switching on when something real is attached, and — by week's end — {{child_pronoun_subj}} starting to *notice* the pattern in {{child_pronoun_obj}}self. A "bad" week usually means the stakes weren't genuinely real: they were manufactured, or real to you but not to {{child_pronoun_obj}}, and {{child_pronoun_subj}} saw through them. If it's not landing, check that honestly first — was the stake real to {{child_name}} in the moment, or only real to you?`,

    thingToHoldOnto: `The thing to hold onto is that {{child_name}}'s need for real stakes is not shallowness or a refusal to work for its own sake. It's an early form of something powerful — the ability to bring total focus to what genuinely matters, to rise fully to a real moment. Plenty of people who do remarkable things share exactly this wiring: unremarkable at the routine, extraordinary when it counts. The work of these weeks is not to make {{child_pronoun_obj}} grind at things that don't matter. It's to help {{child_pronoun_obj}} find and create real stakes — so the focus that's always been there has more and more to turn on for. Next week, we take this same principle further.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "What does {{child_name}} really lock into? Notice if it's the stuff where something's actually happening — a race, a game, someone watching.",
        "10-11": "No move yet. Today, notice: which tasks does {{child_name}} actually lock into? Look for what they have in common — is it that something *real* is at stake (a game, a deadline, an audience) versus tasks with nothing on the line?",
        "12-14": "Notice what {{child_name}} genuinely locks into — and what those things have in common in terms of what's actually at stake.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let them set one real stake, in their own terms.",
      content: {
        "8-9":   "Pick one task. Add something real: beat the timer, race a sibling, show someone at the end. Fun, not scary.",
        "10-11": "Pick one task today. Attach a genuine, immediate stake — a real timer to beat, a small bet, someone watching, a result that actually happens. Not a threat — a live stake.",
        "12-14": "Attach a stake that matters to {{child_pronoun_obj}} — not a sticker-chart stake, something {{child_name}} actually cares about at this age: real consequence, real audience, real deadline, real reward.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today, with a *different* kind of stake — variety keeps it real. The same stake twice starts to feel like nothing.",
          mixed:      "Same move — check whether the stake was genuinely real or whether {{child_name}} could tell it was manufactured.",
          didnt_land: "The stake probably wasn't real enough to register. Try again, higher — something that actually matters to {{child_pronoun_obj}} in the moment.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Add a different kind of real stake today — not the same one as yesterday. Keeping it varied keeps it real.",
        "10-11": "Attach a real stake again — but a *different* kind this time. Variety keeps it real; the same stake twice starts to feel manufactured.",
        "12-14": "Different real stake today. Vary it — something that genuinely matters to {{child_pronoun_obj}} in the moment, not a repeat of yesterday's.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Were the stakes genuinely real to {{child_name}}, or real mostly to you? That distinction is everything.",
        },
      },
    },
    {
      day: 4,
      title: "Let it be genuinely uncertain — not rigged to work out.",
      content: {
        "8-9":   "Ask {{child_name}}: *\"What would make this fun to do right now?\"* Let {{child_pronoun_obj}} pick.",
        "10-11": "Today, ask {{child_name}}: *\"What would make this worth doing right now?\"* Let {{child_pronoun_subj}} name the stake. A stake {{child_pronoun_subj}} chooses is almost always more real than one you invent.",
        "12-14": "Ask {{child_name}}: *\"What would actually make this worth your time right now?\"* {{child_pronoun_subj|cap}} knows better than you what registers as real at this age.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today, make sure they know why. Name it specifically.",
          mixed:      "It's been mixed or slow. Still name it — recognition of even a small moment of real engagement is what tips a mixed week toward a better second week.",
          didnt_land: "It's been mixed or slow. Still name it — recognition of even a small moment of real engagement is what tips a mixed week toward a better second week.",
        },
      },
    },
    {
      day: 5,
      title: "Say the stake was theirs, not that they tried hard.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"When it counted, you were all in — did you feel it?\"*",
        "10-11": "After today, say one specific thing: *\"When it mattered, you were completely in it — did you feel that?\"* Recognition of the focus that showed up *because* something was real, so {{child_name}} starts to see the pattern too.",
        "12-14": "Tell {{child_name}}: *\"When it actually matters, your focus is total. That's a real strength — it just needs something real to aim at.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Real stakes, not more nagging. That's the lever — you found it.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Finding stakes that feel real to {{child_pronoun_obj}} takes a few tries.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Were the stakes real to {{child_pronoun_obj}}, or just to you?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the lever — real stakes, not more pressure. The focus was always there; it just needed something genuine to attach to.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Finding stakes that feel real rather than manufactured takes a few tries.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — were the stakes genuinely real to {{child_name}} in the moment, or real mostly to you?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Real stakes, not pressure. And you've seen {{child_pronoun_obj}} lock in when they're genuine.{{/if}}{{#if week_trend == "mixed"}}Finding genuine stakes takes a few tries. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Were the stakes real to {{child_pronoun_obj}}, or only to you? At this age that gap is the whole game.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
