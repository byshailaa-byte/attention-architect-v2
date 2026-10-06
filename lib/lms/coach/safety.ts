// Coach safety gate. Runs BEFORE any model call. On a match we never call the LLM — we store the
// parent message flagged, reply with the fixed safety response, and alert an operator.
//
// Covers English + Hindi/Hinglish harm/abuse/self-harm/danger words. Safety-first: we accept
// false positives (a flagged message gets a careful human-handoff reply, which is never harmful).

// Hindi/Hinglish (romanised): marna/maar/maarta (hit/kill), khudkushi (suicide), chot (injury/hurt),
// "jaan de" (take one's life). English: physical harm + self-harm/suicide + danger/unsafe/abuse.
const SAFETY_RE = new RegExp(
  [
    // Hindi / Hinglish (romanised) — word-ish boundaries
    "\\bmar(?:na|ta|te|ti|a|wa|ne)?\\b",   // mar, marna, marta, marte
    "\\bmaar(?:ta|ti|te|na|ne|o|a)?\\b",   // maar, maarta, maarte
    "\\bkhudkushi\\b",
    "\\bchot\\b",
    "\\bjaan\\s+de(?:ta|ti|te|na|ne)?\\b", // jaan de / jaan dena / jaan dene
    // English
    "\\bhits?\\b", "\\bhitting\\b", "\\bbeat(?:s|ing|en)?\\b", "\\bslap(?:s|ped|ping)?\\b",
    "\\babus\\w*\\b",                // abuse, abusive, abusing
    "\\bself[\\s-]?harm\\w*\\b",
    "\\bsuicid\\w*\\b",
    "\\bkill(?:s|ing)?\\s+(?:him|her|them|my)?\\s*self\\b",
    "\\bkill\\s+(?:himself|herself|themselves|myself)\\b",
    "\\bkill\\s+(?:him|her|them)\\b",
    "\\bunsafe\\b",
    "\\bin\\s+danger\\b",
    "\\bhurt(?:s|ing)?\\s+(?:him|her|them|my|it)\\w*\\b",
  ].join("|"),
  "i",
);

export function isSafetyMessage(text: string): boolean {
  if (!text) return false;
  return SAFETY_RE.test(text);
}

// The fixed safety reply (stored as role='safety'). {child} = child's display name.
export function safetyReply(child: string, supportEmail: string): string {
  const who = child || "your child";
  return (
    `Thank you for telling me. This needs a person, not a coach.\n` +
    `If ${who} or anyone is in danger right now, call 112.\n` +
    `Tele-MANAS (free, 24×7): 14416\n` +
    `Childline: 1098\n` +
    `You can also write to us at ${supportEmail} and we'll respond personally.`
  );
}
