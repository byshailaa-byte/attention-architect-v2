"use client";
import { useRouter } from "next/navigation";
import { SiteNav, SiteFooterFull, CloseBand, Wrap, Eyebrow } from "../../_shared";
import { notFound } from "next/navigation";

// ─── Article metadata ────────────────────────────────────────────────────────

type ArticleMeta = {
  title: string;
  kind: string;
  readTime: string;
  hasCta: boolean;
};

const META: Record<string, ArticleMeta> = {
  "ten-minutes": {
    title: "Why the good ten minutes always end at minute ten",
    kind: "Article",
    readTime: "4 min",
    hasCta: true,
  },
  "fine-at-school": {
    title: '"Fine at school, impossible at home" is not defiance',
    kind: "Article",
    readTime: "4 min",
    hasCta: true,
  },
  "eight-seconds": {
    title: "The eight seconds after your child stops",
    kind: "Article",
    readTime: "3 min",
    hasCta: true,
  },
  "screens": {
    title: "Screens are not the cause. They are the comparison.",
    kind: "Article",
    readTime: "4 min",
    hasCta: true,
  },
  "six-skills": {
    title: "The six skills, and what each looks like at 8, 11 and 14",
    kind: "Explainer",
    readTime: "6 min",
    hasCta: true,
  },
  "professional": {
    title: "When to stop reading us and call a professional",
    kind: "Explainer",
    readTime: "3 min",
    hasCta: false,
  },
};

// ─── Shared article typography ────────────────────────────────────────────────

const body: React.CSSProperties = {
  font: "var(--weight-regular) var(--text-base)/var(--leading-relaxed) var(--font-sans)",
  color: "var(--text-body)",
  margin: 0,
};

const h2Style: React.CSSProperties = {
  margin: "0 0 0",
  fontFamily: "var(--font-sans)",
  fontWeight: "var(--weight-bold)",
  fontSize: "var(--text-xl)",
  lineHeight: 1.3,
  letterSpacing: "var(--tracking-tight)",
  color: "var(--navy-800)",
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--border-divider)",
  margin: "0",
};

// ─── Article bodies ───────────────────────────────────────────────────────────

function TenMinutes() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={body}>Almost every parent describes the same shape without realising it is a shape.</p>
      <p style={body}>The homework comes out. The first ten minutes are genuinely good &mdash; you can see them thinking, the pencil is moving, nobody is arguing. Then something shifts. A question about something unrelated. A trip to the kitchen. Twenty minutes later the page has not moved and you have asked three times.</p>
      <p style={body}>You conclude, reasonably, that your child cannot concentrate for long.</p>
      <p style={body}>But look at what actually happened. They concentrated perfectly well for ten minutes. Whatever was holding their attention was working, and then it stopped working. The interesting question is not why they lost focus at minute ten. It is what was holding it for the first nine.</p>

      <hr style={divider} />
      <h2 style={h2Style}>Attention is held by something</h2>
      <p style={body}>Attention does not run on willpower alone. Something has to hold it &mdash; and for most children, at most moments, that something is one of a small number of things.</p>
      <p style={body}>For some children it is <strong>difficulty</strong>. While a problem is still hard enough to be interesting, they are completely in it. The moment it becomes easy &mdash; because they have worked it out, or because someone explained it &mdash; the grip releases and attention goes looking for the next hard thing. Minute ten is not when they got bored. It is when the problem stopped being a problem.</p>
      <p style={body}>For others it is <strong>ownership</strong>. They will stay with something for an hour if it was their idea. Hand them the identical task as an instruction and it lasts a few minutes. Nothing about the task changed. The ownership did.</p>
      <p style={body}>For others it is <strong>someone being there</strong>. Forty focused minutes at the kitchen table, and ten difficult ones alone in their room, on the same worksheet. The work did not change. The room did.</p>
      <p style={body}>For others it is <strong>stakes</strong>. A worksheet with no clock and nothing riding on it barely registers as happening. The same content against a timer gets everything they have.</p>
      <p style={body}>Four children, four completely different reasons, one identical complaint: <em>they cannot concentrate.</em></p>

      <hr style={divider} />
      <h2 style={h2Style}>Why this matters more than it sounds</h2>
      <p style={body}>If you do not know what was holding your child&rsquo;s attention, you cannot know what removed it &mdash; so every solution is a guess.</p>
      <p style={body}>This is why the same advice works beautifully in one house and does nothing in the next. &ldquo;Sit with them&rdquo; transforms things for the child held by presence and changes nothing for the child held by difficulty. &ldquo;Give them a break&rdquo; helps one child and destroys another, because for a child who goes very deep, the break is the interruption.</p>
      <p style={body}>None of that advice is wrong. It is just answering a question about a different child.</p>

      <hr style={divider} />
      <h2 style={h2Style}>What to do this week</h2>
      <p style={body}>Nothing yet. Just watch one evening and note two things:</p>
      <ol style={{ paddingLeft: "1.5em", display: "flex", flexDirection: "column", gap: 10 }}>
        <li style={body}><strong>When exactly did it stop?</strong> Not roughly &mdash; actually notice the minute and what was happening.</li>
        <li style={body}><strong>What changed right then?</strong> Did the work get easier? Did you step in? Did someone leave the room? Did the interesting part end?</li>
      </ol>
      <p style={body}>You are not looking for a solution. You are looking for the moment. Most parents have watched this happen a hundred times without ever looking at the moment itself, because it is such a familiar frustration that it stops being information.</p>
      <p style={body}>The moment is the information.</p>
    </div>
  );
}

