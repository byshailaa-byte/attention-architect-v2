import { TODO } from "@/lib/content/todo";
import type { LmsWeekContent } from "@/content/types";

// Source: lms-week1-storm-pusher.md (corrected 2026-07-09 — reflection forks backported)
// Age band renders ONE calibration only — parent must never see all three bands in any UI state.
// Day 2 reflection drives Day 3 opening (worked/mixed/didnt_land).
// Day 5 and Weekend fork on week_trend (computed by Phase 6 renderer from week's reflections)
// using {{#if week_trend == "..."}} tags evaluated at render time.
export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 1,
  weekTitle: "Let Them Pick How It Starts",

  weeklyReading: {
    introShared: `This is the first week of a program built specifically for a Storm. It's not a course you sit and watch. It's a small set of things you try in real life — starting this week — and pay attention to what happens.

**One short read to start the week (this page — about 12 minutes).**
**One tiny action each day (5 minutes or less, in a moment that already happens anyway).**

That's it. If you do nothing else this week except the daily action, this program still works. The reading is here to explain *why* — but the change comes from the doing, not the reading.

**Quick recap: what your report found**

You don't need to re-read the whole report. Just this, because everything this week builds on it:

**Your child is a Storm.** Their attention is real and powerful — you've seen them lock in completely on something they chose. It's not missing. It just switches *off* the moment something stops feeling like their own idea. That one fact is the lever everything else turns on.

**Why we start here**

Think about where the worst friction happens. For most Storm households, it's not the middle of homework — it's *getting started.* The stand-off. The "just sit down and do it." The fifteen minutes of resistance before a single line gets written.

Here's what's actually happening in that moment, underneath:

Your Storm doesn't resist the work itself. They resist being *placed into it* — on someone else's timing, someone else's terms. The instant homework feels like something happening *to* them, their attention switches off. Not to be difficult. That's just how a Storm is wired: ownership is the on-switch. Without it, the engine doesn't run.

**This week's one move: The Opening Choice**

Here's the whole thing. Before homework starts each day, you hand your child real ownership over *how* it begins — so the work feels like theirs before any resistance can build.

Not a fake choice. Not "do you want to do homework or not." A real, small, genuine choice about *how* it starts.`,

    moveCalibration: {
      "8-9":
`At 8–9, the choice should be **small, concrete, and physical** — and you still hold the overall frame. Homework is happening; the choice is about *how*, not *whether*.

Real opening choices at this age:
- "Do you want to start with the subject you like most, or get the hardest one out of the way first?"
- "Do you want to work at the table or on the floor today?"
- "Do you want to use the blue pen or the pencil?"

Small enough to feel almost silly. That's fine — at this age even a tiny genuine choice flips the on-switch, because the Storm gets to feel it was *theirs.*

**Your work:** let the small choice stand, even when it's not what you'd pick. Floor instead of table. Easy subject first. Let it ride.`,

      "10-11":
`At 10–11, move the choice up a level — from physical setup to **sequence and approach.** You're shifting from the person who directs to the person who offers. Still involved, but a step back.

Real opening choices at this age:
- "Do you want to plan the order yourself, or want me to help you map it out first?"
- "Do you want ten minutes to yourself first, then start — or start now and be done earlier?"
- "Do you want to check answers together at the end, or do it fully on your own and just show me?"

**Your work:** when they choose a plan you think is inefficient, let them run it anyway. A 10–11 Storm learns ownership is real by being allowed to own an imperfect plan — and often it works better than you expected.`,

      "12-14":
`At 12–14, this is a different situation, and pretending it isn't will backfire. "Table or floor" is patronizing at this age — a teenager's ownership need has grown into *"why are you involved in my homework at all."* So the choice has to be bigger and more real: **the choice is often about your level of involvement itself.**

Real opening choices at this age:
- "Do you want me involved in this at all tonight, or do you want to own it and just tell me if you hit a wall?"
- "Do you want to decide when it gets done tonight, as long as it's done — or do you want a set time?"
- "Do you want me to back off homework completely this week and just be here if you ask?"

Yes — some of these mean genuinely stepping back, possibly a lot. That's not you giving up. For a 14-year-old Storm, offering real autonomy *is* the move. Pushing a teenager who's already pulling away doesn't just fail — it can damage the relationship in ways that are hard to repair, and a teen can withdraw completely in a way an 8-year-old can't.

**Your work — and it's the hardest part:** when they take the autonomy you offered and you can see them about to do it badly, hold back anyway, unless it's genuinely high-stakes. The trust you build by *not* stepping in is the thing that makes them let you back in later.`,
    },

    moveOutroShared:
`What makes this work is not the choice itself — it's what it does to the *moment.* You've handed ownership over before the stand-off can start. The Storm's on-switch — *this is mine* — gets flipped by them, not forced by you. And because they chose it, your instinct to push has nothing to push against.

**The hard part is yours, not theirs.** Once they choose, you have to actually let them have it. If you override the choice, it stops being real — and a Storm can smell a fake choice instantly, at any age. The entire move depends on you holding back. That's the work this week.`,

    whatWorkingLooksLike:
`Let's be honest about the size of the win, because a false promise here would break your trust the first night it doesn't come true.

**You are not going to fix homework this week.** You're not going to change your child's attention type — that's not a thing that changes, and it's not the goal. Your Storm will still be a Storm on Sunday.

What you're looking for is smaller and more important than that: **a few nights where the *start* of homework was less of a fight than usual.** That's it. Maybe two out of five days. Maybe the stand-off was shorter. Maybe they sat down without you asking twice. Maybe you noticed your own urge to push and held it, and something eased.

If you got even one night like that — one night where handing over a real choice changed the start — you've just seen the entire system work in miniature. Everything in the weeks ahead is that same principle, applied to bigger moments. The homework start is where it's easiest to see first.

And if you got *none* this week? That's real data, not failure. The most common reason it doesn't land in Week 1 is that the choice wasn't actually real — an override slipped in, or the options were "do it my way or my other way." That's the first thing to check. This is a skill for you too, and skills take a few tries.`,

    thingToHoldOnto:
`The reason this works isn't a trick. It's true: your child genuinely does focus better on things that feel like their own. You've watched it happen with the things they love. Homework has just never been allowed to feel that way.

You're not manipulating them into focusing. You're removing the one thing — the sense of being controlled — that was switching their focus off. That's not a technique you're running on your child. It's a truer way of working *with* how they're actually built.

Next week, we take this same principle off the homework table and into the moment you've probably been dreading most: screens.

*Week 1 complete when you've reached the weekend review — whether or not every day went to plan. Showing up imperfectly still counts.*`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "When something is {{child_name}}'s own idea versus told-to-do, does the energy flip? Don't change anything — just watch for that switch tonight. That's the whole observation.",
        "10-11": "Don't change anything yet. Tonight, at homework time, simply notice: what does the start actually look like? Who speaks first? When does your instinct to push fire — what exact moment? You're gathering your own evidence before you change anything. *(If you notice the urge to jump in and can feel where it comes from — that's the whole observation. That's enough.)*",
        "12-14": "Notice how hard {{child_name}} pushes back when something isn't {{child_pronoun_poss}} choice — and how that same energy vanishes when it is. Just watch tonight. Don't change anything yet.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Offer two ways to begin, then step back.",
      content: {
        "8-9":   "Before homework starts, offer one small, real choice from the weekly read — \"table or floor?\" or \"easy first or hard first?\" Offer it once, let them pick, and let the pick stand. Just watch the next five minutes.",
        "10-11": "Use one of the choices from the weekly read (or your own, at the same level). Offer it once, calmly, before homework starts. Then let them choose and let the choice stand. Notice what happens in the next five minutes — not the whole session, just the start. Did the stand-off happen or not?",
        "12-14": "Use one of the choices from the weekly read — at 12–14, those options are about your level of involvement, not about setup. Offer it once. Then step back and actually mean it. Notice whether the start changes.",
      },
      // Reflection drives Day 3's opening text.
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Yesterday worked. Good. Today, protect it. Offer the same kind of choice again, and this time the whole job is to not add anything on top of a good thing.",
          mixed:      "Yesterday was mixed. Normal. A partial result on day one is exactly what most parents see. Run it again today; consistency is what turns a flicker into a pattern.",
          didnt_land: "Yesterday didn't land. The single most common reason is that the choice wasn't fully real — a reminder or an override slipped in right after, or the options were \"my way or my other way.\" Today, offer the choice and then say nothing else at all for five minutes. Test whether pure, un-topped-up ownership changes anything.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and this time catch yourself.",
      content: {
        "8-9":   "Offer the opening choice again. Today: the moment you feel like adding \"and hurry up\" or fixing the option they chose — don't. Just let their choice be the whole instruction. Notice how hard that is.",
        "10-11": "Offer the opening choice again, and the moment you feel the urge to add something — a reminder, a \"hurry up,\" a better suggestion than the one they picked — *don't.* Let their choice be the only instruction. Notice how that feels for you. (Uncomfortable is normal.)",
        "12-14": "Offer the opening choice again. Today, catch the moment you want to modify it after they've chosen — a \"but just make sure you...\" or a check-in five minutes later. Don't. Let the choice stand alone.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row now — or your first one. Either way, keep doing exactly what you did yesterday. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Before today, check the basics: is the choice genuinely open, or has \"choice\" quietly become \"pick which order you do what I already decided\"? If it's genuinely open and still not landing, that's real information — some kids need more than one week to trust that a choice is real. Keep going.",
        },
      },
    },
    {
      day: 4,
      title: "Let them pick the harder one, even knowing it won't go well.",
      content: {
        "8-9":   "Offer the choice. Today, if {{child_name}} picks the option you wouldn't — the harder-to-start one, the floor instead of the table — let it ride all the way. Watch what happens. Often it goes fine. Sometimes it doesn't, and that's information too, not a failure.",
        "10-11": "Offer the choice. Today, if they pick the option you wouldn't have — the harder-to-start one, the messier setup, the \"I've got it, back off\" — let it ride anyway, all the way. A Storm learns ownership is real by being allowed to own an imperfect decision. Watch what happens. Often it goes better than you'd expect. Sometimes it doesn't — and that's real information too, not a failure.",
        "12-14": "Offer the choice. Today, if {{child_name}} picks the option you wouldn't have — the harder-to-start one, the messier setup, the \"I've got it, back off\" — let it ride anyway, all the way. A Storm learns ownership is real by being allowed to own an imperfect decision. Watch what happens. Often it goes better than you'd expect. Sometimes it doesn't — and that's real information too, not a failure. This is the day to actually honor \"back off\" if that's what they chose. Hardest one. Most important one.",
      },
      // nextDayOpening uses day4_reflection to open Day 5.
      // "mixed" and "didnt_land" share the same text per spec ({{#if day4_reflection != "worked"}}).
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today's the day to make sure they know why. Name it so the win gets attached to their ownership, not to luck.",
          mixed:      "It's been mixed or slow. Still name it. Recognition of even a small moment of ownership is often the thing that tips a mixed week toward a better second week — don't skip this because the week wasn't perfect.",
          didnt_land: "It's been mixed or slow. Still name it. Recognition of even a small moment of ownership is often the thing that tips a mixed week toward a better second week — don't skip this because the week wasn't perfect.",
        },
      },
    },
    {
      day: 5,
      title: "Tell them what they ran, not that they behaved.",
      // Opening fork (from Day 4's nextDayOpening) is rendered before this content.
      // Day 5 collects day5_reflection — the last tap of the week.
      // No nextDayOpening: Weekend uses week_trend computed from all 4 taps (day2–5).
      content: {
        "8-9":   "Offer the choice as usual. Afterward, say one true thing: *\"You decided how to start — that was yours.\"* Short, specific, and honest. At this age, being seen doing their own thing matters a lot.",
        "10-11": "Offer the choice as usual. Afterward, if the start went even slightly smoother, say one true, specific thing about them — not praise for obeying, but recognition of their ownership: *\"You decided how to start today. That was yours.\"* Keep it small and honest. A Storm doesn't want to be managed; they want to be seen running their own show.",
        "12-14": "Offer the choice as usual. Afterward — if anything went slightly better — say one genuine, non-gushing thing: *\"You ran that yourself.\"* No praise inflation. A teenager can smell a managed compliment, and it will cost you the next day.",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
        // No nextDayOpening: weekend uses week_trend computed from day2+day3+day4+day5 taps.
      },
    },
  ],

  weekendReview: {
    // week_trend values: "mostly_worked" | "mixed" | "mostly_didnt_land"
    // 12-14 block in "mostly_didnt_land" includes a teen-specific sentence (see spec).
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}You've just seen the whole system work in miniature. What you did this week — hand over real ownership, hold back your instinct — is the exact thing every week ahead builds on, applied to bigger moments. You're ready for screens.{{/if}}{{#if week_trend == "mixed"}}That's the most common week-one shape, and it's a good sign, not a bad one. A pattern that flickers a few times is a pattern that can be built. The consistency comes next week.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Real data, not failure. The most common cause: the choice wasn't fully real.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've just seen the whole system work in miniature. What you did this week — hand over real ownership, hold back your instinct — is the exact thing every week ahead builds on, applied to bigger moments. You're ready for screens.{{/if}}{{#if week_trend == "mixed"}}That's the most common week-one shape, and it's a good sign, not a bad one. A pattern that flickers a few times is a pattern that can be built. The consistency comes next week.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Real data, not failure. The most common cause: the choice wasn't fully real.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}You've just seen the whole system work in miniature. What you did this week — hand over real ownership, hold back your instinct — is the exact thing every week ahead builds on, applied to bigger moments. You're ready for screens.{{/if}}{{#if week_trend == "mixed"}}That's the most common week-one shape, and it's a good sign, not a bad one. A pattern that flickers a few times is a pattern that can be built. The consistency comes next week.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Real data, not failure. The most common cause: the choice wasn't fully real. With a teenager especially, they may have spent the week testing whether the autonomy you offered was genuine, and held back to find out. That test is normal, and passing it — by staying hands-off — is often what unlocks week two.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
