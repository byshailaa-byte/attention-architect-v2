// ─────────────────────────────────────────────────────────────────────────────
// DRAFT — FOR SHAILY'S REVIEW (halfway "FIRST READ" interstitial, v2 flow step 6)
//
// Shown full-screen after the parent answers the midpoint question. One line per
// archetype, describing the pattern ALREADY visible in the partial answers for the
// currently-leading archetype (attention_shape × reward_driver).
//
// Rules followed (please keep if you edit):
//   • One sentence. Present tense. Confident — NO "may / might / could / often".
//   • NO promises about outcomes (the report does that, not this screen).
//   • Drawn from each archetype's existing Section-2 pullquote voice.
//   • Tokens: {name} → child's display name; {they}/{them}/{their} → pronouns
//     (boy→he/him/his, girl→she/her/her, otherwise the child's NAME so singular
//     verb agreement always reads right — "{name} locks on", not "they lock on").
//     Avoid contracting {they} (no "{they}'ll") — it must read with a name too.
// ─────────────────────────────────────────────────────────────────────────────

export const HALFWAY_FIRST_READ: Record<string, string> = {
  "The All-In Kid":
    "{name} doesn't struggle to focus — {they} locks on hard, and the cost is every interruption that breaks the lock.",
  "The Inventor":
    "{name} isn't being difficult — {they} has to find {their} own way into a task before committing to it.",
  "The Explorer":
    "{name}'s attention moves wide and fast — the tangents aren't {them} drifting, they're how {they} thinks.",
  "The Magnet":
    "{name} runs on people — take the room away and you don't get focus, you remove the engine.",
  "The Glue":
    "{name} was never stuck on the work — {they} was stuck on needing you right next to it.",
  "The Captain":
    "{name} will do almost anything the moment it's actually {their} to run, and stalls the moment it isn't.",
  "The Live Wire":
    "{name} needs something to push against — take the friction away and there's nothing left to push with.",
  "The Storm":
    "{name} needs it to be {their} idea — give {them} that, and the same intensity that fights you starts working for you.",
};

// Shown if the two grid dimensions haven't separated yet by the midpoint (rare).
export const HALFWAY_FIRST_READ_FALLBACK =
  "A clear shape is forming in {name}'s answers — the next questions lock down which one.";