function FineAtSchool() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={body}>It is one of the most common things parents tell us, and one of the most misread.</p>
      <p style={body}>The teacher says your child is attentive, cooperative, gets on with it. You are standing in your own kitchen watching a completely different child &mdash; one who cannot start, will not settle, and argues about a worksheet that would take eleven minutes.</p>
      <p style={body}>The obvious conclusion is that they can do it, and are choosing not to do it for you. That is what makes this one hurt.</p>

      <hr style={divider} />
      <h2 style={h2Style}>Why the two rooms are not the same test</h2>
      <p style={body}>Look at what school actually supplies, invisibly, all day.</p>
      <p style={body}>A fixed time and place, decided by someone else. A whole room of children doing the same thing at the same time. An adult present the entire time, not to help, just there. Clear beginnings and endings marked by bells. And a set of expectations that are simply the air &mdash; nobody is negotiating them, so there is nothing to negotiate.</p>
      <p style={body}>Now look at the kitchen at 6:40pm. The start time is negotiable. The place is negotiable. You are in and out of the room. There is no bell. There is a screen somewhere in the house. And you &mdash; the person they are most comfortable pushing against in the world &mdash; are the one asking.</p>
      <p style={body}>School is not measuring your child&rsquo;s attention. It is supplying a very large amount of external structure and measuring what is left over.</p>
      <p style={body}>Home supplies less of that structure. So home shows you more of what your child can actually do unassisted &mdash; which is a harder test, and a more honest one.</p>

      <hr style={divider} />
      <h2 style={h2Style}>The uncomfortable good news</h2>
      <p style={body}>If your child is fine at school, you have learned something genuinely useful: the underlying capacity is there. This is not a child who cannot focus. This is a child whose focus is currently propped up by conditions that only exist somewhere else.</p>
      <p style={body}>That is a much better position to start from than the reverse.</p>
      <p style={body}>But it also means the thing to build is not effort. It is the part school was doing for them &mdash; the structure &mdash; moved gradually inside, until it does not need a room full of other children to work.</p>

      <hr style={divider} />
      <h2 style={h2Style}>What not to do</h2>
      <p style={body}>Do not use school as evidence in an argument. <em>&ldquo;Your teacher says you manage perfectly well there&rdquo;</em> is factually true and completely counterproductive. It tells your child the difference is willingness, which is the one explanation that is almost certainly wrong, and the one most likely to make them defend themselves instead of think.</p>

      <hr style={divider} />
      <h2 style={h2Style}>What to try instead</h2>
      <p style={body}>Pick one thing school does that your house does not, and copy it exactly for a week. Not five things. One.</p>
      <p style={body}>The most common candidate is the fixed start. Same time, same place, every evening, decided in advance and not renegotiated on the night. Most of the argument in most houses is not about the work &mdash; it is about when the work starts. School removed that argument by never having it.</p>
    </div>
  );
}

