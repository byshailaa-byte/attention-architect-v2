import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-remaining-six.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc, shared across archetypes per authoring notes.
export const weekContent: LmsWeekContent = {
  archetype: "glue",
  week: 1,
  weekTitle: "Getting started without the push",

  weeklyReading: {
    introShared: `Some children can wall off a bad mood and work anyway. {{child_name}} is not one of them, and this week is about why that's not the problem it looks like.

Here is the pattern you've probably half-noticed without naming it: on a morning when the house is tense — a rushed departure, a sibling fight, two adults who are quietly not okay with each other — {{child_name}}'s focus falls apart. And not just on the hard things. On everything, including tasks that have nothing to do with whatever the tension was about. It can look like {{child_pronoun_subj}}'s using the mood as an excuse. Like {{child_pronoun_subj}}'s too sensitive. Like {{child_pronoun_subj}} should be able to just get on with it.

But the Glue doesn't work that way, and it's worth understanding *why* rather than wishing it were otherwise. This child reads the emotional room first — it's the first thing {{child_pronoun_subj}} takes in, often before {{child_pronoun_subj}}'s even aware of doing it. And until that room feels okay, the part of {{child_pronoun_obj}} that could concentrate simply isn't available. It's not that {{child_pronoun_subj}} won't focus through tension. It's that, for {{child_pronoun_obj}}, connection comes *before* concentration — not as a preference, but as an order of operations. You cannot get to the second until you've handled the first.

This reframes the whole evening. When homework won't start and the day's been rough, the instinct is to push harder into the homework. For a Glue, that's pushing on the wrong thing entirely. The blocker isn't the worksheet. It's the unhandled feeling in the room. Clear that — genuinely, even briefly — and the focus that seemed impossible a minute ago may open up.

So this week does one thing: it puts connection *first*, on purpose, before the ask. Two real minutes of genuine contact before "okay, let's do this." Not as a manipulation — and this matters enormously for a Glue, who can feel the difference between real connection and a warm-up trick faster than almost any other child — but as the actual first step of getting anything done. And when the room *is* tense, it does something braver than pretending: it names the tension simply, out loud, because for this child naming a feeling often releases more than working around it ever could.

The move is small and it may feel almost too soft to count as a strategy. Trust it. For a child who runs on connection, connection *is* the strategy.`,

    moveCalibration: {
      "8-9": `For a younger Glue, keep connection simple and physical. Before asking {{child_name}} to focus, two genuinely warm minutes first — a hug, a small shared laugh, a "how are you, really?" that isn't about the work. And if something's clearly off, name it in small words: "Feels a bit grumpy in here today — that's okay, let's just do a little." At this age the naming is powerful precisely because it's simple; you're teaching {{child_pronoun_obj}} that feelings can be said out loud and the world stays fine. Examples: a two-minute cuddle before homework; naming the mood plainly and kindly; doing "just a little" on a hard day instead of the full amount.`,
      "10-11": `At this age, the connection stays real but can become a touch more conversational. Take two minutes to actually check in — not about the task — before the ask, and mean it. When the room's tense, name it a little more specifically: "This morning was rough, huh? Let's take it easy and just get started." The middle-band Glue is beginning to understand {{child_pronoun_poss}} own pattern, and you can gently point at the link — "notice how it's easier once we're okay with each other?" Examples: a genuine check-in chat first; naming the specific tension rather than a vague "you okay?"; letting {{child_pronoun_obj}} tell you what's off before moving to work.`,
      "12-14": `With a teen Glue, sincerity is everything and manipulation is instantly detected — a 12–14 will shut down hard if connection feels like a tactic to get compliance. So connect for real, adult to adult, with no strings: a genuine moment that isn't secretly about homework. And when there's tension, name it straight and level: "Things feel tense and I don't want to pretend they're not. We can keep tonight light." Teens deeply respect being leveled with, and for a Glue specifically, that honesty *is* the connection that unlocks the focus. Examples: a real conversation with no agenda before the ask; naming household tension honestly rather than papering over it; letting {{child_pronoun_obj}} name what's wrong and actually hearing it.`,
    },

    moveOutroShared: `What makes this work is not the two minutes themselves — it's what genuine connection does to the room a Glue is reading. This child's attention is gated behind an emotional check: *is it okay here?* When the answer is yes, the gate opens and the focus that seemed gone was never actually gone — just locked behind the wrong question. That's why a warm-up that's secretly a tactic doesn't work: the Glue reads *is this real?* as part of *is it okay here?*, and a fake moment fails both tests at once. The connection has to be true, because the child can tell.`,

    whatWorkingLooksLike: `A good week does not look like tension never affecting {{child_name}} again — it will, and that's not a failure, it's the wiring. It looks like the evenings going more smoothly when you connect first, and the hard days getting a little less catastrophic because the feeling got named instead of ignored. A "bad" week usually means the connection wasn't actually clear before the ask — the air was quiet but not clear, or the "warm moment" had a homework-shaped string attached that {{child_name}} felt immediately. If it's not landing, check that honestly: was the room genuinely okay before you asked {{child_pronoun_obj}} to focus, or did you just lower your voice and push anyway?`,

    thingToHoldOnto: `The thing to hold onto is that {{child_name}}'s sensitivity to the emotional room is not a fragility to toughen out of {{child_pronoun_obj}}. It's the early form of something valuable — the ability to read people, to feel a room, to know when something's off before anyone says so. The work is not to make {{child_pronoun_obj}} numb to tension so {{child_pronoun_subj}} can grind through it. It's to help {{child_pronoun_obj}} understand {{child_pronoun_poss}} own order of operations — connection first, then everything else — so {{child_pronoun_subj}} can meet it deliberately instead of being ambushed by it. Next week, we take this same principle somewhere it matters even more.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "On a day with some tension — a rushed morning, a squabble — does {{child_name}}'s focus dip even on easy stuff? Just watch.",
        "10-11": "No move yet. Today, notice the sequence: on a day with tension in the house — a fight, a stressed morning — does {{child_name}}'s focus drop even on unrelated tasks? Just watch whether the mood comes first and the focus follows.",
        "12-14": "Notice whether tension in the house drops {{child_name}}'s focus even on unrelated things. Just watch the sequence.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Connect for two minutes before mentioning what needs doing.",
      content: {
        "8-9":   "Before asking {{child_name}} to focus, have two nice minutes together first — not about the work. Then ask.",
        "10-11": "Pick one task today. Before asking {{child_name}} to concentrate, take two minutes to actually connect first — not about the work, just a real moment. Then make the ask.",
        "12-14": "Have a genuine moment with {{child_name}} before any ask — and don't make it transactional. A teen can smell \"I'm being nice so you'll study.\"",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today. The two minutes of connection isn't a warm-up trick — it's the actual thing. Keep it genuine.",
          mixed:      "Same move — check whether the connection was real or whether it became \"a quick chat so you'll focus now.\"",
          didnt_land: "The air may not have actually been clear. Try again on a calmer moment, and notice if the focus follows.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Two happy minutes before the ask, same as yesterday. Make sure it's a real moment — not a quick warm-up before you get to the point.",
        "10-11": "Connect before the ask again. Today, check whether the connection feels genuinely real or whether it's starting to feel like a ritual before the ask.",
        "12-14": "Genuine moment before the ask, same as yesterday. Make sure it doesn't have strings on it — a teen can smell the tactic if the warmth is instrumental.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Was the air actually clear before the ask, or just quiet? There's a difference.",
        },
      },
    },
    {
      day: 4,
      title: "Don't let those two minutes turn into the lead-in to a task.",
      content: {
        "8-9":   "If something feels off, just say it: *\"Feels a bit grumpy today — that's okay, let's do a little.\"*",
        "10-11": "Today, if there's something off in the room, say it plainly and simply before the task: *\"Things feel a bit tense today — that's okay, let's just do a little.\"* Naming it often releases more than pretending it isn't there.",
        "12-14": "If something's off, say it straight: *\"Things feel tense — I don't want to pretend they're not. We can keep it light today.\"* Teens respect being leveled with.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today, make sure they know why. Name it specifically.",
          mixed:      "It's been mixed or slow. Still name it — recognition of even a small moment of connection is what tips a mixed week toward a better second week.",
          didnt_land: "It's been mixed or slow. Still name it — recognition of even a small moment of connection is what tips a mixed week toward a better second week.",
        },
      },
    },
    {
      day: 5,
      title: "Say you noticed how they were doing, not that they got started.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"We were happy together today, and the work was easier, wasn't it?\"*",
        "10-11": "After today, say one specific thing: *\"We were good with each other today, and the work just went easier, didn't it?\"* Let {{child_name}} feel the link between connection and concentration — because for {{child_pronoun_obj}}, it's real.",
        "12-14": "Tell {{child_name}}: *\"When we're good, your focus is better — that's real, and it's worth you knowing about yourself.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Happy first, then focus. You've found the lever.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. A real connection before the ask takes practice to keep genuine.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Were you really okay before starting, or just quiet? The air needs to actually be clear.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the lever — connection before concentration. For this child, the emotional room is the study environment.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Clearing the air genuinely, not as a tactic, takes practice.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — was the air actually clear before the ask, or just quiet?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Real connection first — and {{child_pronoun_subj}} felt it. You've found the lever.{{/if}}{{#if week_trend == "mixed"}}Sincerity takes practice. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the air actually clear, or just quiet? A teen reads the difference, and so does {{child_pronoun_poss}} focus.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
