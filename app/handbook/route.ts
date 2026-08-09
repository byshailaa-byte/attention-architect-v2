import { NextResponse } from "next/server";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Attention Handbook — A Field Guide for Parents</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,500&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --paper:#EDE6D6; --paper2:#E3D9C3; --white:#FBF9F3;
    --ink:#201E19; --ink-soft:#5B5648; --ink-faint:#8B8570;
    --rule:rgba(32,30,25,.13);
    --accent:#34503F; --accent-bright:#1F7A4C; --accent-soft:rgba(52,80,63,.10);
    --gold:#A9772A; --gold-soft:rgba(169,119,42,.14);
    --alarm:#B8452E; --cream:#F4EFE3;
    --shadow: 0 1px 2px rgba(32,30,25,.05), 0 10px 28px rgba(32,30,25,.08);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--paper);color:var(--ink);font-family:'Public Sans',sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:'Bricolage Grotesque',sans-serif}
  ::selection{background:var(--accent);color:var(--white)}

  section{max-width:740px;margin:0 auto;padding:70px 28px}
  .eyebrow{font-size:11.5px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;color:var(--gold)}

  .cover{background:var(--ink);color:var(--cream);max-width:none;padding:0}
  .cover-inner{max-width:740px;margin:0 auto;padding:90px 28px 80px}
  .cover .eyebrow{color:rgba(244,239,227,.6)}
  .cover h1{font-size:clamp(32px,5.4vw,50px);font-weight:700;line-height:1.16;margin:20px 0 18px;max-width:14ch}
  .cover .sub{font-size:16px;color:rgba(244,239,227,.72);max-width:42ch;line-height:1.7}
  .cover .rcard{margin-top:50px;background:var(--white);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.35);max-width:280px;overflow:hidden}
  .cover .rcard .head{padding:12px 20px;border-bottom:1px solid var(--rule);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);text-align:center;font-weight:700}
  .cover .rcard .row{display:flex;justify-content:space-between;padding:10px 20px;border-bottom:1px solid var(--rule);font-size:13.5px;color:var(--ink)}
  .cover .rcard .row .n{font-weight:700;color:var(--ink-soft)}
  .cover .rcard .row.attn{background:var(--gold-soft);border-bottom:none}
  .cover .rcard .row.attn .q{color:var(--alarm);font-weight:800}
  .cover .tag{margin-top:44px;font-size:12px;color:rgba(244,239,227,.4)}

  h2{font-size:clamp(24px,3.4vw,31px);font-weight:700;line-height:1.28;margin:16px 0 20px;max-width:19ch}
  h2 .hl{color:var(--accent-bright)}
  p{font-size:15.5px;color:var(--ink-soft);margin-bottom:15px;max-width:60ch}
  p strong{color:var(--ink);font-weight:700}

  .era-box{background:var(--white);border-radius:14px;box-shadow:var(--shadow);border:1px solid var(--rule);padding:20px 24px;margin:24px 0}
  .era-row{display:flex;gap:16px;padding:9px 0}
  .era-row:first-child{border-bottom:1px solid var(--rule);padding-bottom:14px;margin-bottom:4px}
  .era-row .yr{font-weight:800;font-size:15px;color:var(--accent);flex-shrink:0;width:52px}
  .era-row .txt{font-size:14px;color:var(--ink-soft)}

  .quotebar{background:var(--gold-soft);border-left:3px solid var(--gold);border-radius:0 10px 10px 0;padding:14px 20px;margin:22px 0;font-size:16px;font-weight:700;color:var(--ink)}

  .fight-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}
  @media (max-width:600px){ .fight-grid{grid-template-columns:1fr} }
  .fight-card{border-radius:14px;padding:18px 22px}
  .fight-card.quiet{background:var(--white);border:1px solid var(--rule);box-shadow:var(--shadow)}
  .fight-card.loud{background:var(--ink);color:var(--cream)}
  .fight-card .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;margin-bottom:10px}
  .fight-card.quiet .k{color:var(--ink-faint)}
  .fight-card.loud .k{color:var(--gold)}
  .fight-card ul{list-style:none;font-size:14px}
  .fight-card.quiet ul li{color:var(--ink-soft);padding:4px 0}
  .fight-card.loud ul li{color:rgba(244,239,227,.75);padding:4px 0}
  .fight-line{text-align:center;font-size:16px;font-weight:700;margin:14px 0 8px}
  .fight-line .hl{color:var(--alarm)}
  .fight p.close{text-align:center;color:var(--ink-soft)}

  .tip-box{background:var(--white);border-radius:14px;box-shadow:var(--shadow);border:1px solid var(--rule);padding:22px 26px;margin:18px 0}
  .tip-box .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--accent-bright);margin-bottom:14px}
  .tip-item{display:flex;gap:12px;padding:9px 0;font-size:14.5px;color:var(--ink-soft)}
  .tip-item .mark{color:var(--accent-bright);font-weight:800;flex-shrink:0}
  .tip-item strong{color:var(--ink)}

  .checklist-real{max-width:340px;margin:24px 0;text-align:left}
  .cr-row{display:flex;align-items:center;gap:12px;padding:8px 0;font-size:14.5px;color:var(--ink-soft)}
  .cr-row .tick{width:19px;height:19px;border-radius:6px;background:var(--accent-soft);color:var(--accent-bright);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0}
  .cr-row.missing-row{background:var(--gold-soft);margin:3px -12px 0;padding:10px 12px;border-radius:10px}
  .cr-row.missing-row .tick{background:transparent;border:2px solid var(--gold);color:transparent}
  .cr-row.missing-row .lbl{font-weight:700;color:var(--ink)}

  .assess-box{background:var(--white);border-radius:16px;box-shadow:var(--shadow);border:1px solid var(--rule);padding:26px 28px;margin:22px 0}
  .assess-box .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--accent-bright);margin-bottom:12px}
  .assess-box ul{list-style:none;font-size:14.5px;color:var(--ink-soft)}
  .assess-box ul li{padding:4px 0}
  .assess-box ul li::before{content:"✓ ";color:var(--accent-bright);font-weight:700}
  .archrow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0 6px}
  @media (max-width:600px){ .archrow{grid-template-columns:repeat(2,1fr)} }
  .archcell{background:var(--paper2);border-radius:10px;padding:11px 8px;text-align:center;font-size:12.5px;font-weight:700}
  .arch-extra{text-align:center;font-size:12px;color:var(--ink-faint)}

  .share-box{background:var(--gold-soft);border:1px solid rgba(169,119,42,.25);border-radius:16px;padding:26px 28px;text-align:center;margin:26px 0}
  .share-box .k{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:var(--gold);margin-bottom:12px}
  .share-box p{margin:0 auto;max-width:52ch;color:var(--ink-soft)}
  .share-btn{margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:var(--white);border:1.5px solid var(--gold);color:var(--ink);font-weight:700;font-size:13.5px;padding:11px 22px;border-radius:10px;cursor:pointer}

  .final{background:var(--paper2);border-radius:26px;text-align:center;padding:56px 36px}
  .final .tagline{font-family:'Fraunces',serif;font-style:italic;font-size:19px;color:var(--ink);margin-bottom:14px}
  .final p.sub{color:var(--ink-soft);font-size:14.5px;margin:0 auto 26px;max-width:44ch}
  .btn-primary{background:var(--accent-bright);color:#fff;border:none;font-weight:700;font-size:15.5px;padding:16px 34px;border-radius:10px;box-shadow:0 8px 22px rgba(31,122,76,.28);cursor:pointer;text-decoration:none;display:inline-block}
  .btn-primary:hover{background:#186339}
  .final .priv{margin-top:16px;font-size:12.5px;color:var(--ink-faint)}

  footer{max-width:740px;margin:0 auto;padding:44px 28px 70px;text-align:center;font-size:12px;color:var(--ink-faint)}
</style>
</head>
<body>

<section class="cover">
  <div class="cover-inner">
    <div class="eyebrow">The Human Decision</div>
    <h1>The Attention Handbook</h1>
    <p class="sub">The invisible skill behind every report card. A field guide for parents — free to read, free to share.</p>
    <div class="rcard">
      <div class="head">Annual Report Card</div>
      <div class="row"><span>Mathematics</span><span class="n">97</span></div>
      <div class="row"><span>Science</span><span class="n">95</span></div>
      <div class="row attn"><span><strong>Attention</strong></span><span class="q">?</span></div>
    </div>
    <div class="tag">A Field Guide for Parents · Attention Architect</div>
  </div>
</section>

<section>
  <div class="eyebrow">One · The Feeling You Know</div>
  <h2>It's 8 p.m. The homework still isn't done.</h2>
  <p>Dinner is over. The thirty-minute worksheet has quietly eaten the whole evening. Your child is at the desk — but not really there. The pencil becomes a drumstick. A water break becomes a wander. You explain the same sum for the third time, and you can see it happen: they heard you, they nodded, and nothing landed.</p>
  <p>You're not angry. You're confused. Because this is a bright child. They can narrate a film scene by scene, master a game most adults can't follow. The intelligence is obviously there.</p>
  <p><strong>So why does one page of homework feel like pushing a boulder uphill — every single night?</strong></p>
  <p>Most of us quietly wonder if it's laziness. Or attitude. Or our own failure to be strict enough. It's almost never any of those.</p>
  <p>There's something underneath all of it — something no one ever named for us. And once you see it, you can't unsee it.</p>
</section>

<section>
  <div class="eyebrow">Two · A Shift Nobody Announced</div>
  <h2>The world changed. The way we raise children didn't.</h2>
  <p>Think about how you were raised. Information was scarce — it lived in libraries, in a shelf of encyclopedias, in the one teacher who knew. The skill that mattered was finding it. Once you found it, it was yours.</p>
  <p>Our children live in the exact opposite world. Information is now infinite, instant, and free. Finding it is no longer the skill. It's barely a task.</p>
  <div class="era-box">
    <div class="era-row"><div class="yr">1995</div><div class="txt">Information was scarce. The skill was finding it.</div></div>
    <div class="era-row"><div class="yr">2026</div><div class="txt">Information is infinite. The skill is directing your attention within it.</div></div>
  </div>
  <p>We are raising children for a world of infinite information, using instincts built for a world of scarcity. No wonder it isn't clicking.</p>
  <div class="quotebar">Every generation protects one resource. For this generation, that resource is attention.</div>
</section>

<section>
  <div class="eyebrow">Three · A Word We Never Defined</div>
  <h2>We've misunderstood attention for a long time.</h2>
  <p>We think a child "paying attention" means a child sitting still. Quiet. Obedient. Facing the front.</p>
  <p>But that's stillness, not attention. A child can sit perfectly still and be a thousand miles away. Another can fidget constantly and be completely absorbed.</p>
  <p>Real attention is three quiet acts, repeated over and over: <strong>choosing</strong> what deserves your mind, <strong>staying</strong> with it when it turns hard, <strong>returning</strong> after you've been pulled away.</p>
  <p>That's the whole skill. It sits underneath reading, studying, listening, creating — nearly everything we want for our children. We've simply never given it a name. So we've never thought to build it.</p>
</section>

<section>
  <div class="eyebrow">Four · Six Things You Can Try Tonight</div>
  <h2>Real attention has three parts. Here's one real thing to try for each.</h2>
  <p>Choosing, staying, returning — the three quiet acts from the last chapter. None of this requires knowing your specific child's pattern. It just requires knowing where to put the effort.</p>

  <div class="tip-box">
    <div class="k">Before it starts — help them choose</div>
    <div class="tip-item"><span class="mark">✓</span><span><strong>Remove the competition, don't just ask for willpower.</strong> Phone out of the room, not just face-down. A cleared desk beats a stern reminder every time.</span></div>
    <div class="tip-item"><span class="mark">✓</span><span><strong>Let them own one small choice.</strong> Which subject first, what order, which pen. Ownership over the entry point matters more than the content of the task.</span></div>
  </div>

  <div class="tip-box">
    <div class="k">Once it's begun — help them stay</div>
    <div class="tip-item"><span class="mark">✓</span><span><strong>Shrink the first step until it's almost too easy.</strong> "Just open the book and read one line" beats "finish the chapter." Starting is usually the real barrier, not stamina.</span></div>
    <div class="tip-item"><span class="mark">✓</span><span><strong>Match the challenge, don't just add time.</strong> Too easy invites drift. Too hard invites avoidance. If focus keeps breaking, check the task's difficulty before assuming attention is the problem.</span></div>
  </div>

  <div class="tip-box">
    <div class="k">After it's lost — help them return</div>
    <div class="tip-item"><span class="mark">✓</span><span><strong>Redirect neutrally, not with more pressure.</strong> "Where were we?" rebuilds the skill of returning. "Pay attention!" adds pressure without teaching anything.</span></div>
    <div class="tip-item"><span class="mark">✓</span><span><strong>Build in real recovery, don't just push through.</strong> A few quiet minutes after real effort isn't wasted time — it's what makes the next stretch of focus possible. Attention recovers like a muscle, not a switch.</span></div>
  </div>
</section>

<section class="fight">
  <div class="eyebrow">Five · An Unfair Fight</div>
  <h2>Someone is training your child's attention every day. It probably isn't you.</h2>
  <p>Attention is a muscle, trained constantly. The only question is by whom.</p>
  <div class="fight-grid">
    <div class="fight-card quiet"><div class="k">The Quiet Trainers</div><ul><li>You</li><li>School</li><li>Books</li><li>Sport & music</li><li>A slow dinner conversation</li></ul></div>
    <div class="fight-card loud"><div class="k">The Loud Ones</div><ul><li>Infinite scroll</li><li>Autoplay</li><li>Notifications</li><li>Recommendation engines</li><li>Thousands of engineers</li></ul></div>
  </div>
  <div class="fight-line">One child. <span class="hl">Against thousands of engineers.</span></div>
  <p class="close">They aren't weak. They're out-engineered — and no amount of willpower fixes a mismatch in scale.</p>
</section>

<section>
  <div class="eyebrow">Six · The Foundation</div>
  <h2>Attention isn't one subject among many. It's the ground the others stand on.</h2>
  <p>We pour enormous energy into what sits on top — marks, tuitions, ranks, talents. We spend almost none on the foundation they all rest on.</p>
  <p>You can't learn without attention. You can't remember without it. You can't think deeply, or use new tools like AI well, without it either.</p>
  <div class="quotebar">A brilliant child with untrained attention is a fast car with a loose steering wheel. The power is all there. The ability to point it isn't — yet.</div>
</section>

<section>
  <div class="eyebrow">Seven · The Age Ahead</div>
  <h2>The future belongs to children who can direct their own minds.</h2>
  <p>Here is the strange gift of the AI age. For the first time in history, knowing things is no longer rare. A machine can recall and explain almost anything, instantly.</p>
  <p>What the machine cannot do is decide what matters, stay with a hard problem, and steer a mind toward something worth building. That stays entirely human — and entirely dependent on attention.</p>
  <div class="quotebar">The children who can focus will use these tools to fly. The children who can't will be used by them.</div>
  <p>The difference between those two futures isn't intelligence. It's attention. This isn't a reason to be afraid. It's a reason to start.</p>
</section>

<section>
  <div class="eyebrow">Eight · The Hopeful Part</div>
  <h2>The good news: attention can be built.</h2>
  <p>If attention were fixed — a fact of personality your child was born with or without — this would be a sad story. It isn't.</p>
  <p>Attention is not destiny. It's a skill. And like every skill, it grows with the right kind of practice — not by trying harder in general, but by understanding, specifically, how a particular child's attention actually works.</p>
  <div class="quotebar">The catch is simple: you can only train what you can see. And almost no parent has ever been shown how to see their child's attention clearly.</div>
</section>

<section>
  <div class="eyebrow">Nine · The Blind Spot</div>
  <h2>We measure everything about our children. <span class="hl">Except this.</span></h2>
  <p>We mark their height on the wall. We check their weight, their eyes, their teeth. We track their marks, subject by subject, term by term. We have a number for nearly everything that matters about a growing child.</p>
  <div class="checklist-real">
    <div class="cr-row"><div class="tick">✓</div>Height</div>
    <div class="cr-row"><div class="tick">✓</div>Weight</div>
    <div class="cr-row"><div class="tick">✓</div>Marks</div>
    <div class="cr-row missing-row"><div class="tick">?</div><div class="lbl">Attention</div></div>
  </div>
  <p style="font-weight:700;color:var(--ink)">Except the one skill that shapes all the others.</p>
  <p>No report card has a line for it. No annual check-up looks at it. It isn't that we decided it didn't matter — it's that no one ever handed us a way to see it.</p>
</section>

<section>
  <div class="eyebrow">The Next Step</div>
  <h2>This is why we built Attention Architect.</h2>
  <p>We didn't set out to build a product. We set out to answer a question: why are so many bright children struggling to focus — and why is no one helping parents understand it?</p>
  <p>The more we looked, the clearer it became. Parents everywhere were fighting the <strong>symptoms</strong> — the homework battles, the screen wars, the careless mistakes — without ever seeing the skill underneath. So we built a way to see it.</p>
  <div class="assess-box">
    <div class="k">The Attention Assessment</div>
    <p style="margin-bottom:14px">A simple, private assessment that shows you your child's specific attention type, and your own instinct pattern as a parent — in plain language. Not a score. Not a label. A map of how your child's mind actually works, built entirely from your own answers.</p>
    <ul>
      <li>Free, adaptive, and private</li>
      <li>One of 8 attention types, one of 4 parent instinct patterns</li>
      <li>No labels. No frightening scores. No clinic visit.</li>
      <li>Just a clear picture — and a few practical, personal ways to strengthen it</li>
    </ul>
    <div class="archrow">
      <div class="archcell">The All-In Kid</div>
      <div class="archcell">The Inventor</div>
      <div class="archcell">The Storm</div>
      <div class="archcell">The Live Wire</div>
    </div>
    <div class="arch-extra">+ The Explorer · The Magnet · The Glue · The Captain</div>
  </div>
</section>

<section>
  <div style="text-align:center;margin-bottom:8px">
    <div class="eyebrow">Before You Go</div>
    <h2 style="margin:16px auto">Attention is the one thing on the report card that was never actually on the report card.</h2>
    <p style="text-align:center;margin:0 auto 8px">Now you know why it matters, and you have six real things to try tonight. That's genuinely enough to start with.</p>
  </div>

  <div class="share-box">
    <div class="k">Know a parent who needs this?</div>
    <p>This took months to get right, and it's yours to share freely — no strings attached. Send it to one parent who's had the same 8 p.m. evening you have. It costs you nothing, and it might save them a few of those evenings.</p>
    <button class="share-btn" onclick="if(navigator.share){navigator.share({title:'The Attention Handbook',url:window.location.href})}else{navigator.clipboard.writeText(window.location.href);this.textContent='Link copied ✓'}">↗ Share this page</button>
  </div>

  <div class="final">
    <div class="tagline">Become the Architect of your child's Attention Health.</div>
    <p class="sub">If you want this mapped specifically for your own child — not generic tips, but their actual pattern — that's what the free assessment does.</p>
    <a href="/" class="btn-primary">Open the free assessment →</a>
    <div class="priv">5 Minutes · Private · No sign-up needed</div>
  </div>
</section>

<footer>Attention Architect · by The Human Decision · Made for parents who want to understand, not diagnose.</footer>

</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