function EightSeconds() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={body}>Your child stops. The pencil goes down, or the eyes drift, or they just go quiet in a way you recognise instantly.</p>
      <p style={body}>What you do in the next eight seconds matters more than almost anything else in the evening. And most of us do it without thinking, which is exactly the problem &mdash; the response is a reflex, and reflexes are fast.</p>

      <hr style={divider} />
      <h2 style={h2Style}>The four reflexes</h2>
      <p style={body}>There are broadly four, and all four are decent instincts.</p>
      <p style={body}><strong>You solve it.</strong> You see where they are stuck and you unstick them, because it is quick and it works and nobody has to be upset. This is kindness with a stopwatch.</p>
      <p style={body}><strong>You push.</strong> You raise the pressure a little &mdash; a firmer tone, a reminder of the consequence, an insistence that they can do this. Often they can, and often they do.</p>
      <p style={body}><strong>You negotiate.</strong> You explain why it matters, or you offer something. Finish this and then you can have that. It gets tonight&rsquo;s work done.</p>
      <p style={body}><strong>You hold steady.</strong> You say nothing, stay calm, and wait. You have learned that the ones who make it a fight get a fight.</p>
      <p style={body}>None of these is the wrong instinct. Each one is right, regularly, in the right house with the right child.</p>

      <hr style={divider} />
      <h2 style={h2Style}>What they have in common</h2>
      <p style={body}>Every one of them arrives fast.</p>
      <p style={body}>And a stop is not a failure. A stop is the moment your child&rsquo;s own attention has run into something &mdash; a difficulty, a fade, a distraction &mdash; and is about to try to do something about it. That attempt is the skill. It is the exact thing you want them to get good at.</p>
      <p style={body}>If the response arrives before the attempt does, the attempt never happens. Not once, and not on the hundredth evening either.</p>
      <p style={body}>This is not about doing less for your child. It is about the order of two things that happen seconds apart.</p>

      <hr style={divider} />
      <h2 style={h2Style}>The eight seconds</h2>
      <p style={body}>Next time they stop, count to eight before you say anything.</p>
      <p style={body}>That is the whole exercise. Eight seconds is short enough that nothing is lost and long enough that a real number of stalls resolve themselves &mdash; the child shifts, re-reads the line, sighs, and carries on.</p>
      <p style={body}>You will find out two things. First, roughly how often your child was about to sort it out on their own. For most parents this number is higher than expected, and it is a genuinely good evening when you discover it.</p>
      <p style={body}>Second, you will find out what your own reflex feels like from the inside. Eight seconds of not intervening is uncomfortable in a very specific way, and noticing that discomfort is the beginning of being able to choose.</p>

      <hr style={divider} />
      <h2 style={h2Style}>If it does not resolve</h2>
      <p style={body}>Then help. Obviously. Nobody is asking you to watch your child sink.</p>
      <p style={body}>But help differently. Instead of supplying the answer, ask where it got hard. <em>&ldquo;You stopped. That is fine. Where did it get difficult?&rdquo;</em></p>
      <p style={body}>That one question does something the answer cannot: it makes your child look at their own attention, which is the skill this is all actually about.</p>
    </div>
  );
}

