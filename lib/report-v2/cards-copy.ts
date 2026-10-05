// Report v2 — static, deterministic per-card copy (the "approved voice" mockups). Pure and
// server-built in ReportV2.tsx, then passed to the card deck. Pronoun-filled here so the client
// never needs gender. The type NAME appears only on card 4 (rule 3). Card 7 depends on the
// CHOSEN goal's worry, so it's built from the live goalKey, not the cached content.
import { displayChildName, buildPronounTokens, articleFor, type Gender } from "@/lib/report/pronouns";
import { canonicalConcern } from "./goal-mapping";

// ── card 1: worry line (second person, no quotes) ──────────────────────────────
const CARD1_HEADLINE: Record<string, string> = {
  reminders:  "You have to remind {Name} about almost everything.",
  homework:   "Homework with {Name} turns into a fight.",
  screens:    "Getting {Name} off screens is a fight.",
  confidence: "{Name} asks for help before even trying.",
  giveup:     "{Name} gives up the moment it gets hard.",
  finish:     "{Name} starts things but doesn’t finish them.",
  other:      "Getting {Name} to start and stay with things is hard.",
};

// ── card 2: why-this-keeps-happening headline (per archetype) ──────────────────
const CARD2_HEADLINE: Record<string, string> = {
  "The Storm":      "{Name} needs a real say in how things start.",
  "The All-In Kid": "{Name} goes all in when nobody breaks the stretch.",
  "The Inventor":   "{Name} likes to decide how a thing gets done.",
  "The Explorer":   "{Name}’s mind keeps finding new things to chase.",
  "The Magnet":     "{Name} focuses best with someone nearby.",
  "The Glue":       "{Name} works best once {he} feels connected.",
  "The Captain":    "{Name} steps up when something is truly {his} to run.",
  "The Live Wire":  "{Name} switches on when there’s something real to aim for.",
};

// ── card 3: evidence dimension → plain label ───────────────────────────────────
const DIM_LABEL: Record<string, string> = {
  attention_shape:       "What pulls {him} in",
  reward_driver:         "What gets {him} going",
  friction_response:     "When it gets hard",
  recharge_type:         "How {he} resets",
  attention_competition: "What pulls {him} away",
};

// ── card 4: what each type needs (per archetype) ───────────────────────────────
const CARD4_NEEDS: Record<string, string> = {
  "The Storm":      "A real say in how things start. Not whether, just how.",
  "The All-In Kid": "Long stretches that nobody interrupts.",
  "The Inventor":   "Room to choose the how. Not the what, just the how.",
  "The Explorer":   "Somewhere to put new ideas, so {he} can come back to the task.",
  "The Magnet":     "Someone nearby. Company, not supervision.",
  "The Glue":       "A few minutes of connection before the task starts.",
  "The Captain":    "Something that’s truly {his} to run.",
  "The Live Wire":  "A real challenge: a clock to beat, someone watching, a deadline.",
};

// ── card 7: three "voice-of-the-parent" pills per worry ────────────────────────
const CARD7_PILLS: Record<string, [string, string, string]> = {
  reminders:  ["Start now.", "Have you started yet?", "Come back to it."],
  homework:   ["Sit down now.", "Finish this page first.", "Come back to your work."],
  screens:    ["Time’s up.", "Switch it off now.", "Go find something else to do."],
  confidence: ["Just try it.", "Try first, then ask me.", "You can do this."],
  giveup:     ["Try once more.", "Don’t quit now.", "Keep going."],
  finish:     ["Finish what you started.", "Almost there.", "Don’t leave it half-done."],
  other:      ["Start now.", "Come back to it.", "Keep going."],
};

function makeFiller(name: string, gender: Gender) {
  const nm = name.trim() ? displayChildName(name) : "Your child";
  const t = buildPronounTokens(gender, nm);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (tmpl: string) =>
    tmpl
      .replace(/\{Name\}/g, nm)
      .replace(/\{He\}/g, cap(t.child_pronoun_subj))
      .replace(/\{he\}/g, t.child_pronoun_subj)
      .replace(/\{him\}/g, t.child_pronoun_obj)
      .replace(/\{his\}/g, t.child_pronoun_poss)
      .replace(/\{himself\}/g, t.child_pronoun_reflexive)
      .replace(/\{they\}/g, t.child_pronoun_subj)
      .replace(/\{their\}/g, t.child_pronoun_poss)
      .replace(/\{them\}/g, t.child_pronoun_obj);
}

function typeName(archetype: string): string {
  return archetype.replace(/^The\s+/i, "").trim();
}
function pluralType(type: string): string {
  const words = type.split(" ");
  words[words.length - 1] = words[words.length - 1] + "s";
  return words.join(" ").toUpperCase();
}

export type CardsCopy = {
  card1Headline: string;
  card2Headline: string;
  card3Labels: string[];            // one per evidence item, aligned
  card4: { typeName: string; article: string; sub: string; needs: string; needsLabel: string };
  card6Closing: string;
  card7: {
    sub: string;
    whyHeadline: [string, string];
    whyLead: string;
    pills: [string, string, string];
    whyLearn: string;
    steps: [string, string, string];
  };
};

export function buildCardsCopy(args: {
  name: string; gender: Gender; archetype: string; concern: string; ageBand: string;
  goalKey: string;                  // the CHOSEN goal's worry key (drives card 7 pills)
  evidenceDims: (string | undefined)[];
}): CardsCopy {
  const f = makeFiller(args.name, args.gender);
  const concern = canonicalConcern(args.concern);
  const goalWorry = canonicalConcern(args.goalKey);
  const type = typeName(args.archetype);
  return {
    card1Headline: f(CARD1_HEADLINE[concern] ?? CARD1_HEADLINE.other),
    card2Headline: f(CARD2_HEADLINE[args.archetype] ?? "{Name} works in a way of {his} own."),
    card3Labels: args.evidenceDims.map((d) => f((d && DIM_LABEL[d]) || "What you told us")),
    card4: {
      typeName: type,
      article: articleFor(type),
      sub: "One of eight ways children pay attention. Each comes with its own strengths.",
      needs: f(CARD4_NEEDS[args.archetype] ?? "Room to work in the way that fits {him}."),
      needsLabel: `What ${pluralType(type)} need`,
    },
    card6Closing: "However it goes, it tells you something. That’s the point of tonight.",
    card7: {
      sub: f(`One small change a week, 5 minutes a day. Written for ${articleFor(type)} ${type}, age ${args.ageBand}.`),
      whyHeadline: ["Today’s reminders.", "Tomorrow’s independence."],
      whyLead: f("{Name} won’t always have you beside {him} to say:"),
      pills: (CARD7_PILLS[goalWorry] ?? CARD7_PILLS.other).map((p) => f(p)) as [string, string, string],
      whyLearn: f("These six weeks help {him} learn to say it to {himself}."),
      steps: [f("You remind"), f("{He} notices"), f("{He} does it {himself}")],
    },
  };
}
