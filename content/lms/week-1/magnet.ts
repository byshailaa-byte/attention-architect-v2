import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-remaining-six.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc, shared across archetypes per authoring notes.
export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 1,
  weekTitle: "Steady Presence",

  weeklyReading: {
    introShared: `Watch {{child_name}} do homework alone, and watch {{child_pronoun_obj}} do it with someone at the same table, and you may notice something that doesn't quite add up. Same child, same task, same ability — but the focus holds so much longer when there's another person in the room. It's easy to read this the wrong way. It can look like {{child_pronoun_subj}} won't work unless {{child_pronoun_subj}}'s supervised. Like {{child_pronoun_subj}} needs to be watched. Like {{child_pronoun_subj}}'s not motivated on {{child_pronoun_poss}} own.

None of that is what's happening. For the Magnet, presence is not supervision — it's a resource. Attention, for this child, is partly built out of connection. Another person nearby isn't a monitor; it's a kind of anchor that steadies the focus. When {{child_name}} is alone, {{child_pronoun_subj}} isn't unwilling. {{child_pronoun_subj|cap}} is under-resourced — trying to hold attention without the one thing that most helps {{child_pronoun_obj}} hold it.

This is why "just go do your homework in your room" so often fails for this child, and why it fails in a way that looks like defiance but isn't. You've sent {{child_pronoun_obj}} to do a hard thing after removing the support that makes it possible. And then the slow work of the evening becomes a battle, and everyone concludes {{child_pronoun_subj}} lacks discipline — when what {{child_pronoun_subj}} actually lacked was company.

This week does one thing: it stops treating alone-focus as the default and company-focus as the crutch, and flips it. It gives {{child_name}} presence — deliberately, without pressure — and then, slowly, widens the gap. Not so {{child_pronoun_subj}} depends on you forever. The opposite. Alone-focus, for a Magnet, grows *out of* with-company focus. You build the muscle by starting with the support, then thinning it — the way you'd teach anyone anything hard: alongside them first, then a step back, then another.

The trap this week is a subtle one, and it's worth naming now: presence has to stay *presence*. The moment "sitting nearby" tips into "checking on you," the resource becomes pressure, and pressure is the thing that shuts a Magnet down. Your job this week is almost strange in its passivity — to be there, genuinely, doing your own thing, offering nothing but company. That is the move. It sounds like too little. For this child, it is very nearly everything.`,

    moveCalibration: {
      "8-9": `For a younger Magnet, presence should be warm, close, and completely unbothered. Sit at the same table with your own book or your own work — not helping, not checking, just there. At this age {{child_name}} may want to show you things ("look!") and that's fine; the anchor is the point, not silence. The key is that your being there has *no strings* — you're not there to make {{child_pronoun_obj}} work, you just happen to be there while {{child_pronoun_subj}} does. Examples: reading your own thing beside {{child_pronoun_obj}}; doing your own paperwork at the same table; or sitting close enough that {{child_pronoun_subj}} can feel you there without you saying a word.`,
      "10-11": `At this age, be present but start protecting the line between company and oversight. Sit nearby with your own genuine task — the more real your own focus, the better, because {{child_name}} borrows the steadiness of a room where people are quietly working. Then begin, gently, to widen the gap: present at the start, a brief step away in the middle, back again. The middle-band Magnet is ready to carry a little more solo, and the point is to stretch that "little more" without ever making {{child_pronoun_obj}} feel abandoned. Examples: working alongside then stepping to the kitchen for five minutes; "I'll be right back" as a normal rhythm, not a test; a shared work-session that you're both genuinely in.`,
      "12-14": `With a teen Magnet, presence has to read as *co-working*, never supervision — a 12–14 will bristle at anything that feels like being watched. The best version is genuinely parallel: you both at the table, both on your own real things, peers in focus rather than parent-and-supervised-child. Then widen the independence deliberately, because at this age growing solo capacity is exactly the right direction, and {{child_name}} will feel respected by it. Examples: both working at the table on your own laptops; a "study alongside" hour that's mutual; leaving for a real stretch and trusting {{child_pronoun_obj}} to carry it, then noting out loud that {{child_pronoun_subj}} did.`,
    },

    moveOutroShared: `What makes this work is not the supervision — it's the opposite of supervision. The presence that helps a Magnet is presence with nothing asked of it. When you sit nearby genuinely doing your own thing, you're not monitoring the focus; you're *lending* it something. And that's why the same move, done as a check-in ("how's it going, are you working?"), does the reverse. Company steadies. Surveillance shuts down. The whole art of the week is staying firmly on the right side of that line.`,

    whatWorkingLooksLike: `A good week does not look like {{child_name}} suddenly working happily alone in {{child_pronoun_poss}} room. It looks like the focus holding longer when you're nearby, and — by week's end — {{child_pronoun_subj}} carrying it a little further during the stretches you step away. A "bad" week most often means presence slid into pressure: you were there, but you were watching, correcting, or checking, and the resource became a weight. If it's not landing, check that honestly first — were you genuinely doing your own thing, or were you there *at* {{child_pronoun_obj}}? The fix is almost always to soften your own attention, not sharpen it.`,

    thingToHoldOnto: `The thing to hold onto is this: needing connection to focus is not a weakness {{child_name}} has to outgrow. Plenty of capable adults work best alongside others, in shared spaces, with the quiet company of people doing their own hard things nearby. What this week teaches isn't "learn to need no one." It's that {{child_pronoun_poss}} focus has a source — connection — and that source can be offered deliberately, and slowly stretched, so {{child_pronoun_subj}} can reach further on {{child_pronoun_poss}} own without ever being cut off. Next week, we take this same principle into a harder room.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "Does {{child_name}} stay focused longer when someone's near versus all alone? Just notice.",
        "10-11": "No move yet. Today, notice the difference: when {{child_name}} works with someone nearby versus completely alone, does the focus actually hold longer with company? Just observe — don't sit down yet.",
        "12-14": "Notice whether {{child_name}} focuses better with someone around — and whether \"around\" currently reads to {{child_pronoun_obj}} as company or as monitoring.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Be present without taking over.",
      content: {
        "8-9":   "Pick one task. Sit near {{child_name}} — reading your own book, not helping, not checking. Just there.",
        "10-11": "Pick one task today. Sit nearby — reading your own thing, doing your own work — present but not managing. Not helping, not checking. Just there.",
        "12-14": "Work alongside {{child_name}} on your own real thing — same table, both busy. Peer energy, not oversight.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again today. The skill is being present *without* drifting into managing — notice if you started correcting.",
          mixed:      "Same move — check whether \"nearby\" quietly became \"supervising.\"",
          didnt_land: "Presence may have tipped into pressure. Try again, further away — same room, but genuinely doing your own thing.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Sit close again, doing your own thing. This time, notice if you start checking on how {{child_name}} is doing — and pull back.",
        "10-11": "Sit nearby again, same as yesterday. Today: notice if being \"present\" starts tipping into \"supervising\" — and pull back to just being there.",
        "12-14": "Same co-working presence as yesterday. Today, notice if you start checking on {{child_pronoun_obj}} — and return to your own work without comment.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Was your presence calm and low-key, or did being there quietly turn into overseeing?",
        },
      },
    },
    {
      day: 4,
      title: "Widen the gap slightly.",
      content: {
        "8-9":   "Be there at the start, step out for the middle, come back. See how far {{child_pronoun_subj}} carries it alone.",
        "10-11": "Today, be present at the start, then step out for the middle stretch and come back. The goal isn't to always be there — it's for {{child_name}} to carry the focus a little further each time between check-ins.",
        "12-14": "Be there to start, then leave for a real stretch. The goal is {{child_pronoun_subj}} carrying focus solo further each time — normal developmental direction for this age.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "It's been working. Today, make sure they know why. Name it specifically.",
          mixed:      "It's been mixed or slow. Still name it — recognition of even a small stretch of solo focus is what tips a mixed week toward a better second week.",
          didnt_land: "It's been mixed or slow. Still name it — recognition of even a small stretch of solo focus is what tips a mixed week toward a better second week.",
        },
      },
    },
    {
      day: 5,
      title: "Name what {{child_pronoun_subj}} carried alone.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"I stepped out and you kept going all by yourself.\"*",
        "10-11": "After today, say one specific thing: *\"I stepped out for a while there and you kept going. That was all you.\"* Recognition of the stretch {{child_pronoun_subj}} held without company.",
        "12-14": "Tell {{child_name}}: *\"You carried that a long way on your own today. You're needing me around less, and that's exactly right.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}Being near is a help, not a crutch. You've found the lever.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The line between present and watching-over is genuinely subtle.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was it calm-near or watching-near? There's a real difference in how {{child_pronoun_subj}} reads it.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the lever — presence is a resource, not a crutch. The alone-focus grows *from* the with-company focus, not instead of it.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The line between present and managing is genuinely subtle.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — was your presence steady and low-pressure, or did being there turn into overseeing?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}Co-working presence, not supervision. That's the distinction — and you've found it.{{/if}}{{#if week_trend == "mixed"}}The line between company and monitoring is subtle. Normal for week one.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Did it feel like company or like being watched? That's the whole distinction for a Magnet at this age.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
