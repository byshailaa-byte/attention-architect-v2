// Authored static content for the Attention Advantage report.
// Source: new-report-authored-content.md — paste literally, do not regenerate.
//
// drawsIn / pullsAway / friction / recharge / instinctLine: pending language pass.
// Currently sourced from the existing dimension desc strings (label-style).
// Replace these map values when the language-passed sentences arrive.

export const PATTERN_LINE: Record<string, string> = {
  "The Storm":
    "When it’s their idea, they’ll stay with it for an hour. The moment you hand it to them, that same energy turns into a no.",
  "The All-In Kid":
    "They can lose themselves in one thing completely. What costs them isn’t the work — it’s being pulled out of it halfway.",
  "The Inventor":
    "They’ll do it, but their own way, even when that takes longer. Being shown the “right” way too early usually stops them trying.",
  "The Explorer":
    "One question takes them somewhere else, and they can tell you exactly how they got there. Ideas come faster than the page can hold them.",
  "The Magnet":
    "With someone nearby they can work for a long time. Alone in a room with the same worksheet, it quietly falls apart.",
  "The Glue":
    "They read the mood of a room before anything else. If something feels off between people, that comes first, every time.",
  "The Captain":
    "Give them something to run and they’ll push hard. Ask them to follow someone else’s plan and the drive quietly goes.",
  "The Live Wire":
    "When something is really at stake they’re fully switched on. Without that, a task doesn’t bore them — it barely registers.",
};

export const MEANING: Record<string, string[]> = {
  "The Storm": [
    "Most evenings the argument is about whose idea it was, not the homework.",
    "When they choose where to start, they usually get going without being asked twice.",
    "Handed the whole thing already decided, the same child stops.",
  ],
  "The All-In Kid": [
    "Once they’re in, they’re really in — you may have to say their name twice at dinner.",
    "The hard part is the edges: starting, stopping, and being interrupted halfway.",
    "Shorter tasks don’t usually help. Fewer interruptions do.",
  ],
  "The Inventor": [
    "They take the long way round, get it wrong, then build something better than the instructions.",
    "Telling them the right way early — even kindly — often ends the whole attempt.",
    "The wrong turns aren’t wasted time. That’s how they work out if it’s really theirs.",
  ],
  "The Explorer": [
    "They start the reading and end up somewhere else, usually with something interesting to show for it.",
    "The side-trip isn’t them losing focus. It’s the same curiosity with nowhere to put it.",
    "Give the ideas somewhere to go and the original work usually survives.",
  ],
  "The Magnet": [
    "The same worksheet goes very differently at the kitchen table and alone upstairs.",
    "It isn’t the work that changed. It’s the room.",
    "Someone being there is doing real work. Taking that away doesn’t make the task easier.",
  ],
  "The Glue": [
    "Some evenings the pencil doesn’t move and there’s nothing wrong with the homework.",
    "If something feels off between people, they notice that first and everything else waits.",
    "Sort it out in one sentence and the page sometimes finishes itself.",
  ],
  "The Captain": [
    "Give them something to be in charge of and it gets done, often faster than you expected.",
    "Hand them the same thing as an instruction and it slows right down.",
    "They’re not saying no to the work. They’re saying no to being told.",
  ],
  "The Live Wire": [
    "A task with no clock and nothing riding on it barely registers as happening.",
    "Add a timer, or something real on the line, and you get everything they have.",
    "It isn’t about effort. It’s whether the task is asking anything of them.",
  ],
};

export const FRICTION_POINTS: Record<string, string[]> = {
  "The Storm":      ["Anything that arrives already decided, before they’ve had a say"],
  "The All-In Kid": ["Being interrupted halfway through something they’re deep in"],
  "The Inventor":   ["Being shown the right way before they’ve tried their own"],
  "The Explorer":   ["Work with no room for the thing that just occurred to them"],
  "The Magnet":     ["Working alone in a room, on almost anything"],
  "The Glue":       ["Being asked to concentrate while something feels unsettled at home"],
  "The Captain":    ["Following a plan they had no part in making"],
  "The Live Wire":  ["Repeating work with no clock and nothing on the line"],
};

