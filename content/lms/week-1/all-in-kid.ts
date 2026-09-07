import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-allinkid-captain.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc, shared across archetypes per authoring notes.
export const weekContent: LmsWeekContent = {
  archetype: "all-in-kid",
  week: 1,
  weekTitle: "Getting started without the push",

  weeklyReading: {
    introShared: `{{child_name}} can disappear into something for two hours and not hear you call {{child_pronoun_obj}} for dinner. Not ignoring you — genuinely gone, so deep in the thing that the outside world has stopped registering. And this, more than almost anything, is the trait that gets misread. Because the same child who can vanish into a book or a build or a game for hours is the one who "can't focus" on homework — and the contradiction makes no sense until you understand what's actually going on.

The All-In Kid's depth is real and it's a gift. When {{child_pronoun_subj}}'s in, {{child_pronoun_subj}}'s *all* in — the kind of total absorption that produces real work, real learning, real skill. The problem was never a lack of focus. It's the opposite: {{child_pronoun_subj}} focuses so completely that interruption is uniquely costly. For most children, being pulled out of a task and put back is a minor tax. For an All-In Kid, it's expensive — the depth {{child_pronoun_subj}} builds takes time to reach, and every interruption doesn't just pause the work, it collapses the whole tower and makes {{child_pronoun_obj}} rebuild from the ground.

This is why the homework struggle so often isn't about the homework. It's about the *conditions*. A worksheet done in a room with a TV on, a sibling wandering through, a phone buzzing, and a parent checking in every few minutes is, for this child, nearly impossible — not because the work is hard, but because {{child_pronoun_subj}} can never get deep enough to do it well before the next interruption resets {{child_pronoun_obj}}. And then it looks like {{child_pronoun_subj}} can't focus, when the truth is {{child_pronoun_subj}} was never allowed to.

So this week does one thing, and it's almost embarrassingly simple: it protects the deep time. It gives {{child_name}} one genuinely uninterrupted stretch — no check-ins, no "how's it going," no ambient chaos — and lets the depth {{child_pronoun_subj}}'s capable of actually happen. Not more time. *Protected* time. The lever here isn't quantity; it's the absence of interruption. And the hardest part, often, is not managing {{child_pronoun_obj}} — it's managing everyone else, including your own well-meaning instinct to check in.

The revelation of this week, for many parents, is discovering that the interruptions they were fighting were partly their own. The "are you working?" check, the "don't forget to—" reminder, the helpful snack delivery — each one, however loving, was a small collapse of the tower. Protect the block fully, and you'll often meet a child you didn't know did homework: the same one who could already disappear into everything else.`,

    moveCalibration: {
      "8-9": `For a younger All-In Kid, keep the protected block short and fully guarded — 15 minutes of genuine no-interruptions is plenty at this age. Clear the space, hold off your own check-ins, and let {{child_name}} stay in it without anyone breaking the spell. The point {{child_pronoun_subj}}'ll feel is simple and powerful: nobody bugged me, and look how much I did. Examples: a 15-minute "nobody interrupts" stretch; physically removing the obvious distractions first; leaving the room for the first stretch if your own presence tends to become check-ins.`,
      "10-11": `At this age, extend the block toward 25–30 minutes and start letting {{child_name}} feel ownership of protecting it. Clear one genuine stretch of interruptions — including your own — and if {{child_pronoun_subj}}'s still deep in it when time's up, don't cut it short. The middle-band All-In Kid can begin to notice what protected time does for {{child_pronoun_obj}}, which is the start of {{child_pronoun_subj}} learning to build those conditions {{child_pronoun_poss}}self. Examples: a 25-minute guarded block; letting a good deep session run past the "stop" point; checking, together, what tends to break the focus so {{child_pronoun_subj}} starts seeing the pattern.`,
      "12-14": `With a teen All-In Kid, hand over the protecting itself — ask directly what pulls {{child_pronoun_obj}} out of deep focus, and set up the block based on {{child_pronoun_poss}} own answer. A 12–14 can own {{child_pronoun_poss}} conditions, and at this age the self-knowledge — "I need my phone in another room and no one checking on me" — is the durable skill worth more than any single session. Let a real deep session run long when it's producing something that matters to {{child_pronoun_obj}}, and name the depth as the rare strength it is. Examples: {{child_pronoun_subj}} designing {{child_pronoun_poss}} own protected block; phone genuinely elsewhere by {{child_pronoun_poss}} choice; you consciously *not* interrupting, and naming that the deep-focus ability is genuinely uncommon.`,
    },

    moveOutroShared: `What makes this work is not the length of the block — it's the integrity of it. An All-In Kid needs time to reach depth, and depth is fragile to interruption in a way that ordinary focus isn't. So the same 30 minutes, broken by three check-ins, is nearly worthless, while 30 minutes truly uninterrupted can produce more than an hour of fragmented time. The lever is protection, not duration. And the interruptions most worth removing are often the gentlest ones — the loving check-ins that each, quietly, ask {{child_pronoun_obj}} to start over.`,

    whatWorkingLooksLike: `A good week does not look like {{child_name}} focusing easily in a busy, interrupted room — that room is the actual problem, and no amount of willpower fixes it. It looks like real, visible depth appearing when the block is genuinely protected, and more getting done in a guarded 25 minutes than in a scattered hour. A "bad" week almost always means the block wasn't fully protected — "no interruptions" quietly meant "fewer interruptions," or your own check-ins crept back in. If it's not landing, check that honestly first: was the deep time actually protected, or just a little quieter than usual?`,

    thingToHoldOnto: `The thing to hold onto is that {{child_name}}'s capacity for total absorption is genuinely rare and genuinely valuable — it's the same trait that, protected and pointed, produces deep skill, real mastery, the kind of work that comes only from going all the way in. The struggle was never the depth. It was the conditions around it. The work of these weeks isn't to make {{child_pronoun_obj}} a shallower, more interruptible child who can half-focus through chaos like everyone else. It's to help {{child_pronoun_obj}} — and you — build the conditions where the depth {{child_pronoun_subj}} already has can actually land. Next week, we take this same principle somewhere new.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Today, when {{child_name}} gets deep into something, count how many times {{child_pronoun_subj}} gets interrupted before finishing. Don't stop it. Just count.",
        "10-11": "No move yet. Just notice: today, when {{child_name}} gets deep into something, how many times does someone — you, a sibling, a notification — interrupt before {{child_pronoun_subj}} finishes? Don't change anything. Just count.",
        "12-14": "Notice how often {{child_name}} gets pulled out of deep focus before {{child_pronoun_subj}} finishes — and by what. Don't intervene yet. Just gather the pattern.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Pick one block and guard it — no check-ins, no snack runs.",
      content: {
        "8-9":   "Pick one thing today. Give {{child_name}} 15 minutes with no interruptions — no questions, no \"how's it going.\" Just let {{child_pronoun_obj}} stay in it.",
        "10-11": "Pick one task today. Before {{child_name}} starts, clear the next 30 minutes of interruptions on your end — no check-ins, no \"how's it going,\" nothing. Let the depth run uninterrupted once.",
        "12-14": "Ask {{child_name}} directly: *\"When you're locked into something, what pulls you out?\"* Then set up one genuinely uninterrupted stretch based on {{child_pronoun_poss}} answer — phone elsewhere, you off {{child_pronoun_poss}} back.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today. Protect the block the same way — the goal now is consistency, not intensity.",
          mixed:      "Same move — check what broke it. Was the interruption external (a sibling, a phone) or did you step in without meaning to?",
          didnt_land: "The block probably wasn't fully protected. Try again, and this time, physically leave the room for the first 10 minutes.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Same quiet stretch as yesterday. If you feel the urge to peek in on how {{child_name}} is doing — hold back this time.",
        "10-11": "Protect the same uninterrupted block as yesterday. The extra task today is yours: notice the moment you feel like checking in — and don't.",
        "12-14": "Same protected stretch. Let {{child_name}} set it up {{child_pronoun_poss}} own way today — honor that setup even if it's different from what you'd choose.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Before going again, check whether the block was fully protected — sometimes a small check-in is all that broke it.",
        },
      },
    },
    {
      day: 4,
      title: "Let it run past the point you'd normally call time.",
      content: {
        "8-9":   "If {{child_name}} is still happily deep in it when time's up, don't stop {{child_pronoun_obj}}. Let it run a bit more.",
        "10-11": "Today, if {{child_name}} is still deep in it when the \"usual\" stopping point arrives, don't call time. Let it run until {{child_pronoun_subj}} naturally surfaces. Notice how long that actually takes.",
        "12-14": "Don't cap it at a \"reasonable\" time. If {{child_pronoun_subj}} is deep in something that matters to {{child_pronoun_obj}}, let it run long and notice what {{child_pronoun_subj}} produces when nothing cuts it short.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today, make sure they know why. Name it specifically.",
          mixed:      "It's been mixed or slow. Still name it — recognition of even a small moment is what tips a mixed week toward a better second week.",
          didnt_land: "It's been mixed or slow. Still name it — recognition of even a small moment is what tips a mixed week toward a better second week.",
        },
      },
    },
    {
      day: 5,
      title: "Say what they got into, not that they sat still.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"Nobody bugged you today, and look how much you did.\"* Simple, true, {{child_pronoun_poss}} to keep.",
        "10-11": "After today's block, say one specific thing: *\"I noticed you didn't get pulled out of that today. That's yours.\"* Not praise for finishing — recognition of the depth itself staying intact.",
        "12-14": "Tell {{child_name}}: *\"That ability to go really deep is genuinely rare. Most people can't do that. It's worth protecting.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}You've found the lever — quiet, protected time. That's the whole system in miniature.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The interruptions you're fighting are often habits on your end too, not just external ones.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — was the block ever really quiet, or just quieter than usual?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the actual lever — protected time, not more time. That's the whole system in miniature.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The interruptions you're fighting are often habits on your end too, not just external ones.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking honestly — was the block ever fully protected, or did "no interruptions" quietly mean "fewer interruptions"?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}{{child_pronoun_subj|cap}} now knows {{child_pronoun_poss}} own lever — protected time. You've seen the system work.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. It's worth an honest conversation about what actually breaks the focus — {{child_pronoun_subj}} probably has a clearer view than you do.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth an honest talk about what actually breaks the focus — the interruptions may be partly self-inflicted. Name that honestly, together.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
