import type { LmsWeekContent } from "@/content/types";

export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 4,
  weekTitle: "Staying When It's Hard to Watch",

  weeklyReading: {
    introShared: `Presence has been protected across longer stretches. This week is harder: staying present while something is genuinely going wrong in front of you — not stepping back, but also not stepping in.`,

    moveCalibration: {
      "8-9": `Being physically present while {{child_name}} struggles is much harder than being present while things go well. The urge to problem-solve out loud will be strong. This week, presence means staying in the room without directing traffic.`,
      "10-11": `Watch for narrated help — "have you tried..." said while sitting nearby counts as stepping in, even without leaving your seat. Presence this week means being available, not managing the outcome from the sidelines.`,
      "12-14": `At this age, silent presence during a visible struggle can itself feel like pressure if it comes with visible concern on your face. The calibration here is emotional, not verbal — steady, not worried-looking.`,
    },

    moveOutroShared: `This is about staying near a real, safe-to-struggle-through moment — not staying passively present for something that actually needs intervention.`,

    whatWorkingLooksLike: `Your presence during a struggle reads as steady, not anxious. {{child_name}} experiences you as there, not as watching for a moment to intervene.`,

    thingToHoldOnto: `Presence that only shows up when things are easy isn't really presence — it's company for the good parts only.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment where {{child_name}} is visibly struggling with something and you're nearby.",
        "10-11": "Notice the same, and notice your own instinct to help, separate from whether help is actually needed yet.",
        "12-14": "Notice a struggle where {{child_name}} hasn't asked for help and seems to want space, not company.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Stay in the room while they struggle, hands off.",
      content: {
        "8-9": "Stay present but don't offer help unless asked. No narrated suggestions.",
        "10-11": `Watch for help disguised as conversation — "how's it going over there?" said while clearly monitoring counts as stepping in.`,
        "12-14": "Calibrate presence to what {{child_name}} actually seems to want — nearby but genuinely not hovering, which may mean a different room.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: {
        "8-9": `**Worked** — you stayed present without directing. Keep going.\n**Mixed** — you stayed physically present but your face or tone gave away the urge to help. Worth noticing what that communicated anyway.\n**Didn't land** — you stepped in. Notice what about that struggle made staying hands-off feel unbearable.`,
        "10-11": `**Worked** — you stayed present without directing. Keep going.\n**Mixed** — you stayed physically present but your face or tone gave away the urge to help. Worth noticing what that communicated anyway.\n**Didn't land** — you stepped in. Notice what about that struggle made staying hands-off feel unbearable.`,
        "12-14": `**Worked** — you stayed present without directing. Keep going.\n**Mixed** — you stayed physically present but your face or tone gave away the urge to help. Worth noticing what that communicated anyway.\n**Didn't land** — you stepped in. Notice what about that struggle made staying hands-off feel unbearable.`,
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "If they ask for help, ask what they've already tried first.",
      content: {
        "8-9": "Pick a genuinely frustrating, visible struggle and stay in the room the whole time without offering help unless directly asked.",
        "10-11": "Same, but if {{child_name}} does ask for help, ask what {{child_pronoun_subj}} has already tried before offering anything.",
        "12-14": "If {{child_name}} wants space rather than company during this one, honor that too — presence this week might mean staying reachable, not staying in the room.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say you stayed and they worked through it themselves.",
      content: {
        "8-9": `*"That was hard to watch and I stayed. You worked through it."*`,
        "10-11": `*"I stayed close and didn't jump in. You handled that yourself."*`,
        "12-14": `*"I was around if you needed me. You didn't, and that's real."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Was staying present through a real struggle harder or easier than expected?",
      "10-11": "What did your body do that you had to actively override?",
      "12-14": "Did {{child_name}} seem to notice you holding back — and did that change anything for {{child_pronoun_obj}}?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
