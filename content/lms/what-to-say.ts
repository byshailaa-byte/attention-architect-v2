// Keyed by archetype displayName (matches ctx.archetype from getLmsUserContext).
// Tuple index = week - 1 (index 0 = Week 1 … index 4 = Week 5).
// Week 6 is universal — see WEEK6_SCRIPT below.

export type NotThis = { phrase: string; why: string };

export const WEEK6_SCRIPT = "Nothing. That is the week.";

// ── Positive phrase — keyed by child archetype ───────────────────────────────
// Moved verbatim from app/simplified/roadmap/page.tsx.

export const SAY_BY_ARCHETYPE: Record<string, [string, string, string, string, string]> = {
  "The Storm": [
    "Which one first — your call.",
    "You pick the stop time. I'll hold you to it.",
    "Same time tomorrow. Still your call how.",
    "That didn't work. What do you want to do now?",
    "This one's yours to sort out too.",
  ],
  "The All-In Kid": [
    "Take as long as you need. I won't interrupt.",
    "Tell me when you're at a stopping point.",
    "Same block tomorrow. I'll keep it clear.",
    "You got pulled out. Where were you?",
    "Same as at the desk — take your time with it.",
  ],
  "The Inventor": [
    "Do it your way. Show me when you're done.",
    "How do you want to end it?",
    "Same way as yesterday, if that worked.",
    "That approach didn't hold. What's your next one?",
    "Your way works here too. Try it.",
  ],
  "The Explorer": [
    "Write it down, then come back to it.",
    "Park it. It'll still be there.",
    "Notebook first, then the page.",
    "You went somewhere. Where were you before that?",
    "Same trick here — write it, then carry on.",
  ],
  "The Magnet": [
    "I'll be right here. You start.",
    "I'm not going anywhere. Finish your bit.",
    "Same spot, same time. I'll be around.",
    "You stopped. I'm still here — start again.",
    "I'm in the next room. Give it a go.",
  ],
  "The Glue": [
    "We're good. Whenever you're ready.",
    "Nothing's wrong. Finish and come find me.",
    "Same as always. We're fine.",
    "That was a wobble, not a problem. Ready?",
    "Same here as at the table. All fine.",
  ],
  "The Captain": [
    "This one's yours. Tell me what you need.",
    "You decide when it ends.",
    "Still yours all week. I'm not checking.",
    "It went wrong. How do you want to fix it?",
    "You're running this one too.",
  ],
  "The Live Wire": [
    "Ten minutes on the clock — see how far you get.",
    "Beat yesterday's stop time.",
    "Same clock tomorrow. Same target.",
    "Didn't come off. What's the next one?",
    "Set yourself something here too.",
  ],
};

// ── Not-this — keyed by parent instinct ─────────────────────────────────────
// Keyed by parent_pattern displayName (matches ctx.parentPattern).
// Instinct is never wrong — each entry names the moment the instinct misfires,
// not a character flaw. Week 6 has no not-this (the week is about not speaking).

export const NOT_THIS_BY_INSTINCT: Record<string, [NotThis, NotThis, NotThis, NotThis, NotThis]> = {
  "The Quick Fixer": [
    {
      phrase: "Here, let me just get you started.",
      why:    "Starting it for them closes the gap, and the gap is the thing being practised this week. The help is real; it arrives one moment before the skill would have.",
    },
    {
      phrase: "Let's just move to the kitchen table.",
      why:    "Changing the setting fixes tonight and teaches nothing about the pull. Next week the pull is still there and the table isn't.",
    },
    {
      phrase: "Let's try a different way.",
      why:    "A new approach resets the clock to interesting. Stamina is built in the part that has stopped being interesting, which is exactly where the new idea removes them from.",
    },
    {
      phrase: "Never mind, I'll sort it out.",
      why:    "Sorting it out removes the return, and the return is the entire week. The slip was not the problem; it was the setup.",
    },
    {
      phrase: "I'll remind you when it's time.",
      why:    "Carrying it over can't happen while you are still holding the trigger. This is the week the reminder becomes the thing being removed.",
    },
  ],

  "The Pusher": [
    {
      phrase: "Come on, just start.",
      why:    "Pressure is not a first step. It arrives into a moment that has no direction in it, so it adds weight without adding a place to begin.",
    },
    {
      phrase: "Ignore it and keep going.",
      why:    "Nothing is ignorable by instruction. Naming what pulled them is what makes the pull visible; telling them to ignore it makes it theirs to hide.",
    },
    {
      phrase: "You were doing so well — keep going.",
      why:    "At the fade, encouragement lands as a demand. They hear that the good stretch is now a standard they are failing to hold.",
    },
    {
      phrase: "You gave up too easily.",
      why:    "This turns a slip into a verdict, and nobody returns to a verdict. The week needs the slip to stay small enough to walk back from.",
    },
    {
      phrase: "You manage it for homework, so you can do it here.",
      why:    "Carrying over by instruction is the one way it doesn't transfer. It becomes another place you are asking, rather than a place they noticed.",
    },
  ],

  "The Negotiator": [
    {
      phrase: "Do twenty minutes and then you can have your phone.",
      why:    "This makes starting a price to be paid rather than a step to be taken. The deal also has to be renewed tomorrow, and it gets more expensive each time.",
    },
    {
      phrase: "Finish this and then you can check it.",
      why:    "Naming the distraction as the reward makes it larger than it was. For the rest of the hour they are working toward the thing you are trying to reduce.",
    },
    {
      phrase: "Just ten more minutes and we'll stop.",
      why:    "Renegotiating mid-task puts the finish line in view, and the stretch ends there rather than where it would have. The week is about the ordinary middle, which has no finish line in it.",
    },
    {
      phrase: "Okay — let's just do half tonight.",
      why:    "This renegotiates the task when what needs restoring is the attempt. They come back to a smaller thing instead of coming back.",
    },
    {
      phrase: "If you do it here too, then we'll sort out the weekend.",
      why:    "A deal for each new context means a new deal in every context. What carries over has to be theirs, not the terms.",
    },
  ],

  "The Steady Hand": [
    {
      phrase: "Nothing. Waiting for them to begin.",
      why:    "The calm is right for most of this programme. Week 1 is the exception: the first step has to be handed over, once, rather than waited for. After that you can go back to waiting.",
    },
    {
      phrase: "Nothing. Letting the drift run its course.",
      why:    "Left alone, a drift completes. One interruption of the interruption — early, brief, without heat — is what this week asks of you, and it will feel like too much.",
    },
    {
      phrase: "Take a break if you need one.",
      why:    "Offered before they have asked, permission reads as an exit. On the ordinary day, staying is the whole practice, and the break was not their idea until you had it.",
    },
    {
      phrase: "It's fine — leave it for tonight.",
      why:    "Your calm is the right temperature and the wrong timing. It lands as the end of the evening when the week needs one short return, however small.",
    },
    {
      phrase: "Nothing. Waiting for it to appear somewhere else on its own.",
      why:    "Carrying over rarely happens unnoticed. It needs naming once, out loud, the first time you see it happen away from the desk — and then not again.",
    },
  ],
};
