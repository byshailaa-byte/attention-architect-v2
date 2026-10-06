import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-remaining-six.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Week 1 rewritten around "something live" (clock running, someone there, a real result, the child
// choosing what makes it live) — no bets/rewards/consequences. See aa-week1-revisions.md.
// {{child_pronoun_subj|cap}} in Day 4 12-14 content: |cap modifier supported by fillLmsContent.
export const weekContent: LmsWeekContent = {
  archetype: "live-wire",
  week: 1,
  weekTitle: "Getting started without the push",

  weeklyReading: {
    introShared: `Watch {{child_name}} move between two states. In one, {{child_pronoun_subj}}'s barely there — a task rolls past {{child_pronoun_obj}} and {{child_pronoun_poss}} mind won't land on it, however many times you ask. In the other, {{child_pronoun_subj}}'s *completely* alive — sharp, locked in, impossible to pull away. The difference between the two isn't mood, and it isn't effort. It's whether something is actually happening.

A Live Wire's attention switches on for what's live: a clock that's really running, someone really there, a result that really happens right now. When a task has that, {{child_pronoun_poss}} focus is total. When it doesn't, the task never quite registers. Somewhere below decision, it reads as *not happening yet* — and {{child_pronoun_subj}} moves on to something that is.

This is why "do your homework because you have to" fails so completely with this child. "Because you have to" is about someday. {{child_name}}'s attention is built for right now. The reminders pile up, the task stays undone, and it starts to look like {{child_pronoun_subj}} doesn't care — when really, nothing in the ask ever felt live.

So this week does one thing. Instead of pushing {{child_pronoun_obj}} to care, it adds something live to one task. A timer that's really running. Someone sitting with {{child_pronoun_obj}}. Showing the finished thing to someone at the end. Not a threat and not a bribe — just a reason for the task to be happening *now*. As the week goes on, you hand that choice to {{child_pronoun_obj}}, because {{child_name}} usually knows better than you what feels live.

One thing to avoid: anything fake. Sticker charts, made-up urgency, something handed over for finishing. This child sees through pretend urgency instantly, and pretend is worse than nothing, because it tells {{child_pronoun_obj}} you don't know what real means. Keep it real and it often clicks — and you may see, for the first time, that the focus was never missing. It was waiting for something to be happening.`,

    moveCalibration: {
      "8-9": `For a younger Live Wire, keep it light, playful and real — never scary. Add one "right now" to one task: a timer to beat, someone sitting alongside, showing the finished thing to someone at the end. Small is fine, as long as it's really happening. Examples: "Can you finish this before the timer goes?"; doing it side by side with you or a sibling; reading the finished piece aloud to an audience of one. A game with a real edge, not pressure.`,
      "10-11": `At this age, vary what makes it live, and start handing {{child_name}} the choice: ask what would make a task feel like it's happening now, and use {{child_pronoun_poss}} answer. The same thing twice starts to feel like nothing, so mix it up. Examples: a timed run where {{child_pronoun_subj}} tries to beat {{child_pronoun_poss}} own last time; a real deadline or a real person waiting to see the result; letting {{child_pronoun_obj}} name what would make it feel live, which is almost always better than anything you invent.`,
      "12-14": `With a teen Live Wire, it has to be genuinely real — kid-style games will feel faintly insulting at this age. Connect the task to something live in {{child_pronoun_poss}} actual life: a real audience {{child_pronoun_subj}} respects, a real deadline, a result that will actually be used or seen. And let {{child_pronoun_obj}} choose — at this age {{child_pronoun_subj}} knows better than you what feels real, and being asked is itself respectful. Examples: tying the task to something that's actually happening in {{child_pronoun_poss}} life; a real audience or a real deadline, not a made-up one; asking "What would make this feel worth your time right now?" and taking the answer seriously.`,
    },

    moveOutroShared: `What makes this work is not pressure — it's reality. Something live and a threat can both create urgency, but they do opposite things to a Live Wire: something live switches the focus *on*; a threat switches on worry and feels like a trap. The whole week turns on one line: *real* versus *made up*. This child's attention is a very honest instrument. It turns on for what's really happening and stays off for what isn't, and no amount of insisting changes that. Give it something true, and it responds.`,

    whatWorkingLooksLike: `A good week does not look like {{child_name}} suddenly caring about tasks where nothing is happening — that's not how this child works, and chasing it will only frustrate you both. It looks like the focus switching on when something live is attached, and — by week's end — {{child_pronoun_subj}} starting to *notice* that about {{child_pronoun_obj}}self. A "bad" week usually means it didn't feel real: it was made up, or real to you but not to {{child_pronoun_obj}}, and {{child_pronoun_subj}} saw through it. If it's not landing, check that honestly first — was it live for {{child_name}} in the moment, or only for you?`,

    thingToHoldOnto: `The thing to hold onto is that {{child_name}}'s need for something live is not shallowness or a refusal to work. It's an early form of something powerful — the ability to bring total focus to what's really happening, to rise fully to a real moment. Plenty of people who do remarkable things work exactly like this: ordinary at the routine, extraordinary when it counts. The work of these weeks is not to make {{child_pronoun_obj}} grind through things that feel like nothing. It's to help {{child_pronoun_obj}} find and create real moments — so the focus that's always been there has more and more to turn on for. Next week, we take this same principle further.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "What does {{child_name}} really lock into? Notice if it's the stuff where something's actually happening — a race, a game, someone watching.",
        "10-11": "No move yet. Today, notice: which tasks does {{child_name}} actually lock into? Look for what they share — is something really *happening* (a game, a deadline, an audience), compared with tasks where nothing is?",
        "12-14": "Notice what {{child_name}} genuinely locks into — and what's actually happening in those moments that isn't happening in the rest.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Add one live thing to one task.",
      content: {
        "8-9":   "Pick one task. Add something real: beat the timer, do it side by side, show someone at the end. Fun, not scary.",
        "10-11": "Pick one task today. Add one thing that makes it happen now — a real timer, someone sitting with {{child_pronoun_obj}}, a person waiting to see the result. Not a threat, not a bribe.",
        "12-14": "Connect one task to something that's real for {{child_name}} at this age — a real audience, a real deadline, a result that will actually be used. Nothing that feels like a kids' game.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today, with a *different* live thing — variety keeps it real. The same thing twice starts to feel like nothing.",
          mixed:      "Same move — check whether it genuinely felt live to {{child_name}}, or whether it felt made up.",
          didnt_land: "It probably didn't feel live enough to register. Try again with something that's genuinely happening for {{child_pronoun_obj}} right now.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, a different live thing.",
      content: {
        "8-9":   "Add a different live thing today — not the same as yesterday. Keeping it varied keeps it real.",
        "10-11": "Add something live again — but a *different* kind this time. The same thing twice starts to feel made up.",
        "12-14": "A different live thing today. Something genuinely happening for {{child_pronoun_obj}}, not a repeat of yesterday.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Did it feel live to {{child_name}}, or mostly to you? That difference is everything.",
        },
      },
    },
    {
      day: 4,
      title: "Let them choose what makes it live.",
      content: {
        "8-9":   "Ask {{child_name}}: *\"What would make this fun to do right now?\"* Let {{child_pronoun_obj}} pick.",
        "10-11": "Today, ask {{child_name}}: *\"What would make this feel like it's happening right now?\"* Let {{child_pronoun_obj}} choose. What {{child_pronoun_subj}} picks is almost always more real than what you'd invent.",
        "12-14": "Ask {{child_name}}: *\"What would make this feel worth your time right now?\"* {{child_pronoun_subj|cap}} knows better than you what feels real at this age.",
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
      title: "Say the focus was theirs, not that they tried hard.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"When it counted, you were all in — did you feel it?\"*",
        "10-11": "After today, say one specific thing: *\"When it mattered, you were completely in it — did you feel that?\"* You're naming the focus that showed up *because* something was live, so {{child_name}} starts to notice it too.",
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
`{{#if week_trend == "mostly_worked"}}Something live, not more nagging. That's the lever — you found it.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Finding what feels live to {{child_pronoun_obj}} takes a few tries.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did it feel live to {{child_pronoun_obj}}, or just to you?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the lever — something live, not more pressure. The focus was always there; it just needed something real to attach to.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Finding what feels real rather than made up takes a few tries.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — did it feel live to {{child_name}} in the moment, or mostly to you?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Something live, not pressure. And you've seen {{child_pronoun_obj}} lock in when it's real.{{/if}}{{#if week_trend == "mixed"}}Finding what feels real takes a few tries. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did it feel real to {{child_pronoun_obj}}, or only to you? At this age that gap is the whole game.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
