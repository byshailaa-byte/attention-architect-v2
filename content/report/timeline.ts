import type { TimelineScene } from "@/content/types";

// Timeline scenes — keyed by archetype displayName — §5 HOPE/TIMELINE.
// {{child_pronoun_poss}} / {{child_pronoun_obj}} / {{child_name}} are filled at render time.
// NOTE: {{child_pronoun_subj}} is intentionally avoided as the grammatical subject of
// any finite verb — singular "they" breaks third-person-singular conjugation.
// Entries use gerund phrases, passive voice, or {{child_name}} instead.
export const timelineScenes: Record<string, TimelineScene> = {
  "The Storm": {
    today: "Getting {{child_pronoun_obj}} to accept help feels like a standoff — {{child_pronoun_subj}}'d rather struggle alone than take a suggestion.",
    wk1:   "The standoff eases when a choice comes before the help.",
    wk2:   "Asking for input, on {{child_pronoun_poss}} own terms, more often.",
    wk3:   "Fewer flare-ups when a plan changes.",
    wk4:   "A plan comes before you've suggested one — on {{child_pronoun_poss}} own.",
    wk5:   "Noticeably less friction around anything that used to feel imposed.",
    wk6:   "A Saturday morning run on {{child_pronoun_poss}} own schedule — and it works.",
  },
  "The Explorer": {
    today: "Homework turns into a back-and-forth. You're reminding more than you'd like to, and neither of you quite knows why tonight is harder than last night.",
    wk1:   "Tuesday stops feeling like a negotiation, in small, noticeable ways.",
    wk2:   "Getting started takes less convincing.",
    wk3:   "You're reminding {{child_pronoun_obj}} less, and neither of you is keeping score.",
    wk4:   "Carrying more independently, without being tracked.",
    wk5:   "You notice {{child_pronoun_obj}} talking about it more confidently.",
    wk6:   "A Saturday morning where the start happens before you've said a word.",
  },
  "The Captain": {
    today: "Every task turns into a quiet tug-of-war over who's actually in charge of it.",
    wk1:   "The tug-of-war eases the moment real command of something small gets handed over.",
    wk2:   "Checking in less, deciding more.",
    wk3:   "Fewer objections when a plan needs adjusting — it's {{child_pronoun_poss}} plan now.",
    wk4:   "Whole routines start happening without a reminder.",
    wk5:   "A visible shift in how {{child_name}} talks about {{child_pronoun_poss}} responsibilities.",
    wk6:   "A Saturday morning where {{child_name}} is already leading, and you're just watching.",
  },
  "The All-In Kid": {
    today: "Every deep session gets cut short by a transition neither of you saw coming.",
    wk1:   "The interruptions ease as protected time becomes the default.",
    wk2:   "Resurfacing on {{child_pronoun_poss}} own — not from being pulled out.",
    wk3:   "Fewer meltdowns at transition points.",
    wk4:   "Asking for uninterrupted time instead of just taking it.",
    wk5:   "A visible deepening — sticking with harder things longer.",
    wk6:   "A Saturday morning of quiet absorption — an hour in, the good kind.",
  },
  "The Inventor": {
    today: "Every \"let me show you how\" gets met with quiet resistance, even when the help is genuinely useful.",
    wk1:   "The resistance eases when the method stays {{child_pronoun_poss}} to choose.",
    wk2:   "Asking for input instead of bracing against it.",
    wk3:   "Fewer shutdowns when {{child_pronoun_poss}} first approach doesn't work.",
    wk4:   "Iteration on {{child_pronoun_poss}} own ideas, without a restart.",
    wk5:   "A visible pride in showing you {{child_pronoun_poss}} own way of doing things.",
    wk6:   "A Saturday morning where {{child_pronoun_poss}} own system has been redesigned — and it works better.",
  },
  "The Magnet": {
    today: "The moment you step away to \"let {{child_pronoun_obj}} focus,\" the focus goes with you.",
    wk1:   "Holding on a little longer when presence, not correction, is what's offered.",
    wk2:   "Sitting nearby — quietly, without managing — starts doing real work.",
    wk3:   "Fewer check-ins needed to keep {{child_pronoun_obj}} going.",
    wk4:   "Settling into tasks even when you're nearby doing something else.",
    wk5:   "A visible independence, built on feeling accompanied, not alone.",
    wk6:   "A Saturday morning where you're both quietly doing your own things, together.",
  },
  "The Glue": {
    today: "Nothing gets done until the emotional air in the room is cleared first — and that takes longer than the task itself.",
    wk1:   "Clearing the air first, on purpose, starts saving real time.",
    wk2:   "Settling into tasks faster once connection isn't in question.",
    wk3:   "Fewer stalls that turn out to be about something else entirely.",
    wk4:   "Naming what's bothering {{child_pronoun_obj}} before it becomes a blocker.",
    wk5:   "A visibly calmer household on hard days, not just easy ones.",
    wk6:   "A Saturday morning that starts with five real minutes together, then just works.",
  },
  "The Live Wire": {
    today: "Anything low-key gets maybe two minutes of real attention before it goes flat.",
    wk1:   "A little real stake, well-placed, starts holding {{child_pronoun_poss}} attention longer.",
    wk2:   "Re-engaging faster after a lull, without needing a push.",
    wk3:   "Fewer flat, checked-out stretches.",
    wk4:   "Finding {{child_pronoun_poss}} own stakes — racing against {{child_pronoun_poss}} own time, {{child_pronoun_poss}} own goals.",
    wk5:   "A visible rise in follow-through on things that used to fizzle.",
    wk6:   "A Saturday morning where {{child_name}} is still going, an hour in, because it still feels real.",
  },
};
