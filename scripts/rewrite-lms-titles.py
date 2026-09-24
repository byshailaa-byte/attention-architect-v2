#!/usr/bin/env python3
"""
Batch content rewrite — week titles + day 2/4/5 titles for all 8 archetypes × 6 weeks.
Roadmap-visible strings only; underlying day content unchanged.
"""
import os
import sys

CONTENT_BASE = os.path.join(os.path.dirname(__file__), "..", "content", "lms")


def ts_val(s: str) -> str:
    """Escape a string for use inside a TypeScript double-quoted string value."""
    return s.replace("\\", "\\\\").replace('"', '\\"')


def patch_field(content: str, field: str, old_val: str, new_val: str, label: str) -> tuple[str, bool]:
    old_text = f'{field}: "{ts_val(old_val)}"'
    new_text = f'{field}: "{ts_val(new_val)}"'
    count = content.count(old_text)
    if count == 1:
        return content.replace(old_text, new_text, 1), True
    if count == 0:
        print(f"  WARNING ({label}): not found: {old_text!r}")
    else:
        print(f"  WARNING ({label}): found {count}× (expected 1): {old_text!r}")
    return content, False


def patch_file(
    arch_slug: str,
    week: int,
    wt_old: str, wt_new: str,
    d2_old: str, d2_new: str,
    d4_old: str, d4_new: str,
    d5_old: str, d5_new: str,
) -> None:
    path = os.path.join(CONTENT_BASE, f"week-{week}", f"{arch_slug}.ts")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    changes = 0
    content, ok = patch_field(content, "weekTitle", wt_old, wt_new, f"{arch_slug} W{week} weekTitle"); changes += ok
    content, ok = patch_field(content, "title", d2_old, d2_new, f"{arch_slug} W{week} D2"); changes += ok
    content, ok = patch_field(content, "title", d4_old, d4_new, f"{arch_slug} W{week} D4"); changes += ok
    content, ok = patch_field(content, "title", d5_old, d5_new, f"{arch_slug} W{week} D5"); changes += ok

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"{'OK' if changes == 4 else 'PARTIAL'}: {arch_slug} W{week} — {changes}/4 changes applied")


