import type { Actor, Context, HdgNode, HumanDecisionGraph } from "./types";
import { QUESTION_WEIGHTS } from "./weights";

// Answers that are inherently conditional — the option text is explicitly hedged.
// Key format: "questionId:value"
//
// D3.2:"solo-push"    — "Depends — some hard things energize them, others don't"
// D3.2:"support-seek" — "Depends on whether someone's there to help"
// D3.confirm:"energized" — "Genuinely varies by situation"
const CONDITIONAL_ANSWERS = new Set([
  "D3.2:solo-push",
  "D3.2:support-seek",
  "D3.confirm:energized",
]);

const PARENT_QUESTION_IDS = new Set(["G3", "P1", "P2"]);

type NodeText = { trigger: string; choice: string };

// Human-readable trigger/choice per (questionId:value).
// Trigger = what situation preceded this behavior.
// Choice = what the actor did in that situation.
const NODE_TEXTS: Record<string, NodeText> = {
  // G1 — attention_shape gateway
  "G1:narrow-deep":       { trigger: "when something absorbing is available", choice: "goes deep into one thing, ignoring everything else" },
  "G1:wide-shifting":     { trigger: "when something absorbing is available", choice: "moves between a few related things at once" },
  "G1:social-anchored":   { trigger: "when something absorbing is available", choice: "seeks to be with or around other people" },
  "G1:sensation-seeking": { trigger: "when something absorbing is available", choice: "pursues whatever feels most exciting or active" },

  // G2 — attention_competition gateway
  "G2:novelty":   { trigger: "when engaged in a required task", choice: "follows a new idea that pops into mind" },
  "G2:external":  { trigger: "when engaged in a required task", choice: "turns toward nearby noise, movement, or activity" },
  "G2:internal":  { trigger: "when engaged in a required task", choice: "disengages when feeling bored, frustrated, or restless" },
  "G2:social":    { trigger: "when engaged in a required task", choice: "seeks connection or distance from others" },

  // G3 — parent_instinct gateway (parent actor)
  "G3:quick-fixer": { trigger: "when child is stuck or struggling", choice: "steps in and helps get it done" },
  "G3:pusher":      { trigger: "when child is stuck or struggling", choice: "pushes child to keep trying on their own" },
  "G3:negotiator":  { trigger: "when child is stuck or struggling", choice: "talks it through and finds a middle ground" },
  "G3:steady-hand": { trigger: "when child is stuck or struggling", choice: "steps back and lets the child figure it out" },

  // D1.1, D1.2 — attention_shape depth
  "D1.1:narrow-deep":       { trigger: "during a period of complete absorption", choice: "gets deeper and deeper into one thing" },
  "D1.1:wide-shifting":     { trigger: "during a period of complete absorption", choice: "moves easily between 2–3 related things" },
  "D1.1:social-anchored":   { trigger: "during a period of complete absorption", choice: "does it with or alongside other people" },
  "D1.1:sensation-seeking": { trigger: "during a period of complete absorption", choice: "chases whatever feels most exciting in the moment" },

  "D1.2:narrow-deep":       { trigger: "given a large open-ended project", choice: "disappears into it and loses track of time" },
  "D1.2:wide-shifting":     { trigger: "given a large open-ended project", choice: "starts strong, then drifts before finishing" },
  "D1.2:social-anchored":   { trigger: "given a large open-ended project", choice: "wants to do it with someone, not alone" },
  "D1.2:sensation-seeking": { trigger: "given a large open-ended project", choice: "starts strong if exciting, then needs a reason to continue" },

  // D2.x — reward_driver depth
  "D2.1:mastery":  { trigger: "when offered engaging activities", choice: "lights up when figuring out something really hard" },
  "D2.1:novelty":  { trigger: "when offered engaging activities", choice: "lights up when discovering something brand new" },
  "D2.1:social":   { trigger: "when offered engaging activities", choice: "lights up when noticed, included, or appreciated" },
  "D2.1:autonomy": { trigger: "when offered engaging activities", choice: "lights up when given full control over what and how" },

  "D2.2:mastery":  { trigger: "after completing something hard", choice: "what matters is knowing they got better at something" },
  "D2.2:novelty":  { trigger: "after completing something hard", choice: "moves on to the next interesting thing" },
  "D2.2:social":   { trigger: "after completing something hard", choice: "wants someone to notice or be proud" },
  "D2.2:autonomy": { trigger: "after completing something hard", choice: "what mattered was having done it their own way" },

  "D2.3:mastery":  { trigger: "when interest in something loved fades", choice: "disengaged when it stopped being challenging" },
  "D2.3:novelty":  { trigger: "when interest in something loved fades", choice: "disengaged when something newer appeared" },
  "D2.3:social":   { trigger: "when interest in something loved fades", choice: "disengaged when the social element changed or disappeared" },
  "D2.3:autonomy": { trigger: "when interest in something loved fades", choice: "disengaged when feeling controlled or micromanaged" },

  "D2.confirm:mastery":  { trigger: "when sticking with a long-term commitment", choice: "sticks because they are getting better over time" },
  "D2.confirm:novelty":  { trigger: "when sticking with a long-term commitment", choice: "sticks when it stays interesting and fresh" },
  "D2.confirm:social":   { trigger: "when sticking with a long-term commitment", choice: "sticks to be with people who matter to them" },
  "D2.confirm:autonomy": { trigger: "when sticking with a long-term commitment", choice: "sticks when it genuinely feels like their own choice" },

  // D3.x — friction_response depth
  "D3.1:avoid":           { trigger: "when hitting something really hard", choice: "goes quiet and tries to avoid it if possible" },
  "D3.1:solo-push":       { trigger: "when hitting something really hard", choice: "pushes through alone, even when frustrated" },
  "D3.1:support-seek":    { trigger: "when hitting something really hard", choice: "looks for someone to help or work through it with" },
  "D3.1:emotional-derail": { trigger: "when hitting something really hard", choice: "gets upset before even starting to try" },

  "D3.2:avoid":           { trigger: "when facing hard tasks", choice: "finds it mostly draining — hard things feel heavy" },
  "D3.2:solo-push":       { trigger: "when facing hard tasks", choice: "responds variably — some hard things energize, others don't" },
  "D3.2:support-seek":    { trigger: "when facing hard tasks", choice: "engagement depends on whether support is available" },
  "D3.2:energized":       { trigger: "when facing hard tasks", choice: "finds it genuinely energizing — likes a real challenge" },

  "D3.3:avoid":           { trigger: "after a frustrating failure", choice: "needs space and time alone, without being pushed" },
  "D3.3:solo-push":       { trigger: "after a frustrating failure", choice: "will try again on their own terms, unprompted" },
  "D3.3:support-seek":    { trigger: "after a frustrating failure", choice: "needs someone to sit with them through it" },
  "D3.3:emotional-derail": { trigger: "after a frustrating failure", choice: "needs a reason to believe it is worth trying again" },

  "D3.confirm:solo-push":    { trigger: "when something is hard", choice: "tends to push through alone" },
  "D3.confirm:support-seek": { trigger: "when something is hard", choice: "tends to seek help or company" },
  "D3.confirm:avoid":        { trigger: "when something is hard", choice: "tends to pull back or avoid" },
  "D3.confirm:energized":    { trigger: "when something is hard", choice: "response varies genuinely by situation" },

  // P1, P2 — parent_instinct depth (parent actor)
  "P1:quick-fixer": { trigger: "when their approach is not working", choice: "tries something completely different right away" },
  "P1:pusher":      { trigger: "when their approach is not working", choice: "doubles down on the same approach, longer" },
  "P1:negotiator":  { trigger: "when their approach is not working", choice: "seeks outside perspective or new ideas" },
  "P1:steady-hand": { trigger: "when their approach is not working", choice: "steps back and waits to see if it resolves itself" },

  "P2:quick-fixer": { trigger: "in a difficult parenting moment", choice: "hardest to stay calm when nothing is working" },
  "P2:pusher":      { trigger: "in a difficult parenting moment", choice: "hardest not to solve it for them" },
  "P2:negotiator":  { trigger: "in a difficult parenting moment", choice: "hardest to stay consistent when tired or busy" },
  "P2:steady-hand": { trigger: "in a difficult parenting moment", choice: "hardest to trust their approach is right" },

  // D5.x — attention_competition depth
  "D5.1:boredom-avoidance": { trigger: "when choosing screens over other activities", choice: "fills boredom when nothing else is pulling" },
  "D5.1:task-escape":       { trigger: "when choosing screens over other activities", choice: "escapes a harder task they would rather not face" },
  "D5.1:social":            { trigger: "when choosing screens over other activities", choice: "connects with friends they cannot otherwise reach" },
  "D5.1:genuine-interest":  { trigger: "when choosing screens over other activities", choice: "pursues genuine excitement about a specific game or show" },

  "D5.2:boredom-avoidance": { trigger: "when screens offer what real life does not", choice: "gets constant immediate feedback and reward" },
  "D5.2:task-escape":       { trigger: "when screens offer what real life does not", choice: "gets a break from things feeling hard or slow" },
  "D5.2:social":            { trigger: "when screens offer what real life does not", choice: "gets connection with friends on their own terms" },
  "D5.2:genuine-interest":  { trigger: "when screens offer what real life does not", choice: "gets genuine novelty — something new every time" },

  // D6.x — recharge_type depth
  "D6.1:sensory-quiet":           { trigger: "after a really demanding day", choice: "needs quiet alone time with minimal input" },
  "D6.1:social-connection":       { trigger: "after a really demanding day", choice: "needs time with people they trust" },
  "D6.1:cognitive-displacement":  { trigger: "after a really demanding day", choice: "needs something engaging to take their mind elsewhere" },
  "D6.1:autonomous-unstructured": { trigger: "after a really demanding day", choice: "needs full control over their own time with no demands" },

  "D6.2:sensory-quiet":           { trigger: "when experiencing drain", choice: "drains fastest from noise, crowds, or sensory overload" },
  "D6.2:social-connection":       { trigger: "when experiencing drain", choice: "drains fastest from being alone or excluded for too long" },
  "D6.2:cognitive-displacement":  { trigger: "when experiencing drain", choice: "drains fastest from doing the same boring thing too long" },
  "D6.2:autonomous-unstructured": { trigger: "when experiencing drain", choice: "drains fastest from constant direction and instruction" },

  "D6.3:sensory-quiet":           { trigger: "when resting", choice: "best rest is quiet, low-stimulation time" },
  "D6.3:social-connection":       { trigger: "when resting", choice: "best rest is relaxed time with friends or family" },
  "D6.3:cognitive-displacement":  { trigger: "when resting", choice: "best rest is an absorbing distraction" },
  "D6.3:autonomous-unstructured": { trigger: "when resting", choice: "best rest is free time with zero structure or expectations" },

  "D6.confirm:sensory-quiet":           { trigger: "when needing to recharge", choice: "recharges best through quiet and low stimulation" },
  "D6.confirm:social-connection":       { trigger: "when needing to recharge", choice: "recharges best through connection with people" },
  "D6.confirm:cognitive-displacement":  { trigger: "when needing to recharge", choice: "recharges best through an absorbing distraction" },
  "D6.confirm:autonomous-unstructured": { trigger: "when needing to recharge", choice: "recharges best through freedom from structure" },

};

export function buildHdg(answers: Record<string, string>): HumanDecisionGraph {
  const nodes: HdgNode[] = [];

  for (const [questionId, value] of Object.entries(answers)) {
    if (!QUESTION_WEIGHTS[questionId]) continue;

    const key = `${questionId}:${value}`;
    const text = NODE_TEXTS[key];
    if (!text) continue;

    const context: Context = CONDITIONAL_ANSWERS.has(key) ? "conditional" : "unconditional";
    const actor: Actor = PARENT_QUESTION_IDS.has(questionId) ? "parent" : "child";

    nodes.push({
      id: `decision_${questionId}`,
      actor,
      trigger: text.trigger,
      choice: text.choice,
      source_question: questionId,
      source_value: value,
      context,
    });
  }

  return { nodes };
}