export const TONIGHT_SAY: Record<string, string> = {
  "The Storm":      "“Your call — which one first?”",
  "The All-In Kid": "“Take as long as you need. I won’t interrupt.”",
  "The Inventor":   "“Do it your way. Show me when you’re done.”",
  "The Explorer":   "“Write it down, then come back to it.”",
  "The Magnet":     "“I’ll be right here. You start.”",
  "The Glue":       "“Everything’s fine between us. Whenever you’re ready.”",
  "The Captain":    "“This one’s yours. Tell me what you need.”",
  "The Live Wire":  "“Ten minutes on the clock — see how far you get.”",
};

export const TONIGHT_WATCH: Record<string, string> = {
  "The Storm":      "Whether they start without being asked twice, once the choice was theirs.",
  "The All-In Kid": "How long they stay with it when nobody interrupts.",
  "The Inventor":   "Whether they keep going after the first try doesn’t work.",
  "The Explorer":   "Whether writing it down lets them come back to the work.",
  "The Magnet":     "Whether they settle with you nearby but not helping.",
  "The Glue":       "Whether the work moves once things feel settled again.",
  "The Captain":    "Whether they make the calls themselves once it’s theirs.",
  "The Live Wire":  "Whether the clock changes how they start.",
};

// Pending language pass — currently the PARENT_INSTINCT_DESC values with periods.
// Replace when rewritten sentences arrive.
export const INSTINCT_LINE: Record<string, string> = {
  "The Quick Fixer":  "When something isn’t working, you move fast to find another way through.",
  "The Pusher":       "When they hesitate, your instinct is to lean in and keep them with it.",
  "The Negotiator":   "When resistance builds, you look for a deal that keeps the evening moving.",
  "The Steady Hand":  "You hold the space and wait — steady, without pressure.",
};

export const NOW_LINES: string[] = [
  "You ask two or three times before anything starts.",
  "You stay in the room, because leaving means it stops.",
  "It ends with both of you a bit frustrated.",
];

export const THEN_LINES: string[] = [
  "They begin without you asking twice, more often than not.",
  "You can leave the room and the work carries on.",
  "The evening ends without either of you having to recover from it.",
];

// Real consented testimonials. Source: app/simplified/page.tsx TESTIMONIALS array.
// Never generate or paraphrase. Rotate by session.
export const TESTIMONIAL_POOL: { quote: string; who: string; detail: string }[] = [
  {
    quote:  "It was the ten-second pause that did it. I stopped rescuing him the second he stalled, and within a fortnight he was finishing questions I would have jumped into.",
    who:    "Meghna R.",
    detail: "Mother of a 9-year-old, Pune",
  },
  {
    quote:  "I had been calling it laziness for two years. Reading the profile was uncomfortable — it described me as much as her. That is what made it useful.",
    who:    "Arun S.",
    detail: "Father of an 11-year-old, Bengaluru",
  },
  {
    quote:  "Nothing about our evening got longer. One sentence changed, that is all. He now starts on his own about four nights out of five.",
    who:    "Priya N.",
    detail: "Mother of an 8-year-old, Delhi",
  },
  {
    quote:  "We had done the tutoring, the charts, the rewards. This is the first thing that explained why none of it stuck.",
    who:    "Fatima K.",
    detail: "Mother of a 12-year-old, Hyderabad",
  },
  {
    quote:  "The plan told me what to stop doing, which no one had ever done. Week three was the one that mattered for us.",
    who:    "Rahul & Divya",
    detail: "Parents of a 10-year-old, Mumbai",
  },
  {
    quote:  "We believed our son just needed more discipline. This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
    who:    "Sandeel Shukla",
    detail: "Parent of a 14-year-old Son · Raipur",
  },
  {
    quote:  "We thought our son was just being lazy or spending too much time on screens. This helped us understand what was really happening. Homework became much calmer, and so did our evenings.",
    who:    "Manya Gangele",
    detail: "Parent of an 11-year-old Son · Indore",
  },
  {
    quote:  "I was constantly reminding my daughter to stay on task. Small changes in how we approached things at home made a huge difference. She’s much more independent now.",
    who:    "Suchitra Mehta",
    detail: "Parent of an 8-year-old Daughter · Mumbai",
  },
];
