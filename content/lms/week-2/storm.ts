import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 2,
  weekTitle: "A Real Choice, Even About Screens",

  weeklyReading: {
    introShared: `Screens are the one place where you've probably already tried everything — time limits, app blockers, taking the device away entirely — and the fight just moves, it never actually ends. It's worth understanding why, specifically for {{child_name}}, before trying anything new here.

Everything you learned in Week 1 still applies. {{child_name}}'s attention switches on when something is genuinely {{child_pronoun_poss}} to decide, and switches off — hard — the moment it isn't. Screens are usually the most controlled part of {{child_pronoun_poss}} day, which means they're also the place {{child_pronoun_poss}} need for real choice collides with your need for a real limit most directly.

Here's the reframe this week is built on: the boundary and the choice are not the same thing, and they don't have to fight each other. You can hold a firm limit — the total time, the *how much* — while still handing {{child_name}} genuine ownership of the *how*. That's not a loophole in the limit. It's the same mechanism from Week 1, aimed at the one domain where you'd assumed it couldn't apply.

This matters more than it might seem. If screens stay the one place where {{child_name}} never gets real choice, they become the one place {{child_pronoun_poss}} need for ownership has nowhere legitimate to go — which is often exactly why the screen fights escalate the way they do. Give that need a real, bounded place to live, and a lot of the fight has less to hold onto.

The move this week is small on the surface: hand {{child_pronoun_obj}} the *how* inside a limit that doesn't move. The shift underneath it is bigger — screens stop being the exception to what you learned last week, and become the clearest proof that it actually works.`,

    moveCalibration: {
      "8-9": `Keep the boundary simple and the choice small and concrete. State the limit plainly — "30 minutes today" — then hand over one real decision inside it: which app, or when in the day it happens. At this age, the choice doesn't need to be complicated to feel real; it just needs to be genuinely {{child_pronoun_poss}}, with no second-guessing from you once it's made. Examples: "You pick which 20 minutes today"; "You choose — this game or that show, not both"; letting {{child_name}} set a timer instead of you announcing when it's up.`,

      "10-11": `The boundary can stay stated once, clearly, and the choice can get a bit more layered — splitting time across two things, or choosing the order. {{child_name}} can handle "you decide how to split it," not just "you decide which one." Examples: dividing one hour across two activities, {{child_pronoun_poss}} call; choosing whether to use the time all at once or in two shorter blocks; picking the app *and* roughly when, without you weighing in either way once {{child_pronoun_subj}}'s decided.`,

      "12-14": `With a teen, say the boundary once, plainly, and then genuinely step back from the how entirely — a 12–14 will test whether "your choice" really means your choice, and will disengage fast if it doesn't. Consider negotiating the boundary itself collaboratively at this age (not caving on it, but discussing it together rather than announcing it), while keeping the same non-negotiable principle: once it's set, the how is entirely {{child_pronoun_poss}}. Examples: a real conversation about what the daily limit should be, arrived at together; complete freedom over which platform/game/show once the time is set; no check-ins on how {{child_pronoun_subj}}'s using it unless {{child_pronoun_subj}} raises something.`,
    },

    moveOutroShared: `What makes this work is that the limit and the choice are doing two different jobs, and neither one undermines the other. The limit says *this is how much* — firm, not up for renegotiation in the moment. The choice says *this part is yours* — genuinely open, no correction. {{child_name}} can feel the difference between a boundary that's real and a choice that's real, and when both are true at once, there's nothing left to fight about.`,

    whatWorkingLooksLike: `A good week does not look like the screen fights disappearing entirely — they may still happen sometimes, and that's not a failure of this approach. It looks like the fights happening less around the *boundary itself*, since that part is no longer where {{child_pronoun_poss}} need for ownership is getting stuck. A "bad" week usually means one of two things: either the boundary quietly became negotiable (the choice ate the limit), or the choice wasn't actually handed over (you still stepped in on the how). If it's not landing, check both, honestly — a boundary that moves and a choice that isn't real are the two things most likely to undo this.`,

    thingToHoldOnto: `The thing to hold onto: screens were never actually the problem. They were the one place {{child_name}}'s need for real ownership had nowhere legitimate to go, so it showed up as a fight instead. Give that need a real, bounded place to live — and screens become just another domain where the same thing you learned in Week 1 quietly keeps working. Next week, we stretch this same choice across more than just one task.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "When you tell {{child_name}} screen time's up versus when {{child_pronoun_subj}} gets some say in it — does it feel different? Just notice today. Don't change anything yet.",
        "10-11": "Don't change anything today. Just notice: when a screen limit is announced versus when {{child_name}} has some real say in how the screen time goes — does the pushback look different? Observe both if you get the chance.",
        "12-14": "Notice the difference: when the screen limit is announced versus when {{child_name}} has real say in it. Just gather the pattern today — don't act on it yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Set the limit, then let them choose how to spend it.",
      content: {
        "8-9":   "Same total time as always. Today, let {{child_name}} pick when to use it. That's the whole move — the limit stays firm, the *when* is genuinely {{child_pronoun_poss}}.",
        "10-11": "The boundary stays — same total time as always. But today, hand {{child_pronoun_obj}} the actual decision inside it: *\"You've got [the usual time]. You decide when you use it and how you split it up.\"* Not more time, not less structure — real choice about the *how*, inside the same *how much*.",
        "12-14": "Tell {{child_name}} directly: the total time stays the same, but how it's used is entirely {{child_pronoun_poss}} call. Negotiate the limit together if it feels right — but once it's set, step back fully.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today. Notice if you're tempted to suggest how {{child_name}} should split the time — don't. The choice has to stay fully {{child_pronoun_poss}} to actually work.",
          mixed:      "Same move — check whether the boundary itself felt negotiable in the moment, or whether it stayed firm while the *how* stayed {{child_pronoun_poss}}. Both need to be true.",
          didnt_land: "The choice may not have felt real. Try again, and this time say the boundary out loud first, clearly, before handing over the how — so there's no ambiguity to fight about.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Same total time, same choice handed over. And today: stay completely quiet once {{child_name}} decides — don't suggest how, even helpfully. The limit is yours; the how is {{child_pronoun_poss}}.",
        "10-11": "Offer the same real choice inside the same limit. The thing to notice today: the moment you want to step in and suggest how {{child_name}} uses the time — that's the catch-yourself moment. Don't.",
        "12-14": "Same limit, same handover. If {{child_name}} makes a choice you'd have made differently — let it stand. A teen spots a qualified choice instantly; keep it real.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let them spend it badly once, without renegotiating.",
      content: {
        "8-9":   "Let {{child_name}} pick between two different things to do with the time — not just when, but what. Real trade-offs, both fine with you.",
        "10-11": "Today, raise the stakes slightly: offer a choice between two different things {{child_pronoun_subj}} could do with the time — not just when, but what. Real trade-offs, both genuinely fine with you, but different enough that picking one means giving up the other.",
        "12-14": "Offer two genuinely different ways to use the time — real trade-offs, {{child_pronoun_subj}} picks. Both options need to be ones you'd genuinely accept without steering toward one.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Point out what they decided, not that they turned it off.",
      content: {
        "8-9":   "Offer the choice as usual. Afterward, say one true thing: *\"You managed that time all by yourself today.\"* Short and honest.",
        "10-11": "After today, say one specific thing: *\"You managed that time completely yourself today — the boundary didn't move, but how you used it was all you.\"* Recognition that the ownership was real, inside a structure that also held.",
        "12-14": "Tell {{child_name}}: *\"You ran that time completely yourself. The limit didn't move, but how you used it was all you.\"* No inflation — one honest observation.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}The choice and the limit can both be real at once — you've proved it this week, in the domain most families fight hardest over.{{/if}}{{#if week_trend == "mixed"}}Normal. Screens carry more charge than most things. A mixed week is a starting point, not a verdict.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Check honestly: did the limit stay firm, or did it quietly slip? The choice only works when the boundary underneath it is genuinely non-negotiable.{{/if}}

Next week, the same move reaches one domain further.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}The same lever from Week 1 works here too — the boundary and the choice aren't in conflict, they're two different things, and both can be real at once.{{/if}}{{#if week_trend == "mixed"}}Normal. Screens carry more emotional charge than most tasks — expect a bit more friction finding the right-sized choice.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking honestly — did the boundary actually stay firm, or did "real choice" quietly start eroding it? If the choice is going to work, the limit underneath it has to be genuinely non-negotiable.{{/if}}

Both parts of this week's work — holding the limit and handing over the how — have to be real for either one to matter.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}The limit and the choice were never actually in conflict — you've shown that now, in the one domain where most families fight hardest.{{/if}}{{#if week_trend == "mixed"}}Normal. Finding the real version of both takes a few tries. A teen who tested the boundary wasn't rejecting the move — {{child_pronoun_subj}} was checking whether it was genuine.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Check honestly: did the limit stay real, or did the choice quietly erode it? A teen will test both; what makes it work is that both hold.{{/if}}

Both things have to be real: the limit that doesn't move, and the choice that's actually theirs.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
