import { describe, it, expect } from "vitest";
import {
  bannedPhrase, wordCount, extractQuotes, hasQuotedSentence,
  quotePlusQuestion, groupsChild, enforceReplyQuality,
} from "@/lib/lms/coach/guards";

describe("banned method-drift phrases", () => {
  it("flags the stricter-drift language", () => {
    expect(bannedPhrase("Keep a firm edge tonight.")).toBe("firm");
    expect(bannedPhrase("Hold the line tonight.")).toBe("hold the line");
    expect(bannedPhrase("Offer the stop, no debate about it.")).toBe("no debate");
    expect(bannedPhrase("Just hold it and wait.")).toBe("hold it");
    expect(bannedPhrase("He's testing you.")).toBe("testing you");
    expect(bannedPhrase("There must be a consequence.")).toBe("consequence");
    expect(bannedPhrase("Don't punish him.")).toBe("punish");
    expect(bannedPhrase("Make him sit down.")).toBe("make him/her");
    expect(bannedPhrase("Offer two start times, no negotiation needed")).toBe("no negotiation");
  });
  it("does NOT flag the verbatim LMS step wording", () => {
    // The step body says "held firmly" / "a real edge" — allowed; only the drift words are banned.
    expect(bannedPhrase("a clear start and end, held firmly")).toBeNull();
    expect(bannedPhrase("only the when and how long get a real edge")).toBeNull();
    expect(bannedPhrase("Let's confirm the plan.")).toBeNull(); // not "firm"
  });
});

describe("quote + question (never both)", () => {
  it("flags a quoted sentence followed by a dangling question", () => {
    expect(quotePlusQuestion('Try saying "Do it your way." Did he start?')).toBe(true);
  });
  it("allows a reply that ends with the quoted sentence (even a quoted question)", () => {
    expect(quotePlusQuestion('Try saying, "Do it your way."')).toBe(false);
    expect(quotePlusQuestion('Ask him "Which first — maths or reading?"')).toBe(false);
  });
  it("allows a single plain question with no quote", () => {
    expect(quotePlusQuestion("How did bedtime go tonight?")).toBe(false);
  });
});

describe("quote extraction + grouping", () => {
  it("pulls straight and curly quotes", () => {
    expect(extractQuotes('say "hello there" now')).toEqual(["hello there"]);
    expect(extractQuotes("say “hello there” now")).toEqual(["hello there"]);
    expect(hasQuotedSentence("no quotes here")).toBe(false);
  });
  it("flags type/group talk", () => {
    expect(groupsChild("Inventors like him need space.")).toBe(true);
    expect(groupsChild("kids like this often stall")).toBe(true);
    expect(groupsChild("Give Kabir room to try his own way.")).toBe(false);
  });
});

describe("enforceReplyQuality regen loop", () => {
  it("fires length then banned, chaining corrections", async () => {
    const long = Array(95).fill("word").join(" ") + ' say "go now".';
    const seq = [
      'Shorter now. Keep a firm edge.',          // after length fix — still has "firm"
      'Shorter now. Offer two start times.',     // after banned fix — clean
    ];
    let i = 0;
    const out = await enforceReplyQuality(long, async () => seq[i++] ?? "");
    expect(out.fired.long).toBe(1);
    expect(out.fired.banned).toBe(1);
    expect(bannedPhrase(out.text)).toBeNull();
    expect(wordCount(out.text)).toBeLessThanOrEqual(90);
  });
  it("does nothing to a clean reply", async () => {
    const clean = 'Let Kabir start his own way. Say "Your call how to begin."';
    const out = await enforceReplyQuality(clean, async () => "REGEN");
    expect(out.text).toBe(clean);
    expect(out.fired).toEqual({ long: 0, question: 0, banned: 0, repeat: 0, group: 0 });
  });
  it("regenerates when the reply names a child type/group", async () => {
    const out = await enforceReplyQuality(
      "Live Wires like her need a real stake.",
      async () => "Give Meera a stake she picks herself.",
    );
    expect(out.fired.group).toBe(1);
    expect(groupsChild(out.text)).toBe(false);
  });
  it("regenerates when the 'say this' sentence repeats one already given", async () => {
    const reply = 'Try again tonight. Say "Your call how to begin."';
    const out = await enforceReplyQuality(
      reply,
      async () => 'A fresh angle. Say "What would you try first?"',
      undefined,
      ["Your call how to begin."], // already said earlier in the chat
    );
    expect(out.fired.repeat).toBe(1);
    expect(out.text).toContain("What would you try first?");
  });
});
