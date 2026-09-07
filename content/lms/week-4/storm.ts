import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "storm",
  week: 4,
  weekTitle: "Coming back after a slip",

  weeklyReading: {
    introShared: `Week 3 asked whether {{child_name}}'s ownership held across a whole routine. This week asks something harder: does it hold when the choice {{child_pronoun_subj}} makes is genuinely a bad one? Real ownership isn't just picking well — it's living with what happens when the pick doesn't work out. That's the part most parenting instinct fights hardest against, especially when watching it happen feels avoidable.`,

    moveCalibration: {
      "8-9": `The moment you'll want to step in is right when you can see the bad choice coming — before {{child_name}} can. That's the hardest window to hold. Let the small stuff go wrong this week. A messed-up chore, a lost game piece from rushing — these are cheap lessons now, expensive ones later if {{child_pronoun_subj}} never gets to have them.`,
      "10-11": `The urge to warn will be strongest right when the mistake is still preventable — "you know that's not going to work, right?" Saying it out loud removes the choice from {{child_pronoun_poss}} hands even if you don't physically intervene. Let the warning stay unsaid this week, at least once, and let the outcome do the talking instead of you.`,
      "12-14": `At this age the temptation shifts from warning to "I-told-you-so," even said gently. The instinct to make sure {{child_name}} registers that you saw it coming actually undercuts the lesson — it turns a real consequence into a parent's correctness contest. Let the outcome be the only teacher this week. Don't narrate your own foresight afterward.`,
    },

    moveOutroShared: `This isn't about letting anything genuinely unsafe happen — it's about the everyday-sized bad choices that are recoverable and instructive. Pick your no-rescue moments deliberately, on stakes you can actually tolerate.`,

    whatWorkingLooksLike: `You're not narrating the lesson anymore, even silently. The consequence does the teaching. You're noticing your own urge to intervene as information about you, not as a signal that {{child_name}} needs rescuing.`,

    thingToHoldOnto: `A choice that's allowed to go wrong is the first choice that's actually real.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice one choice this week where {{child_name}} is heading toward an outcome you can already predict won't go well — something small and safe to let play out.",
        "10-11": "Same, but notice specifically what your body does right before you'd normally step in — the tightening, the urge to speak. That's the signal to watch for later this week.",
        "12-14": "Notice a choice where {{child_name}} is confident and you're not — and where the gap between those two things is the actual thing under test this week.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let one choice go through without the warning you want to give.",
      content: {
        "8-9": `When the moment comes, say nothing. Let the choice happen and the small consequence land. *"That's your call."*`,
        "10-11": `Same move, said plainly: *"I see it differently, but it's yours to decide."* Then actually stop there.`,
        "12-14": "Say less than that, if anything. At this age, a spoken disclaimer can still read as a hedge. Silence plus follow-through is the fuller signal.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — {{child_name}} handled the consequence without you softening it. Let this repeat without commentary; don't turn it into a teaching moment out loud.\n**Mixed** — the choice went through, but you found yourself softening the landing afterward (fixing it quietly, or over-praising the recovery). Notice what triggered that — was it the outcome, or your own discomfort?\n**Didn't land** — you stepped in before the choice played out. That's real information, not a failure — notice exactly what moment made stepping in feel necessary, and try again on a lower-stakes version.`,
        "10-11": `**Worked** — {{child_name}} handled the consequence without you softening it. Let this repeat without commentary; don't turn it into a teaching moment out loud.\n**Mixed** — the choice went through, but you found yourself softening the landing afterward (fixing it quietly, or over-praising the recovery). Notice what triggered that — was it the outcome, or your own discomfort?\n**Didn't land** — you stepped in before the choice played out. That's real information, not a failure — notice exactly what moment made stepping in feel necessary, and try again on a lower-stakes version.`,
        "12-14": `**Worked** — {{child_name}} handled the consequence without you softening it. Let this repeat without commentary; don't turn it into a teaching moment out loud.\n**Mixed** — the choice went through, but you found yourself softening the landing afterward (fixing it quietly, or over-praising the recovery). Notice what triggered that — was it the outcome, or your own discomfort?\n**Didn't land** — you stepped in before the choice played out. That's real information, not a failure — notice exactly what moment made stepping in feel necessary, and try again on a lower-stakes version.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let a real one land — including the part where it doesn't work.",
      content: {
        "8-9": "This is the week's actual test. Choose (in advance, not in the moment) one real, safe-to-fail decision to hand fully to {{child_name}} and let the natural consequence happen without any intervention — not even a warning beforehand.",
        "10-11": "Same, but pick something with a slightly more real cost — a forgotten item, a missed prep step — something {{child_name}} will actually feel, not just notice.",
        "12-14": "Pick something where the consequence is social or reputational in a small, recoverable way (not just a logistics inconvenience) — this is where ownership actually starts to matter at this age.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they handled the fallout, not that they should've listened.",
      content: {
        "8-9": `Tell {{child_name}}: *"That didn't go the way you wanted. You handled it — that's the real skill, not getting it right every time."*`,
        "10-11": `Tell {{child_name}}: *"That didn't go the way you wanted. You handled it — that's the real skill, not getting it right every time."*`,
        "12-14": `Tell {{child_name}}: *"That didn't go the way you wanted. You handled it — that's the real skill, not getting it right every time."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did letting the small stuff go wrong feel more possible by the end of the week than at the start?",
      "10-11": "What was harder — staying quiet in the moment, or not fixing it afterward?",
      "12-14": `Where did the temptation to say "I told you so" show up, even quietly — and what did it cost to not say it?`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