function Screens() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={body}>Four hours on a game. Eleven minutes on homework. It is very hard to watch this and not conclude that the game has done something to your child.</p>
      <p style={body}>Almost every parenting conversation about attention ends up here, and almost all of it is aimed at the wrong target.</p>

      <hr style={divider} />
      <h2 style={h2Style}>What a game is actually doing</h2>
      <p style={body}>Look at what happens inside four hours of a game, minute by minute.</p>
      <p style={body}>It gets harder exactly as your child gets better. Not roughly &mdash; the difficulty tracks their improvement almost perfectly, so it is never too easy and never impossible. It shows the result of every action immediately. It sets a clear goal that is always just about reachable. It has stakes. Very often, other people are in it too. And your child chose it.</p>
      <p style={body}>Now look at the worksheet. The difficulty was set for a room of thirty, not for them. The result comes back in three days, marked in red. The goal is &ldquo;finish it.&rdquo; There are no stakes tonight. Nobody else is in it. And it was assigned.</p>
      <p style={body}>The game is not more fun. It is better <em>built</em> for holding attention &mdash; and it was built that way deliberately, by people who studied exactly what holds attention.</p>

      <hr style={divider} />
      <h2 style={h2Style}>Why this matters for what you do next</h2>
      <p style={body}>If screens are the cause, the fix is removal &mdash; and every evening becomes a negotiation about confiscation, which is the fight most houses are having.</p>
      <p style={body}>If screens are the comparison, they become the most useful piece of evidence you own. Because in four hours of a game, you are watching your child&rsquo;s attention working perfectly. All of it is there: the persistence, the recovery after failure, the focus.</p>
      <p style={body}>The question stops being <em>how do I get them off this</em> and becomes <em>what is this supplying that homework is not?</em> And that question has an answer you can actually act on.</p>

      <hr style={divider} />
      <h2 style={h2Style}>This does not mean screens are fine</h2>
      <p style={body}>They are genuinely hard to leave, and the difficulty of stopping is real and worth managing. Nothing here says give your child unlimited time.</p>
      <p style={body}>But notice what most screen rules are aimed at: the amount. And notice what most of the fighting is actually about: the ending. A child who is deep in something and gets it taken away mid-way is not fighting about screen time. They are fighting about being interrupted, which they would also do if it were a book.</p>
      <p style={body}>Most houses can improve the evening more by building a cleaner ending than by cutting the total time.</p>

      <hr style={divider} />
      <h2 style={h2Style}>One thing to try</h2>
      <p style={body}>Agree the stop time <em>before</em> the screen goes on, not during. Give a five-minute warning. Then say nothing further.</p>
      <p style={body}>That is it. No reduction in time this week. Just a stated ending and a warning, so the stop is something your child can see coming and prepare for, rather than something that happens to them.</p>
      <p style={body}>Some evenings this changes nothing. Some evenings it removes the whole argument. Both outcomes are information.</p>
    </div>
  );
}

