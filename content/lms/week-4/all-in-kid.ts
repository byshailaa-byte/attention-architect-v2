import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 4,
  weekTitle: "Coming back after a slip",

  weeklyReading: {
    introShared: `Weeks 1–3 protected {{child_name}}'s depth from outside interruption. This week is different: what happens when the depth itself leads somewhere unproductive — a project that's not working, a wrong approach pursued at length? Protecting depth has to include protecting it through a bad stretch, not just defending it from the outside.`,

    moveCalibration: {
      "8-9": `You'll want to redirect the moment a deep session looks like it's "going nowhere" — that's usually too early to tell. Let a session run its course this week even when it looks unproductive from outside. The wandering itself might be part of how {{child_name}} works something out.`,
      "10-11": `The instinct will be to point out, gently, that the approach isn't working — "have you thought about doing it this way instead?" Even offered kindly, that interrupts the depth you're trying to protect. Let one session run to its own natural stopping point this week without steering it.`,
      "12-14": `At this age the risk is subtler — treating a long unproductive session as evidence something's wrong (with the approach, with the effort, with {{child_pronoun_poss}} judgment). Resist evaluating the session by its outcome. Depth that goes nowhere once in a while is still real depth.`,
    },

    moveOutroShared: `This isn't about letting genuinely wasted time go unaddressed forever — it's about not treating one unproductive stretch as proof the depth itself needs correcting.`,

    whatWorkingLooksLike: `You've stopped using outcome as a proxy for whether depth is "working." A session that goes nowhere gets the same protection as one that produces something.`,

    thingToHoldOnto: `Depth that only gets protected when it's paying off isn't really being protected — it's being evaluated.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": `Notice a deep session this week that starts to drift somewhere that doesn't look useful — and notice how quickly you decide it's "not working."`,
        "10-11": `Same, but pay attention to what your own signal is — is it the content of what {{child_name}} is doing, or just how long it's taking to look like something?`,
        "12-14": "Notice a long session where the direction genuinely seems wrong to you — and notice whether that judgment is about the work or about your own comfort with not knowing where it's headed.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let a session run even when it clearly isn't going anywhere.",
      content: {
        "8-9": "When you spot it, say nothing and let the session keep going on its own terms, even past where it looks worthwhile.",
        "10-11": `Hold back any version of "maybe try..." — even said once, gently. Let {{child_name}} find the session's own shape.`,
        "12-14": "Say nothing at all, including facial cues. At this age {{child_name}} reads posture and tone as clearly as words.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — you let it run and stayed quiet. Keep doing that — don't ask afterward how it went, which reintroduces evaluation.\n**Mixed** — you held back mid-session but checked in with something that read as concern. Notice the gap between checking in and checking up.\n**Didn't land** — you redirected. Worth naming honestly what made this one feel too far off-track to leave alone.`,
        "10-11": `**Worked** — you let it run and stayed quiet. Keep doing that — don't ask afterward how it went, which reintroduces evaluation.\n**Mixed** — you held back mid-session but checked in with something that read as concern. Notice the gap between checking in and checking up.\n**Didn't land** — you redirected. Worth naming honestly what made this one feel too far off-track to leave alone.`,
        "12-14": `**Worked** — you let it run and stayed quiet. Keep doing that — don't ask afterward how it went, which reintroduces evaluation.\n**Mixed** — you held back mid-session but checked in with something that read as concern. Notice the gap between checking in and checking up.\n**Didn't land** — you redirected. Worth naming honestly what made this one feel too far off-track to leave alone.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Don't offer the better approach you can see from across the room.",
      content: {
        "8-9": `Choose one session in advance and commit to letting it run its full course even if it visibly fizzles — no redirect, no wrap-up prompt, no "well, at least you learned something."`,
        "10-11": `Same, but pick something {{child_name}} has invested real time in already, so the stakes of "it didn't pay off" are genuine, not trivial.`,
        "12-14": `Let {{child_name}} be the one who decides when it's over, including the option of just walking away from it unfinished, with no debrief unless {{child_pronoun_subj}} initiates one.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say the focus was real, even though it didn't produce anything.",
      content: {
        "8-9": `*"That one didn't really go anywhere, and that's okay. You still gave it real focus."*`,
        "10-11": `*"That session didn't turn into anything — that happens. Doesn't mean the focus wasn't real."*`,
        "12-14": `*"That one fizzled. Doesn't need fixing or explaining — just noting it happened."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did it get any easier to let a session go nowhere by the end of the week?",
      "10-11": `What told you a session was "not working" — was it actually true, or just how it looked from outside?`,
      "12-14": `Did {{child_name}}'s own relationship to unproductive sessions shift at all this week, or just yours?`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
