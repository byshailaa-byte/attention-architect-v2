import type { LmsWeekContent } from "@/content/types";

const D3 = `**Worked** — {{child_name}}'s leadership held with the sibling without your backing it up. Keep stepping back.\n**Mixed** — {{child_name}} led, but the sibling appealed to you and you answered instead of redirecting back. Notice that pattern.\n**Didn't land** — you stepped in as the real authority. Worth naming what made this one feel like it needed your weight behind it.`;

export const weekContent: LmsWeekContent = {
  archetype: "captain",
  week: 5,
  weekTitle: "Using it beyond homework",

  weeklyReading: {
    introShared: `Leadership has survived a real failure under {{child_name}}'s charge. This week: what happens when the thing being led genuinely affects a sibling — not just {{child_name}}'s own stuff anymore?`,

    moveCalibration: {
      "8-9": `The instinct will be to step in as the real authority the moment a sibling is affected by {{child_name}}'s leadership. Let {{child_pronoun_obj}} lead the sibling directly first.`,
      "10-11": `Watch for undermining {{child_name}}'s authority with the sibling by quietly appealing to your own — "just check with me if you're not sure." Let {{child_pronoun_poss}} authority stand on its own.`,
      "12-14": `At this age, sibling resentment of {{child_name}}'s leadership is a real possibility. Don't referee that resentment away for {{child_pronoun_obj}} — let the two of them work out the real dynamic.`,
    },

    moveOutroShared: `Pick something genuinely shared — a task, a plan, a responsibility that legitimately includes the sibling, not one manufactured to test this.`,

    whatWorkingLooksLike: `{{child_name}}'s leadership holds with a sibling directly, without needing your authority behind it to be real.`,

    thingToHoldOnto: `Leadership that only works when a parent backs it up isn't leadership yet — it's borrowed authority.`,
  },

  days: [
    {
      day: 1,
      title: "Just watch.",
      content: {
        "8-9": "Notice something this week that {{child_name}} leads that genuinely affects a sibling.",
        "10-11": "Same, and notice whether the sibling treats {{child_name}}'s leadership as real or routinely appeals to you instead.",
        "12-14": "Notice a moment where sibling resistance to {{child_name}}'s leadership shows up directly.",
      },
      reflection: null,
    },
    {
      day: 2,
      title: "Let their authority stand without you backing it up.",
      content: {
        "8-9": "Don't offer yourself as a backup authority. Let {{child_name}}'s leadership be the only one in the room for this.",
        "10-11": "If the sibling appeals to you, redirect back to {{child_name}} rather than answering directly.",
        "12-14": "Stay out of the dynamic entirely, even when {{child_name}}'s leadership is visibly being tested.",
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
      title: "When the sibling appeals to you, send them back.",
      content: {
        "8-9": "Pick something {{child_name}} leads that a sibling resists or challenges this week, and stay fully out of it — redirecting any appeals back to {{child_name}}.",
        "10-11": "Same, but pick something with real stakes for the sibling too, so the resistance is genuine, not token.",
        "12-14": "Let the resolution (or lack of one) stand without your input, even if it stays unresolved by day's end.",
      },
      reflection: {
        prompt: "How did today go?",
      },
    },
    {
      day: 5,
      title: "Say they led through real pushback, which is harder.",
      content: {
        "8-9": `*"You led that with your sibling, not just for yourself. That's a bigger kind of leadership."*`,
        "10-11": `*"Your sibling pushed back on that, and you held your ground without needing me. That's real."*`,
        "12-14": `*"You led through actual resistance there. That's harder than leading when everyone agrees."*`,
      },
      reflection: {
        prompt: "How did today go? (Last tap of the week — feeds the weekend review)",
      },
    },
  ],

  weekendReview: {
    content: {
      "8-9": "Did the sibling dynamic around {{child_name}}'s leadership shift at all this week?",
      "10-11": "How often did the sibling appeal to you instead of {{child_name}} — did that change by week's end?",
      "12-14": "Did {{child_name}}'s authority with the sibling feel more settled by the end of the week?",
    },
    noteReflectionIntro: "Here's what you noted each day this week:",
  },
};