function SixSkills() {
  const skillDivider: React.CSSProperties = {
    border: "none",
    borderTop: "2px solid var(--border-divider)",
    margin: "0",
  };
  const ageLabel: React.CSSProperties = {
    font: "var(--weight-bold) var(--text-sm)/1.4 var(--font-sans)",
    color: "var(--teal-700)",
    margin: "0 0 4px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={body}>&ldquo;She cannot concentrate&rdquo; tells you almost nothing, because attention is not one thing. It is at least six, they arrive roughly in order, and a child can be strong at the fourth while never having built the first.</p>
      <p style={body}>This is why a generic programme so often spends two weeks teaching a child something they can already do.</p>
      <p style={body}>Here are the six, and what each actually looks like at three ages.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>1. Starting</h2>
      <p style={body}>Getting from <em>I should</em> to actually begun, without a push from outside.</p>
      <p style={{ ...ageLabel }}>At 8</p>
      <p style={body}>The gap between being told and beginning is filled with something else entirely: a drink, a different book, a question. Not refusal. Just no bridge from intention to action.</p>
      <p style={{ ...ageLabel }}>At 11</p>
      <p style={body}>The delay gets explanations attached. <em>In a minute. After this. I work better later.</em> The explanations are often sincere.</p>
      <p style={{ ...ageLabel }}>At 14</p>
      <p style={body}>Starting failures look like avoidance and are frequently about something else: the task being unclear, or a fear of doing it badly. At this age the reason matters more than the delay.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>2. Holding on</h2>
      <p style={body}>Staying with a task once it stops being interesting, or hard enough to hold them.</p>
      <p style={{ ...ageLabel }}>At 8</p>
      <p style={body}>Holds while it feels like a game or while you are visibly nearby; releases the moment either goes.</p>
      <p style={{ ...ageLabel }}>At 11</p>
      <p style={body}>The classic ten-good-minutes shape. Real engagement, then a clean drop when the difficulty falls away.</p>
      <p style={{ ...ageLabel }}>At 14</p>
      <p style={body}>Often looks like multitasking. Still technically at the desk, attention already partly elsewhere, and genuinely convinced this is fine.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>3. Staying with it</h2>
      <p style={body}>Continuing across a whole session, not just the first good stretch.</p>
      <p style={{ ...ageLabel }}>At 8</p>
      <p style={body}>A whole session is short, and that is correct. Twenty unbroken minutes is a real achievement, not a low bar.</p>
      <p style={{ ...ageLabel }}>At 11</p>
      <p style={body}>Can manage a longer stretch on a good day. The test is whether it survives an ordinary tired Tuesday.</p>
      <p style={{ ...ageLabel }}>At 14</p>
      <p style={body}>The session is long enough that fatigue becomes a real factor, and knowing when to take a break is now part of the skill rather than a failure of it.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>4. Recovering</h2>
      <p style={body}>Coming back after an interruption. A separate skill from never being interrupted, and the one almost nobody teaches.</p>
      <p style={{ ...ageLabel }}>At 8</p>
      <p style={body}>An interruption usually ends the session entirely. Coming back is not yet available without help.</p>
      <p style={{ ...ageLabel }}>At 11</p>
      <p style={body}>Can return if the way back is obvious. Struggles if they have to work out where they were.</p>
      <p style={{ ...ageLabel }}>At 14</p>
      <p style={body}>Can usually return, but may not want to, and will sometimes decide the session is over as a way of avoiding the effort of restarting.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>5. Carrying it over</h2>
      <p style={body}>Using the same attention somewhere new: a different subject, a different room, a different kind of task.</p>
      <p style={{ ...ageLabel }}>At 8</p>
      <p style={body}>Very little transfer. What works at the kitchen table may simply not exist in the bedroom. This is normal and not a warning sign.</p>
      <p style={{ ...ageLabel }}>At 11</p>
      <p style={body}>Transfer starts to appear, unevenly, and usually first into things they like.</p>
      <p style={{ ...ageLabel }}>At 14</p>
      <p style={body}>Transfer is where it becomes visible whether a skill is genuinely built or was propped up all along by the conditions of one particular room.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>6. Running it themselves</h2>
      <p style={body}>Noticing their own drift and doing something about it without being told.</p>
      <p style={{ ...ageLabel }}>At 8</p>
      <p style={body}>Appears in flashes and does not last. A child saying <em>I need to stop for a minute</em> is doing something real, even once.</p>
      <p style={{ ...ageLabel }}>At 11</p>
      <p style={body}>Begins to appear as commentary: <em>I keep getting distracted.</em> Naming it is most of it.</p>
      <p style={{ ...ageLabel }}>At 14</p>
      <p style={body}>When it is genuinely there, it is quiet. Nothing is announced. They just adjust, and you find out later, or not at all.</p>

      <hr style={skillDivider} />
      <h2 style={h2Style}>How to use this</h2>
      <p style={body}>Do not read it as a report card. Read it as an order.</p>
      <p style={body}>Find the earliest one on the list that is not solid. That is where any useful plan starts &mdash; not at number one, and not at whichever one is annoying you most this week.</p>
      <p style={body}>A child strong at Recovering but shaky at Starting will look inconsistent to everyone, and will get told to try harder, when the actual gap is at the very beginning of the sequence.</p>
    </div>
  );
}

