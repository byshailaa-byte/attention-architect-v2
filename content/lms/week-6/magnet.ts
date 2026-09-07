import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — you read the ask correctly and matched it. Keep doing that.\n**Mixed** — you gave company but in your own preferred form, not quite what was asked for. Notice the gap.\n**Didn't land** — you missed the signal. Worth naming that honestly and asking {{child_name}} directly next time, rather than guessing.`;

export const weekContent: LmsWeekContent = {
  archetype: "magnet",
  week: 6,
  weekTitle: "Running it themselves",

  weeklyReading: {
    introShared: `Five weeks built presence — one-on-one, through struggle, across a group. This week is about noticing when {{child_name}} starts initiating connection {{child_pronoun_poss}} own way, asking for company on {{child_pronoun_poss}} own terms rather than waiting for you to offer it.`,

    moveCalibration: {
      "8-9": `Watch for {{child_name}} asking for your company directly — "will you sit with me?" — rather than you offering first. Let that ask be enough; don't over-respond to it as a big moment.`,
      "10-11": `Notice if {{child_name}} starts specifying what {{child_pronoun_subj}} actually needs ("just sit there, you don't have to talk") rather than accepting whatever version of company you offer. Follow {{child_pronoun_poss}} lead exactly.`,
      "12-14": `At this age, the ask may be indirect — hovering near you, staying in the room a bit longer than usual. Read that as an ask, even without words.`,
    },

    moveOutroShared: `This week is about following {{child_name}}'s lead on what presence looks like, rather than defaulting to your own instinct for it.`,

    whatWorkingLooksLike: `{{child_name}} initiates connection on {{child_pronoun_poss}} own terms, and you read and match those terms rather than defaulting to your own instinct for presence.`,

    thingToHoldOnto: `Presence that's still entirely on your terms hasn't finished becoming {{child_name}}'s to direct.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice a moment this week where {{child_name}} asks for your company directly, rather than you offering first.",
        "10-11": "Same, and notice if {{child_name}} specifies what {{child_pronoun_subj}} actually wants (\"just sit there\").",
        "12-14": "Notice an indirect ask — hovering nearby, staying in the room a bit longer than usual.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Notice when they ask for company instead of you offering.",
      content: {
        "8-9": "Give exactly the kind of presence {{child_name}} asked for — not more, not a different version you'd prefer to give.",
        "10-11": "Follow the specific instructions exactly, even if it feels like less than you'd naturally offer.",
        "12-14": "Read the indirect ask and respond by simply staying nearby — no direct acknowledgment needed unless {{child_pronoun_subj}} initiates it.",
      },
      reflection: {
        prompt: "How did it go?",
      },
    },
    {
      day: 3,
      title: "Do it again.",
      content: { "8-9": D3, "10-11": D3, "12-14": D3 },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 4,
      title: "Give exactly what they asked for — no more, no different.",
      content: {
        "8-9": "Catch a genuine, direct ask for connection, and give precisely that — nothing added, nothing withheld.",
        "10-11": "Catch a specific instruction about what kind of company is wanted, and follow it exactly, even if it surprises you.",
        "12-14": "Catch an indirect ask and respond by simply being present, without naming what you noticed.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say it once: they told you what they needed, and you heard it.",
      content: {
        "8-9": `*"You let me know what you needed, and I heard it. That's a real way to ask for what you want."*`,
        "10-11": `*"You told me exactly what you needed, and I could actually give you that. That's a good way to ask."*`,
        "12-14": `*"I noticed you wanted me around, even without saying it. I'm glad I caught that."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did {{child_name}}'s asks for connection get more direct by week's end?",
      "10-11": "Did the specific instructions get clearer or more frequent?",
      "12-14": "Did you get better at reading the indirect signals by week's end?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
