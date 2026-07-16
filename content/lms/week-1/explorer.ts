import type { LmsWeekContent } from "@/content/types";

// Sources: lms-week1-remaining-six.md (10-11 band), lms-week1-band-8-9.md, lms-week1-band-12-14.md
// Weekly reading content not yet provided — those fields stay TODO.
// Day 3 card content: derived from title + mechanism (markdown provides only fork bullets for Day 3).
// Day 3→4 and Day 4→5 fork texts: structural arc, shared across archetypes per authoring notes.
export const weekContent: LmsWeekContent = {
  archetype: "explorer",
  week: 1,

  weeklyReading: {
    introShared: `There is a moment you have almost certainly lived through this week. {{child_name}} sits down to do one specific thing — and twenty minutes later is three topics away, deep in something that has nothing to do with what {{child_pronoun_subj}} sat down for. And here is the part that makes it maddening: {{child_pronoun_subj}} can tell you *exactly* how {{child_pronoun_subj}} got there. One thing led to another led to another, and every link in that chain made sense.

Most advice would call this a focus problem. Distractibility. A failure to stay on task. And so the instinct is to clamp down — remove the tangents, narrow the field, keep {{child_pronoun_obj}} on the single track you laid out.

That instinct is the exact thing that isn't working. Because {{child_name}}'s wandering is not the absence of thinking. It *is* the thinking. The Explorer mind moves by connection — it reaches an idea and immediately sees what it touches, what it resembles, where it could go. That's not a bug in how {{child_pronoun_subj}} pays attention. It's the engine. The problem was never that {{child_pronoun_subj}} wanders. The problem is that the wandering has nowhere to go, so it goes *everywhere* — and the assigned task gets left behind in the process.

This week does one thing, and one thing only: it stops trying to cage the wandering, and instead gives it a channel. A place for the tangents to land so they aren't lost, and so they don't hijack the task. Not "stop having ideas." Never that. Instead: "have the idea, put it somewhere safe, and come back to what you were doing — knowing the idea is waiting for you."

The difference between a cage and a channel is everything. A cage says the wandering is the enemy. A channel says the wandering is valuable — it just needs banks to run between, the way a river has power precisely because it isn't a flood. When {{child_name}} learns that {{child_pronoun_poss}} tangents have a home, two things happen at once: the task stops getting abandoned, and the ideas stop getting lost. You are not choosing between focus and curiosity. You are building the thing that lets {{child_pronoun_obj}} have both.

That is the whole move this week. Small in practice — a pad, a "come back to it" — and large in what it teaches: that {{child_pronoun_poss}} mind is not too much. It just needs somewhere to point.`,

    moveCalibration: {
      "8-9": `For a younger Explorer, keep the channel physical and simple. A literal "come back to it" pad next to the work does the job — when {{child_name}} blurts a new idea, you say "great one, put it on the pad," and {{child_pronoun_subj}} draws or scribbles it and returns. The magic is small and concrete: **the idea is safe, so {{child_pronoun_subj}} can let it go for now.** Examples of what this looks like at this age: a sticky-note "idea parking lot" on the wall; a special notebook that's *only* for the tangents; or just you writing it down while {{child_pronoun_subj}} keeps working. Keep it light and a little fun — this is a treasure box for ideas, not a filing system.`,
      "10-11": `At this age, {{child_name}} can start to own the channel. Introduce it as a tool that's {{child_pronoun_poss}}: "When something pulls you off, put it here so you don't lose it — we'll come back." Then actually come back to one, so it's real and not a trick. The middle-band Explorer benefits from seeing the *return* happen — that's what proves the parking lot is a promise, not a way of making ideas disappear. Examples: a dedicated "ideas" page {{child_pronoun_subj}} keeps; a two-column setup (task / tangents) on the same sheet; or a five-minute "chase one" reward at the end where {{child_pronoun_subj}} gets to pursue one parked idea fully.`,
      "12-14": `With a teen, don't impose the system — build it together. Ask directly: "When ideas pull you off track, where could they go so you don't lose them but don't have to chase them right now?" Let {{child_pronoun_obj}} design the capture method. A 12–14 Explorer will use a system {{child_pronoun_subj}} built far more reliably than one you handed down, and at this age the meta-skill — noticing your own mind wander and *choosing* to park it — is the real prize. Examples: a notes app {{child_pronoun_subj}} already uses; a running "rabbit holes" list {{child_pronoun_subj}} revisits on {{child_pronoun_poss}} own; or a genuine agreement that some tasks *are* the exploring, and get treated differently.`,
    },

    moveOutroShared: `What makes this work is not the pad or the list itself — it's what the channel does to the wandering. A tangent with nowhere to go feels like an escape from the task. A tangent with a home feels like a note to your future self. The same mental move — "oh, this connects to that" — stops being the thing that derails the work and becomes the thing that enriches it. You haven't suppressed anything. You've just given the river banks.`,

    whatWorkingLooksLike: `You are not going to turn {{child_name}} into a stay-on-one-line child this week, and you shouldn't want to. A good week looks like this: the tangents still happen, but more of them land on the pad instead of taking over, and the original task actually gets finished more often than not. A "bad" week usually means one of two things — either the channel felt like a cage (the ideas got parked *and forgotten*, which {{child_pronoun_subj}} will notice and resent), or it never got used at all. If it's not landing, check that first: is the parking lot real? Do the parked ideas ever get revisited? The channel only works if {{child_name}} trusts that "come back to it" actually means come back.`,

    thingToHoldOnto: `Here is the thing worth holding onto, long after this week: {{child_name}}'s mind connects things that other people keep in separate boxes. That is not a phase to grow out of, and it is not a deficit to manage. It is, genuinely, how some of the most original thinking gets done. The work of these weeks is not to make {{child_pronoun_obj}} think like everyone else. It's to help {{child_pronoun_obj}} point a rare kind of mind — so the gift stops costing {{child_pronoun_obj}} the things {{child_pronoun_subj}} also needs to do. Next week, we take this same principle and aim it at the place the wandering costs the most.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9":   "When {{child_name}} jumps to a new idea mid-task, notice: is it kind of related, or totally away? Just watch.",
        "10-11": "No move yet. Today, when {{child_name}} drifts off a task onto a tangent, notice one thing: is the tangent actually *related* to the work, or completely away from it? Don't redirect. Just see which it is.",
        "12-14": "Notice whether {{child_name}}'s tangents are actually connected thinking or true drift. Just observe — {{child_pronoun_subj}} may not see the difference yet either.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Give the tangent a place to go.",
      content: {
        "8-9":   "Pick one task. Tell {{child_name}}: *\"If you think of something else, put it on this pad — we'll come back.\"*",
        "10-11": "Pick one task today. Tell {{child_name}} up front: *\"If this sparks something else, write it on this pad — we'll come back to it.\"* Give the wandering a destination instead of a dead end.",
        "12-14": "Instead of a parent-imposed pad, ask: *\"When ideas pull you off track, where could they go so you don't lose them but don't chase them right now?\"* Let {{child_pronoun_obj}} design it.",
      },
      reflection: {
        prompt: "How did it go?",
        nextDayOpening: {
          worked:     "Do it again. Today, actually *come back* to one thing on the pad afterward — that's what makes the parking lot real instead of a trick.",
          mixed:      "Same move — check whether the tangents were getting parked, or whether \"write it down\" quietly became \"stop having ideas.\"",
          didnt_land: "The channel probably felt like a cage. Try again, and this time let {{child_pronoun_obj}} chase *one* tangent fully before parking the rest.",
        },
      },
    },
    {
      day: 3,
      title: "Same move, and catch yourself.",
      content: {
        "8-9":   "Use the pad again. This time, if {{child_name}} wants to chase an idea instead of parking it — let {{child_pronoun_obj}} chase one first, then park the rest.",
        "10-11": "Offer the tangent-pad again. Today, notice the urge to redirect {{child_pronoun_obj}} when a tangent comes up — and try parking it instead.",
        "12-14": "Use whatever capture system {{child_name}} chose. Today, notice the urge to stop a tangent rather than park it — and choose parking. Today, actually revisit one captured idea together.",
      },
      reflection: {
        prompt: "How did today go?",
        nextDayOpening: {
          worked:     "Two good days in a row — keep doing exactly what worked. Don't add anything new on top of something that's working.",
          mixed:      "Still finding the shape of it. That's normal by day 3. Today asks something a bit harder — stick with it.",
          didnt_land: "Two rough days. Check whether ideas were getting a real place to go, or whether \"park it\" quietly meant \"drop it.\"",
        },
      },
    },
    {
      day: 4,
      title: "Point the wandering at the work itself.",
      content: {
        "8-9":   "Pick a task with room to poke around. Try: *\"Find two ways this connects to something you like.\"*",
        "10-11": "Today, pick a task that has room to explore inside it. Instead of \"finish this,\" try \"find three ways this connects to something else.\" Let the exploring *be* the task, not a detour from it.",
        "12-14": "Give {{child_name}} something where connecting across topics *is* the assignment — {{child_pronoun_poss}} natural mode becomes the strength, not the bug.",
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
      title: "Name the connection, not the compliance.",
      content: {
        "8-9":   "Tell {{child_name}}: *\"You found a connection nobody else spotted.\"*",
        "10-11": "After today, say one specific thing: *\"You didn't just finish that — you found a link in it nobody pointed out.\"* Recognition of the connecting, which is {{child_pronoun_poss}} real strength, not just task completion.",
        "12-14": "Tell {{child_name}}: *\"You link things most people keep in separate boxes. That's rare, and it's genuinely valuable — it just needs a place to point.\"*",
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9":
`{{#if week_trend == "mostly_worked"}}A place to go, not a stop sign. That's the whole lever — you found it.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The instinct to just stop the tangent is strong — parking it takes practice.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — did ideas get a real home, or did "park it" quietly mean "drop it"?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "10-11":
`{{#if week_trend == "mostly_worked"}}You've found the lever — a channel, not a cage. The wandering was never the problem; the missing destination was.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The instinct to just stop the tangent is strong — parking it takes practice.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Worth checking — did the tangents get a real place to go, or did "park it" quietly mean "drop it"?{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
      "12-14":
`{{#if week_trend == "mostly_worked"}}A channel {{child_pronoun_subj}} built holds better than one you imposed. You've seen the system work.{{/if}}{{#if week_trend == "mixed"}}Normal for week one. The instinct to stop the tangent rather than redirect it is hard to break.{{/if}}{{#if week_trend == "mostly_didnt_land"}}Was the system really {{child_pronoun_poss}}, or did you impose the structure? At this age, ownership of the system is what makes it work.{{/if}}

You're not looking for a transformed child. You're looking for one small, real shift in one specific moment. That shift — even one instance of it — is the proof the whole system rests on.`,
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