function Professional() {
  const item: React.CSSProperties = {
    font: "var(--weight-regular) var(--text-base)/var(--leading-relaxed) var(--font-sans)",
    color: "var(--text-body)",
    margin: 0,
    paddingLeft: "1em",
    borderLeft: "3px solid var(--border-divider)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={body}>This one is written plainly, because getting it wrong costs years.</p>
      <p style={body}>Everything else on this site is about ordinary attention in ordinary children. Attention varies enormously between children who are all perfectly fine. Most of what worries parents falls inside that range.</p>
      <p style={body}>But not all of it. And the honest thing to say is: some of what brings parents here is not something we should be helping with.</p>

      <hr style={divider} />
      <h2 style={h2Style}>We are not doctors</h2>
      <p style={body}>Attention Architect is a parent-education tool. Nothing here tests for, names, or rules out any condition &mdash; including ADHD. We describe what we see in the answers you give us. That is all.</p>
      <p style={body}>We cannot tell you your child does not have something. Nobody can do that from a questionnaire, and anyone who offers to is selling you something.</p>

      <hr style={divider} />
      <h2 style={h2Style}>When to speak to someone qualified</h2>
      <p style={body}>Not a checklist to score. Any one of these is reason enough to talk to a paediatrician, a child psychologist, or your child&rsquo;s school.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={item}><strong>It is not only attention.</strong> Alongside the focus difficulties there are ongoing struggles with reading, writing, numbers, speech, coordination, or sleep.</p>
        <p style={item}><strong>It is happening everywhere.</strong> School, home, sport, with friends, in things they genuinely enjoy &mdash; not just the things they would rather avoid.</p>
        <p style={item}><strong>Something changed.</strong> A child who was managing is now not, and it came on over weeks or months rather than always having been this way.</p>
        <p style={item}><strong>Your child is distressed.</strong> They are anxious about school, calling themselves stupid or lazy, withdrawing from things they used to like, or upset about how hard this feels.</p>
        <p style={item}><strong>It is getting worse, not steadier.</strong> Ordinary attention difficulties move around. Something that is steadily deteriorating is different.</p>
        <p style={item}><strong>Someone who spends time with your child is worried.</strong> A teacher, a coach, a relative. Outside observations are worth taking seriously, even when they are uncomfortable.</p>
        <p style={item}><strong>You are worried in a way that will not settle.</strong> This one counts. Parents are usually right that something is going on, even when they are wrong about what.</p>
      </div>

      <hr style={divider} />
      <h2 style={h2Style}>If any of that is true</h2>
      <p style={body}>Go and talk to someone. Not instead of anything we do &mdash; just go.</p>
      <p style={body}>Getting a proper assessment does not commit you to anything. It gives you real information, and if something is going on, earlier is better by a wide margin. Waiting rarely improves the situation and often makes it harder to address later.</p>

      <hr style={divider} />
      <h2 style={h2Style}>And if you do go</h2>
      <p style={body}>Everything on this site still stands. Understanding how your particular child&rsquo;s attention works is useful alongside professional support, not instead of it. A diagnosis, if there is one, tells you what you are dealing with. It does not tell you what to do at 6:40pm on a Tuesday.</p>
      <p style={body}>But the order matters. Professional first, if any of the above is true. We will be here afterwards.</p>
      <p style={body}>If you are unsure, write to us at <a href="mailto:support@thehumandecision.in" style={{ color: "var(--navy-800)" }}>support@thehumandecision.in</a>. If we think you should be talking to someone else, we will say so, even when that ends the conversation.</p>
    </div>
  );
}

// ─── Article Page ─────────────────────────────────────────────────────────────

const BODIES: Record<string, () => React.ReactElement> = {
  "ten-minutes": TenMinutes,
  "fine-at-school": FineAtSchool,
  "eight-seconds": EightSeconds,
  "screens": Screens,
  "six-skills": SixSkills,
  "professional": Professional,
};

export default function ArticlePage({ slug }: { slug: string }) {
  const meta = META[slug];
  if (!meta) { notFound(); return null; }

  const Body = BODIES[slug];
  const router = useRouter();
  const go = () => router.push("/start");

  return (
    <div className="aa-site">
      <SiteNav onCta={go} active="resources" />

      {/* Hero */}
      <div style={{ background: "var(--surface-page-warm)", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ padding: "var(--site-section-gap) 0", maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
              <Eyebrow>{meta.kind}</Eyebrow>
              <span style={{ font: "var(--weight-regular) var(--text-sm)/1 var(--font-sans)", color: "var(--ink-500)" }}>{meta.readTime} read</span>
            </div>
            <h1 style={{
              margin: 0, fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)",
              fontSize: "var(--type-display-size)", lineHeight: 1.16,
              letterSpacing: "var(--tracking-tight)", color: "var(--navy-800)",
            }}>{meta.title}</h1>
          </div>
        </Wrap>
      </div>

      {/* Body */}
      <section style={{ padding: "var(--site-section-gap) 0", borderBottom: "1px solid var(--border-divider)" }}>
        <Wrap>
          <div style={{ maxWidth: "68ch" }}>
            <Body />
          </div>
        </Wrap>
      </section>

      {meta.hasCta && (
        <CloseBand
          title="Reading helps. Knowing which one is your child helps more."
          lead="Five minutes, free, and then all of this has your child's name on it."
          onCta={go}
        />
      )}

      <SiteFooterFull />
    </div>
  );
}
