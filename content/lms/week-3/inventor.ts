import type { LmsWeekContent } from "@/content/types";

// Week 3 — 12–14 band only. 8–9 and 10–11 not yet authored.
export const weekContent: LmsWeekContent = {
  archetype: "inventor",
  week: 3,
  weekTitle: "Method-Ownership, Bigger Project",

  weeklyReading: {
    introShared: `Week 1 tested whether your child's own way of doing things — not your way, not the "correct" way — actually works when they're given real room to use it, on one task. Week 2 asked whether that same ownership of method could survive around screens. This week hands over something bigger: a whole project, spanning more than one sitting, with the entire approach — not just one step of it — theirs to decide.

What matters here: an Inventor doesn't disengage because a task is hard. They disengage when their own method gets overridden — when the "right way" gets imposed instead of discovered. Weeks 1 and 2 proved that giving real ownership over a single task or moment changes how they show up for it. This week asks something harder: does that ownership hold across something that unfolds over days, with real decision points along the way where it would be easy for you to quietly step back in?

This week's move: hand over an entire project — something with real stages or steps to it — and let your child own the whole approach, start to finish. Not just the first step. All of it, including the parts that might look inefficient to you as they unfold.

Somewhere in the project, their chosen method will likely hit a real wall — something that doesn't work the way they planned. That moment is not a sign to step in and correct course. It's the actual test of whether the ownership was real, or whether it was only ever available as long as their approach happened to be working.`,

    moveCalibration: {
      "8-9": "",
      "10-11": "",
      "12-14": `The instinct to correct will be strongest exactly where a stage looks inefficient or "wrong" to you — which is often precisely where real learning happens if you don't intervene. Try to notice the difference between a stage that's genuinely stuck (worth a check-in) and a stage that's just being done differently than you'd do it (not a problem to fix). Most of what will feel like "helping" this week is actually the second kind.`,
    },

    moveOutroShared: `That's the work this week — not managing whether the method looks efficient, but staying out of the way long enough to find out whether ownership of the whole approach actually holds across something longer than a single task.`,

    whatWorkingLooksLike: `You may notice your child adjusting their own approach mid-project when something isn't working, without needing you to suggest the fix — genuinely problem-solving within their own method, not abandoning it the moment it gets hard. A stage that looks inefficient but that they push through on their own terms is often a stronger sign of real ownership than a stage that goes smoothly, since smooth stages don't actually test whether the method is theirs. Not every stage will hold equally — that's expected, and worth noting rather than smoothing over.`,

    thingToHoldOnto: `A method that only survives when it's working isn't really theirs yet. This week is designed to find the stage where it gets hard — not to prove the approach is flawless, but to find out how much of it genuinely belongs to your child when things stop going their way.`,
  },

  days: [
    {
      day: 1,
      title: "Just notice.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Notice how {{child_name}} handles ownership over a bigger, multi-stage project versus a single task.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Hand over the whole project.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `Tell {{child_name}} clearly: *"This is yours from start to finish — however you want to approach it, all the way through."*`,
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Check in on it.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "**Worked** — let it keep evolving under {{child_pronoun_poss}} method, even if a stage looks inefficient to you. **Mixed** — talk about which stages held ownership and which quietly got corrected. **Didn't land** — narrow to two connected stages and rebuild from there.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Let the method hit a real wall.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": "Somewhere the chosen approach won't work. Let {{child_name}} hit that and find the next move without your fix.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Name it directly.",
      content: {
        "8-9": "",
        "10-11": "",
        "12-14": `*"You carried your own method through the whole project, not just the easy stages. That's real ownership."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "",
      "10-11": "",
      "12-14": "Ask {{child_name}} directly what {{child_pronoun_subj}} learned about {{child_pronoun_poss}} own approach this week.",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