# (arch_slug, week, wt_old, wt_new, d2_old, d2_new, d4_old, d4_new, d5_old, d5_new)
REWRITES = [
    # ──────────── THE STORM ────────────
    ("storm", 1,
     "The Opening Choice", "Let Them Pick How It Starts",
     "Offer one opening choice.", "Offer two ways to begin, then step back.",
     "Let them make the choice worse.", "Let them pick the harder one, even knowing it won't go well.",
     "Name it.", "Tell them what they ran, not that they behaved."),
    ("storm", 2,
     "Real Say on Screens", "A Real Choice, Even About Screens",
     "Offer one real choice inside a real boundary.", "Set the limit, then let them choose how to spend it.",
     "A harder choice, still inside the boundary.", "Let them spend it badly once, without renegotiating.",
     "Name what {{child_pronoun_subj}} owned.", "Point out what they decided, not that they turned it off."),
    ("storm", 3,
     "Beyond One Task", "When It Sticks for a Whole Afternoon",
     "Hand over the whole stretch.", "Hand them the whole stretch, not just the first step.",
     "Let a real snag play out.", "When it snags mid-way, don't step in to smooth it.",
     "Name it directly.", "Say what they held onto, not that they got through it."),
    ("storm", 4,
     "When the Choice Goes Wrong", "When They Choose Badly — and You Let Them",
     "Let one choice go through uncorrected.", "Let one choice go through without the warning you want to give.",
     "Let a real one land.", "Let a real one land — including the part where it doesn't work.",
     "Name it.", "Say they handled the fallout, not that they should've listened."),
    ("storm", 5,
     "Not Just His Choice", "When Their Choice Affects a Sibling",
     "Let the negotiation happen without you.", "Let them work it out with their sibling before you referee.",
     "Let a real one get contested.", "Let it get genuinely contested, and stay out of it.",
     "Name it.", "Say they made room for someone else, not that they shared nicely."),
    ("storm", 6,
     "Choosing Without Being Asked", "When They Decide Before You Offer",
     "Let it happen without comment.", "Notice a choice they made without waiting for you.",
     "Notice a real one, and say nothing.", "Let it pass without praising it into a moment.",
     "Name it, once, at the end.", "Say it once, at the end of the week — not every time."),

    # ──────────── THE ALL-IN KID ────────────
    ("all-in-kid", 1,
     "The Protected Block", "One Stretch Nobody Interrupts",
     "Offer one real block.", "Pick one block and guard it — no check-ins, no snack runs.",
     "Let the block run past comfortable.", "Let it run past the point you'd normally call time.",
     "Name what you protected.", "Say what they got into, not that they sat still."),
    ("all-in-kid", 2,
     "The Same Depth on Screens", "The Same Rule When It's a Screen",
     "Give a non-screen task the same protection.", "Protect a screen-based deep stretch the same way you would a book.",
     "Set a real, respected boundary on the screen time too.", "Don't interrupt it just because it's a screen.",
     "Name the connection.", "Name what held their attention, not the fact it was quiet."),
    ("all-in-kid", 3,
     "Protected Depth, Sustained", "Protecting It on the Days It's Inconvenient",
     "Protect a real stretch, explicitly.", "Keep the block even on the day it's least convenient for you.",
     "Let a rough patch happen without rescue.", "When something else comes up, protect it anyway once.",
     "Name it directly.", "Say you kept it, and why it mattered that you did."),
    ("all-in-kid", 4,
     "When the Session Goes Sideways", "When the Deep Dive Goes Nowhere",
     "Let the drift run.", "Let a session run even when it clearly isn't going anywhere.",
     "Let a real one go nowhere.", "Don't offer the better approach you can see from across the room.",
     "Name it.", "Say the focus was real, even though it didn't produce anything."),
    ("all-in-kid", 5,
     "Depth That Makes Room", "When a Sibling Needs You Mid-Session",
     "Let {{child_name}} decide how to respond.", "Let them decide whether to pause, instead of deciding for them.",
     "Let a real competing need play out.", "Let the sibling wait once, without you smoothing it over.",
     "Name it.", "Say it was a hard call, not that they were selfish or generous."),
    ("all-in-kid", 6,
     "Signaling for Quiet Unprompted", "When They Ask for the Quiet Themselves",
     "Let the signal stand.", "Notice when they ask for the time before you offer it.",
     "Notice a real one, hands off.", "Don't double-check or offer to help protect it.",
     "Name it, once.", "Say it once: they've started finding it themselves."),

    # ──────────── THE INVENTOR ────────────
    ("inventor", 1,
     "Protecting Their Method", "Let Them Do It Their Way",
     "Let the wrong way run.", "Let them start it their way, even if yours is faster.",
     "Ask instead of tell.", "Don't offer the shortcut when you see them take the long road.",
     "Name what {{child_pronoun_subj}} built, their way.", "Ask why they did it that way — and actually listen to the answer."),
    ("inventor", 2,
     "Their Way on Screens", "Their Way, Even When It's a Screen",
     "Give a real task that same freedom.", "Let them set up the screen task their own way.",
     "Set a real time boundary on the screen itself.", "Resist reorganising it into something that makes sense to you.",
     "Name the connection.", "Ask what they were going for before you comment on the result."),
    ("inventor", 3,
     "Method-Ownership, Bigger Project", "Their Way on Something That Takes a Week",
     "Hand over the whole project.", "Hand them something bigger than a single sitting.",
     "Let the method hit a real wall.", "When they change approach mid-way, let it change.",
     "Name it directly.", "Say the plan was theirs, start to finish."),
    ("inventor", 4,
     "When the Method Fails", "When Their Way Doesn't Work",
     "Let it run toward the failure.", "Let the approach fail all the way through — no small rescue hint.",
     "Let the real one fail completely.", "Let them decide whether to fix it, restart it, or drop it.",
     "Name it.", "Say the method didn't work. Don't say you saw it coming."),
    ("inventor", 5,
     "When the Project Isn't Just His", "When Someone Else's Idea Changes the Plan",
     "Let the method actually shift.", "Let a friend's or sibling's idea actually change the direction.",
     "Let a real collaboration test it.", "Don't step in to protect the original plan when it starts shifting.",
     "Name it.", "Say they made room for someone else's thinking, not that they gave in."),
    ("inventor", 6,
     "Defending the Approach Unprompted", "When They Explain Why Without Being Asked",
     "Listen without evaluating.", "Notice when they explain their reasoning without you asking.",
     "Notice a real one, and just listen.", "Listen to it without weighing in on whether it's right.",
     "Name it, once.", "Say it once: they've started defending their own thinking."),

    # ──────────── THE EXPLORER ────────────
    ("explorer", 1,
     "The Capture Channel", "Somewhere for the Good Ideas to Go",
     "Give the tangent a place to go.", "Keep a notepad next to the homework.",
     "Point the wandering at the work itself.", "Ask what part of the actual work they'd chase first.",
     "Name the connection, not the compliance.", "Tell them what you noticed — not that they finally sat still."),
    ("explorer", 2,
     "The Same Channel on Screens", "The Same Notepad, Even With Screens",
     'Give screens a "come back to it" pad too.', 'Give screen-time ideas the same "write it down, come back" landing spot.',
     "Set a real time boundary too.", "Set a real end time, and let the notepad hold what's unfinished.",
     "Name the connection.", "Say the system worked, not that they logged off on time."),
    ("explorer", 3,
     "The System, All Week", "When Writing It Down Becomes Normal",
     "Make the system the standing expectation.", "Make the notepad the standing setup, not a this-week experiment.",
     "Revisit the list together.", "Go back through the list together at least once.",
     "Name it directly.", "Say it's become how they work now."),
    ("explorer", 4,
     "When the Chase Dead-Ends", "When the Idea Turns Out to Be Nothing",
     "Let the chase run.", "Let them chase one that clearly isn't going anywhere.",
     "Let the real one dead-end.", "Let it dead-end fully, without steering them off it early.",
     "Name it.", "Say dead ends are part of chasing ideas, not a reason to stop."),
    ("explorer", 5,
     "When the Chase Interrupts Someone Else", "When Their Excitement Interrupts Someone",
     "Let {{child_name}} notice and adjust on their own.", "Let them notice the interruption themselves before you name it.",
     "Let a real interruption happen and be repaired.", "Let a real one happen, and let them repair it their own way.",
     "Name it.", "Say they read the room, not that they were finally quiet."),
    ("explorer", 6,
     "Reaching for the System Unprompted", "When They Reach for It Without Reminding",
     "Let it be unremarkable.", "Notice them using it somewhere you never set it up.",
     "Notice a real one, unprompted, and unremarked.", "Let it be unremarkable — don't turn it into a moment.",
     "Name it, once.", "Say it once: the system's theirs now, whatever it looks like."),

    # ──────────── THE MAGNET ────────────
    ("magnet", 1,
     "Steady Presence", "Being in the Room Without Managing It",
     "Be present without taking over.", "Sit nearby without steering what they're doing.",
     "Widen the gap slightly.", "Let a quiet stretch stay quiet — don't fill it.",
     "Name what {{child_pronoun_subj}} carried alone.", "Say you were there, not that they did well."),
    ("magnet", 2,
     "Presence Not Supervision", "Nearby, Not Supervising",
     "Offer real presence during non-screen time.", "Be in the room during screen time without monitoring it.",
     "Set a real time boundary on screens too.", "Resist the check-in that's really a check-up.",
     "Name the connection.", "Say you were around, not that you were watching."),
    ("magnet", 3,
     "Presence, Sustained", "Staying Through the Long Stretch",
     "Extend your presence without adding input.", "Stay present across a longer stretch, not just the start.",
     "Stay through a rough moment.", "Don't drift off the moment it seems to be going fine.",
     "Name it directly.", "Say you stayed, and that they didn't need managing."),
    ("magnet", 4,
     "Staying Present Through a Real One", "Staying When It's Hard to Watch",
     "Stay in the room, hands off.", "Stay in the room while they struggle, hands off.",
     "Stay through a real one.", "If they ask for help, ask what they've already tried first.",
     "Name it.", "Say you stayed and they worked through it themselves."),
    ("magnet", 5,
     "Presence Shared", "When It's Not Just the Two of You",
     "Let {{child_name}} find their own way in.", "Let them navigate a group moment without you smoothing it.",
     "Let a real group moment run.", "Don't fill the awkward gap when the room goes uneven.",
     "Name it.", "Say they held it with more than one person, which is harder."),
    ("magnet", 6,
     "Asking for Company on Their Own Terms", "When They Ask for You Themselves",
     "Follow the terms exactly.", "Notice when they ask for company instead of you offering.",
     "Notice a real one, and match it exactly.", "Give exactly what they asked for — no more, no different.",
     "Name it, once.", "Say it once: they told you what they needed, and you heard it."),

    # ──────────── THE GLUE ────────────
    ("glue", 1,
     "Connection First", "Two Minutes Before the Homework",
     "Clear the air before the ask.", "Connect for two minutes before mentioning what needs doing.",
     "Name the tension instead of working around it.", "Don't let those two minutes turn into the lead-in to a task.",
     "Name the connection that made it work.", "Say you noticed how they were doing, not that they got started."),
    ("glue", 2,
     "Connection Before Screens", "Reconnect Before You Mention the Screen",
     "Connect first, before any screen conversation.", "Sit with them for a moment before raising screen time.",
     "Set a real boundary too — connection first.", "Don't open with the limit — open with them.",
     "Name the connection.", "Say the conversation went differently, and why."),
    ("glue", 3,
     "Connection-First, Daily", "Even on the Days It's Not Going Well",
     "Make connection-first a daily standard, not a good-day habit.", "Keep the two minutes on the day you least feel like it.",
     "Hold it on the hardest day.", "Especially keep it on a day that's already gone badly.",
     "Name it directly.", "Say you showed up on the hard day too."),
    ("glue", 4,
     "Sitting With What Doesn't Resolve", "When You Can't Fix It by Bedtime",
     "Name it without fixing it.", "Name the tension out loud without rushing to solve it.",
     "Sit with a real one.", "Let it stay unresolved past the point that's comfortable.",
     "Name it.", "Say you're still fine, even without sorting it out."),
    ("glue", 5,
     "Connection When a Sibling Is in the Middle", "When It's a Fight Between the Two of Them",
     "Let {{child_name}} try first.", "Let their instinct to smooth it try first, before you referee.",
     "Let a real one play out.", "Watch for them carrying more of it than is fair.",
     "Name it.", "Say it's not all theirs to hold."),
    ("glue", 6,
     "Naming the Feeling Unprompted", "When They Tell You Before You Ask",
     "Listen without fixing.", "Notice when they name how they're feeling unprompted.",
     "Notice a real one, and just listen.", "Just listen — don't move to fix it unless they ask.",
     "Name it, once.", "Say it once: you're glad they can tell you."),

    # ──────────── THE CAPTAIN ────────────
    ("captain", 1,
     "Their Real Call", "Something That's Actually Theirs to Run",
     "Hand over one real call.", "Hand over one thing completely — decisions included.",
     "Let {{child_name}} lead something bigger.", "Don't quietly redo it after they've done it their way.",
     "Name what {{child_name}} ran.", "Say it was theirs, not that they helped out."),
    ("captain", 2,
     "Their Own Rule", "Let Them Set the Screen Rule",
     "Hand {{child_pronoun_obj}} real say in setting today's boundary.", "Let them propose the screen rule instead of you setting it.",
     "Let {{child_pronoun_obj}} self-monitor the boundary.", "Hold them to their own rule rather than yours.",
     "Name what {{child_pronoun_subj}} owned.", "Say they set it and kept it."),
    ("captain", 3,
     "Leadership, Sustained", "Running It for a Whole Week",
     "Hand over a real ongoing responsibility.", "Give them something ongoing, not a one-off task.",
     "Let a real failure happen under {{child_pronoun_poss}} lead.", "Let it wobble mid-week without taking it back.",
     "Name it directly.", "Say they ran it all week, including the messy parts."),
    ("captain", 4,
     "When Leadership Fails", "When It Falls Apart on Their Watch",
     "Let it start to go wrong.", "Let it go wrong without stepping in to manage it.",
     "Let a real one fail under him.", "Skip the post-mortem unless they ask for one.",
     "Name it.", "Say how they responded is the leadership, not never failing."),
    ("captain", 5,
     "Leading Something That Isn't Just His", "When a Sibling Has to Go Along With It",
     "Let {{child_name}}'s authority stand.", "Let their authority stand without you backing it up.",
     "Let a real one test the dynamic.", "When the sibling appeals to you, send them back.",
     "Name it.", "Say they led through real pushback, which is harder."),
    ("captain", 6,
     "Taking Charge Unprompted", "When They Step Up Without Being Asked",
     "Let it stand without formalizing it.", "Notice them taking charge before anyone hands it to them.",
     "Notice a real one, and just recognize it.", "Don't formalise it afterward — that implies they needed permission.",
     "Name it, once.", "Say it once: nobody asked them to."),

    # ──────────── THE LIVE WIRE ────────────
    ("live-wire", 1,
     "The Real Stake", "Something Actually Riding on It",
     "Put something real on the line.", "Let them set one real stake, in their own terms.",
     "Let {{child_pronoun_obj}} set the stake.", "Let it be genuinely uncertain — not rigged to work out.",
     "Name the intensity, not the outcome.", "Say the stake was theirs, not that they tried hard."),
    ("live-wire", 2,
     "A Borrowed Real Stake", "A Real Stake, Even on Screen Time",
     "Borrow that exact stake-shape for a non-screen task.", "Attach a real stake to a screen-time boundary they set.",
     "Set a real time boundary on the screen too.", "Let it hold without you renegotiating mid-week.",
     "Name the connection.", "Say the stake did the work, not your reminders."),
    ("live-wire", 3,
     "Stakes, Sustained", "When It Has to Last More Than a Burst",
     "Build a real stake into something longer.", "Set a stake that runs across days, not one sitting.",
     "Let the stake fail to pay off, honestly.", "Let the energy dip mid-way without rescuing it.",
     "Name it directly.", "Say they carried it past the exciting part."),
    ("live-wire", 4,
     "When the Stake Doesn't Pay Off", "When They Don't Get the Thing",
     "Let the stake run.", "Let a real stake fail without softening the terms after.",
     "Let a real one not pay off.", 'No consolation prize, no "well, you tried."',
     "Name it.", "Say it was a real one — that's what makes it worth setting again."),
    ("live-wire", 5,
     "Stakes Shared With Someone Else", "When Someone Else Loses Too",
     "Let them set the real terms together.", "Let them set a shared stake with real weight for both.",
     "Let a real shared one run.", "Don't quietly protect the other kid from the outcome.",
     "Name it.", "Say they let it be real for both of them."),
    ("live-wire", 6,
     "Inventing Stakes Unprompted", "When They Set Their Own Bet",
     "Let it stand as {{child_pronoun_poss}} own.", "Notice a stake they set without any prompting from you.",
     "Notice a real one, and just validate it.", "Don't help formalise it — let it stay entirely theirs.",
     "Name it, once.", "Say it once: nobody asked them to set that."),
]


if __name__ == "__main__":
    print(f"Processing {len(REWRITES)} files...\n")
    warnings = 0
    for row in REWRITES:
        patch_file(*row)
    print(f"\nDone. Check any WARNINGs above before running content:manifest.")
