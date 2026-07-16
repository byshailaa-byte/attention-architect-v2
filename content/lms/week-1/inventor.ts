import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-remaining-six.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc, shared across archetypes per authoring notes.
export const weekContent: LmsWeekContent = {
  archetype: "inventor",
  week: 1,

  weeklyReading: {
    introShared: `There is a specific, quiet moment that tells you everything about {{child_name}}. {{child_pronoun_subj|cap}} is building something — a solution, a project, a way of doing a task — and it's *wrong*. Slower than it needs to be, messier, heading toward a wall you can already see. And you do the most natural thing a caring parent can do: you step in to help. "Here, try it like this." And in that instant, something goes out of {{child_pronoun_obj}}. The energy drops. The thing that was {{child_pronoun_poss}} becomes yours, and {{child_pronoun_subj}} loses interest in finishing it.

That moment is the whole key to this child. For the Inventor, ownership of the *method* is not a preference — it's the fuel. It's not that {{child_pronoun_subj}} wants to do things the hard way to be stubborn. It's that the doing-it-{{child_pronoun_poss}}-own-way *is* the engagement. Take the method away, even to help, even when you're right, and you take away the reason {{child_pronoun_subj}} was invested in the first place.

This is one of the hardest patterns for a loving parent, because the instinct that breaks it is the instinct to help. You see a better way. You want to save {{child_pronoun_obj}} the frustration. And every time you do, you confirm — without meaning to — that {{child_pronoun_poss}} way doesn't matter, that yours is the real way, that {{child_pronoun_subj}}'s just executing someone else's method badly. For most children that's mildly annoying. For an Inventor, it's the off switch.

So this week does something that will feel, at times, almost physically uncomfortable: it protects {{child_name}}'s method, even when the method is failing. It lets the wrong way run. It replaces "here, do it like this" with silence, and — when {{child_pronoun_subj}} hits a wall — with a question instead of a fix: "What would you try next?" The goal is not a smooth result this week. The goal is to keep the thing {{child_pronoun_poss}}, because a problem {{child_pronoun_subj}} solves {{child_pronoun_poss}} own way, even slowly, even after failing, builds something a rescued success never will.

There's a deeper thing happening here, and it's worth seeing clearly. When you let an Inventor's method fail and then ask what {{child_pronoun_subj}}'d try next, you're not just protecting {{child_pronoun_poss}} mood. You're teaching {{child_pronoun_obj}} that {{child_pronoun_poss}} own thinking is trustworthy — that {{child_pronoun_subj}} can hit a wall, own it, and find the next move without being rescued. That is a rare and durable kind of confidence, and it's built precisely in the moments you most want to step in. This week, don't.`,

    moveCalibration: {
      "8-9": `For a younger Inventor, the move is simple: let the messy way happen, and keep your mouth closed about *how*. Pick one task, let {{child_name}} do it {{child_pronoun_poss}} own way even if you know a faster one, and say nothing about the method. If it goes wrong, resist fixing — at this age, letting it go all the way wrong and then doing it again is where the real learning lives. Keep it low-stakes and warm. Examples: letting {{child_pronoun_obj}} build something the long way without correction; biting your tongue when you see the faster route; asking "what do you want to try next?" instead of showing {{child_pronoun_obj}} when {{child_pronoun_subj}} gets stuck.`,
      "10-11": `At this age, make the ownership explicit and then honor it. Tell {{child_name}} plainly: "How you do this is your call — I'm not going to tell you the right way." Then actually mean it, and notice how hard it is to keep quiet when you can see a better path. The middle-band Inventor benefits from the *stated* trust — hearing that the method is genuinely {{child_pronoun_poss}} — as much as from the space itself. Examples: naming out loud that the approach is {{child_pronoun_poss}} choice; asking {{child_pronoun_poss}} opinion on the method and using it; letting a chosen method fail fully and treating the redo as normal, not a failure.`,
      "12-14": `With a teen Inventor, respecting the method openly builds real trust — and at this age that trust is worth protecting fiercely, because it's the foundation of {{child_pronoun_subj}} bringing you real problems instead of hiding them. Bring {{child_pronoun_obj}} something genuinely open-ended where {{child_pronoun_poss}} own approach is the entire point, ask {{child_pronoun_poss}} opinion and actually use it, and when {{child_pronoun_poss}} method fails, ask rather than tell. A 12–14 Inventor who knows you won't hijack {{child_pronoun_poss}} thinking will show you far more of it. Examples: handing over a real open problem, not a task with a known answer; using {{child_pronoun_poss}} method even when yours is faster; asking "what would you try next?" as a genuine question, not a hint toward your answer.`,
    },

    moveOutroShared: `What makes this work is not the outcome — it's the ownership. When a method stays {{child_name}}'s, the whole task stays {{child_pronoun_poss}}, including the parts that go wrong. And a wall {{child_pronoun_subj}} hits inside {{child_pronoun_poss}} own method is a problem to solve; a wall {{child_pronoun_subj}} hits inside your imposed method is just a reason to quit. The same failure means opposite things depending on whose method it was. That's why "here, do it like this," however kindly meant, so reliably ends the engagement — it changes whose problem it is.`,

    whatWorkingLooksLike: `A good week does not look like {{child_name}} suddenly doing things efficiently. It often looks *slower* — messier methods, longer routes, a wall or two — but with the crucial difference that {{child_pronoun_subj}} stays in it, owns the stuck moments, and finds {{child_pronoun_poss}} own way through. A "bad" week almost always means a correction crept in: you helped, adjusted, or "just suggested," and the method quietly became yours. If it's not landing, check that first and honestly — did the method stay fully {{child_pronoun_poss}}, or did your better way slip in through the side door? For this child, that side door is the whole game.`,

    thingToHoldOnto: `The thing to hold onto is that {{child_name}}'s need to do it {{child_pronoun_poss}} own way is not defiance to be managed out of {{child_pronoun_obj}}. It's the earliest form of genuine problem-solving — the refusal to just execute someone else's steps, the drive to understand a thing by building it yourself. The work of these weeks is not to make {{child_pronoun_obj}} more compliant. It's to protect the builder while helping {{child_pronoun_obj}} channel it, so the same trait that frustrates a homework night becomes the thing that lets {{child_pronoun_obj}} solve problems no one handed {{child_pronoun_obj}} the answer to. Next week, we take this same principle into new territory.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "When {{child_name}} does something {{child_pronoun_poss}} own way — even a messy way — watch what happens if someone says \"do it like this.\" Just watch.",
        "10-11": "No move yet. Today, when {{child_name}} does something their own way — a messier, longer, or \"wrong\" way — notice what happens to the energy if someone corrects the method. Just watch. Don't step in.",
        "12-14": "Notice what happens to {{child_name}}'s engagement when {{child_pronoun_poss}} method gets corrected, even gently. Just watch.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let the wrong way run.",
      content: {
        "8-9":   "Pick one thing today. Let {{child_name}} do it {{child_pronoun_poss}} way, even if you know a faster one. Say nothing about how.",
        "10-11": "Pick one task today. Let {{child_name}} do it entirely their own way, even if you can see a faster route — and say nothing about the method. Let the way {{child_pronoun_subj}} chose actually play out.",
        "12-14": "Tell {{child_name}} directly: *\"How you do this is your call — I'm not going to tell you the 'right' way.\"* Then actually mean it on one task.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today. The hard part is staying quiet when you can see a better way — notice the urge to \"just help.\"",
          mixed:      "Same move — check whether you let the method fully run, or slipped in a small correction.",
          didnt_land: "A correction probably crept in. Try again, and this time let it go *all the way* wrong if it's going to — the learning is in the redo, not the rescue.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Let the messy way run again, all the way. Today, if the urge to \"just help\" comes up — notice it, and put it down.",
        "10-11": "Let the method run again today. The extra task is yours: notice the moment you want to suggest a better way — and hold it.",
        "12-14": "Let the method stay {{child_pronoun_poss}} again. Today, notice the urge to optimize {{child_pronoun_poss}} approach — and hold back.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Did the method stay fully {{child_pronoun_poss}}, or did helpful corrections quietly take it over?",
        },
      },
    },
    {
      day: 4,
      title: "Ask instead of tell.",
      content: {
        "8-9":   "If {{child_pronoun_poss}} way gets stuck, don't fix it. Ask: *\"What do you want to try next?\"*",
        "10-11": "Today, if {{child_name}}'s method hits a wall, don't fix it — ask: *\"What would you try next?\"* Keep the method {{child_pronoun_poss}}, even when it's failing. The problem-solving is the point, not the smooth result.",
        "12-14": "Bring {{child_pronoun_obj}} a real problem, not a task. Give {{child_name}} something genuinely open-ended where {{child_pronoun_poss}} own approach is the point. Ask {{child_pronoun_poss}} opinion on the method and actually use it.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today, make sure they know why. Name it specifically.",
          mixed:      "It's been mixed or slow. Still name it — recognition of even a small moment of method-ownership is what tips a mixed week toward a better second week.",
          didnt_land: "It's been mixed or slow. Still name it — recognition of even a small moment of method-ownership is what tips a mixed week toward a better second week.",
        },
      },
    },
    {
      day: 5,
      title: "Name what {{child_pronoun_subj}} built, their way.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"You did that your own way, and it worked.\"*",
        "10-11": "After today, say one specific thing: *\"You did that completely your own way — and it worked because it was yours.\"* Recognition that the ownership of the method is the strength, not a phase to grow out of.",
        "12-14": "Tell {{child_name}}: *\"You solve things in ways I wouldn't have thought of. That's not something to grow out of — that's the actual skill.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}{{child_pronoun_poss|cap}} way is the strength. You've found the lever.{{/if}}{{#if week_trend == "mixed"}}Staying quiet is hard. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did the way stay fully {{child_pronoun_poss}}, or did small corrections slip in?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the lever — ownership of the *how*. Correct the method and you lose the builder; protect it and you keep {{child_pronoun_obj}} engaged.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Watching a slower, messier way run without stepping in is genuinely hard.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — did the method stay fully {{child_pronoun_poss}}, or did helpful corrections quietly take it over?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Method-ownership keeps {{child_pronoun_obj}} engaged — and now {{child_pronoun_subj}} knows {{child_pronoun_poss}} own way is respected.{{/if}}{{#if week_trend == "mixed"}}Staying hands-off is genuinely hard. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did the method stay genuinely {{child_pronoun_poss}}, or did a "better way" slip in? At this age a single correction can break the whole thing.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
