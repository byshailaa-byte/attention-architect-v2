import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-allinkid-captain.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc shared across all archetypes (authoring notes: "structure
// is identical across all 8 by design") — not archetype-specific content, adapted from Storm's pattern.
export const weekContent: LmsWeekContent = {
  archetype: "captain",
  week: 1,

  weeklyReading: {
    introShared: `Hand {{child_name}} a task to do and watch the energy drain out of {{child_pronoun_obj}}. Hand {{child_pronoun_obj}} something to *run* — really run, {{child_pronoun_poss}} call, {{child_pronoun_poss}} way — and watch a different child show up entirely. Focused, driven, capable, invested. Same task, sometimes. The only thing that changed was who was holding the wheel.

The Captain is built for ownership. Not the decorative kind — "you can choose which color folder" — but the real kind, where {{child_pronoun_subj}}'s actually in charge of how a thing goes and lives with how it turns out. For this child, being in charge isn't a reward for good behavior or a privilege to be earned. It's the condition under which {{child_pronoun_poss}} drive switches on at all. Take the ownership away — reduce {{child_pronoun_obj}} to executing someone else's plan — and the drive doesn't just dim, it vanishes, because the thing that powered it is gone.

This puts a Captain and a directing parent on a collision course that neither chose. You give instructions because that's what parenting a child through tasks looks like. But every instruction, to a Captain, is a small removal of the wheel — a signal that this isn't {{child_pronoun_poss}} to run, {{child_pronoun_subj}}'s just following orders. And a Captain following orders is a Captain with the engine off. So the harder you direct, the flatter {{child_pronoun_subj}} gets, and the flatter {{child_pronoun_subj}} gets, the harder you feel you have to direct — a loop that leaves both of you frustrated and neither of you wrong.

So this week does one thing: it hands {{child_name}} a real call. Not a choice between your pre-approved options — an actual decision, {{child_pronoun_poss}} to make, about how something gets done. And then it does the hard part: it steps back and lets {{child_pronoun_obj}} run it, even if the way {{child_pronoun_subj}} chooses is worse than the way you would have. Because a Captain learns nothing from executing your plan well, and everything from running {{child_pronoun_poss}} own plan — including the parts that go sideways, which {{child_pronoun_subj}} then gets to own too.

The trap to watch for is *supervised autonomy* — the fake handover where you say "it's your call" but keep a hand on the wheel, ready to correct, steering from the passenger seat. A Captain detects this instantly, and it's worse than just directing, because it adds the sting of a promise not kept. This week, when you hand over the wheel, actually let go of it. That single act — real authority, genuinely released — is the thing that switches the engine on.`,

    moveCalibration: {
      "8-9": `For a younger Captain, keep the ownership real but appropriately sized — let {{child_name}} make one genuine call about how a task goes, then actually step back and let it run {{child_pronoun_poss}} way. At this age even a small real decision, honored, lights the engine. If it comes out a bit wobbly, that's fine and it's {{child_pronoun_poss}}. Examples: letting {{child_pronoun_obj}} decide the how of a chore or task, not just the order; genuinely stepping back once you've handed it over; letting {{child_pronoun_obj}} run something small start to finish even if you'd have done it differently.`,
      "10-11": `At this age, hand over calls with a bit more real weight and resist the urge to rescue mid-way. Give {{child_name}} a decision that's genuinely {{child_pronoun_poss}} — including one with a consequence that can actually land — and notice how tempting it is to "helpfully" adjust it once it's underway. Don't. The middle-band Captain learns the most from running something that could go wrong and owning the outcome, good or bad. Examples: a real decision with a real (safe) consequence; consciously not stepping in when {{child_pronoun_poss}} way looks slower; letting {{child_pronoun_obj}} own the result rather than saving {{child_pronoun_obj}} from it.`,
      "12-14": `With a teen Captain, "real" has to mean real — genuine authority over something with genuine stakes, not supervised autonomy, which a 12–14 spots and resents instantly. Hand over a decision that's actually {{child_pronoun_poss}} to make and live with, including the freedom to get it wrong and own that too. At this age, being trusted with real authority is exactly what {{child_pronoun_subj}} needs and exactly what switches the drive on. Examples: a genuine call with real consequences and no hidden veto; letting {{child_pronoun_obj}} lead something that can actually fail; resisting the rescue completely, and naming afterward that {{child_pronoun_subj}} ran the whole thing — wins and misses alike.`,
    },

    moveOutroShared: `What makes this work is not the decision itself — it's the release of the wheel. A Captain's drive runs on genuine authority, and authority you keep a hand on isn't genuine. That's why "it's your call" followed by correction is worse than a plain instruction: it promises the engine's fuel and then withholds it. The whole move turns on actually letting go — real ownership, including the freedom to run it {{child_pronoun_poss}} own, worse way, and to own the outcome. Half a handover is no handover, and a Captain always knows the difference.`,

    whatWorkingLooksLike: `A good week does not look like {{child_name}} happily executing your plans — that's the opposite of what switches {{child_pronoun_obj}} on. It looks like real drive and focus appearing when {{child_pronoun_subj}}'s genuinely in charge of something, even when {{child_pronoun_poss}} way is messier than yours would've been. A "bad" week usually means the handover wasn't real — it was supervised autonomy, a choice within limits you set, or a call you quietly took back the moment it wobbled. If it's not landing, check that honestly first: was it ever truly {{child_pronoun_poss}} to run, or was it "your call, within the lines I drew"?`,

    thingToHoldOnto: `The thing to hold onto is that {{child_name}}'s need to be in charge is not a power struggle to be won or a bossiness to be curbed. It's the early form of genuine leadership — the drive to own a thing fully, to run it, to be accountable for how it turns out. The work of these weeks is not to make {{child_pronoun_obj}} a better follower. It's to give {{child_pronoun_poss}} need for real ownership more and more legitimate places to go — so the same trait that turns a homework night into a standoff becomes the thing that lets {{child_pronoun_obj}} lead, build, and carry real responsibility. Next week, we take this same principle further.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Does {{child_name}} have more energy when {{child_pronoun_subj}} gets to be the boss of something versus being told what to do? Just watch.",
        "10-11": "No move yet. Notice today: when a task is handed to {{child_name}} as an assignment versus something {{child_pronoun_subj}} decided to run — does the energy actually look different? Just observe.",
        "12-14": "Notice the energy gap between what {{child_name}} is assigned versus what {{child_pronoun_subj}} genuinely owns. Just observe.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Hand over one real call.",
      content: {
        "8-9":   "Pick a task that's usually yours to run. Let {{child_name}} make one real choice about how it goes. Then step back.",
        "10-11": "Pick one task today that's usually yours to direct. Hand {{child_name}} the actual decision — not \"which order,\" the real call: how it gets done. Step back once you've handed it over.",
        "12-14": "Give {{child_name}} a decision that's actually {{child_pronoun_poss}} to make — not \"choose from my three options,\" a real call with real consequences. Then genuinely step back.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Hand over another real call today. Notice if you're tempted to \"helpfully\" adjust it once it's underway — don't.",
          mixed:      "Same move — check whether the handover was real, or whether you kept a hand on the wheel without meaning to.",
          didnt_land: "The call probably wasn't fully {{child_pronoun_poss}}. Try again, and this time don't preview what you'd have done.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Hand over one more choice, same as yesterday. This time, notice if you reach in to adjust it once it's underway — and hold back.",
        "10-11": "Hand over another real call. This time, notice the moment you want to guide it once it's running — and hold that back.",
        "12-14": "Hand over another real call. Resist the urge to rescue — even if {{child_pronoun_subj}} is heading toward a mistake. A teen spots supervised autonomy instantly.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Before going again, check whether the handover was fully real — sometimes a small \"helpful\" adjustment is all that broke it.",
        },
      },
    },
    {
      day: 4,
      title: "Let {{child_name}} lead something bigger.",
      content: {
        "8-9":   "Give {{child_name}} a task {{child_pronoun_subj}} can run start to finish, even if it comes out a bit wobbly.",
        "10-11": "Today, hand over a call with real stakes attached — something that can actually go wrong. Let {{child_pronoun_obj}} run it, even if the outcome is worse than what you'd have chosen.",
        "12-14": "Give {{child_name}} real stakes and the authority to run it {{child_pronoun_poss}} way — including the freedom to get it wrong and own that too.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today, make sure they know why. Name it specifically.",
          mixed:      "It's been mixed or slow. Still name it — recognition of even a small moment of ownership is what tips a mixed week toward a better second week.",
          didnt_land: "It's been mixed or slow. Still name it — recognition of even a small moment of ownership is what tips a mixed week toward a better second week.",
        },
      },
    },
    {
      day: 5,
      title: "Name what {{child_name}} ran.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"That was your call, all of it. You ran that.\"*",
        "10-11": "After today, say one specific thing: *\"That was your call, start to finish. You ran that.\"* Not praise for the outcome — recognition that the ownership was real and it was {{child_pronoun_poss}}.",
        "12-14": "Tell {{child_name}}: *\"You ran that entirely yourself — the wins and the parts that went sideways. That's what actually running something looks like.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Being the boss switches it on. You've found the lever.{{/if}}{{#if week_trend == "mixed"}}Letting go is hard. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was it really {{child_pronoun_poss}} to run, or still within limits you set?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the real lever — ownership, not just tasks. That's what actually switches the drive on.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. Real handover is harder than it sounds — the instinct to guide is strong.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking honestly — was it ever fully {{child_pronoun_poss}} call, or did "{{child_pronoun_poss}} decision" quietly stay "{{child_pronoun_poss}} decision, within limits I set"?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Real ownership switches the drive on. You've seen it.{{/if}}{{#if week_trend == "mixed"}}Genuine handover is hard. Normal for week one — and a teen will test whether the autonomy is real before they trust it.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was it ever truly {{child_pronoun_poss}} call? A teen spots supervised autonomy immediately and will resist it on principle.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
