"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export type SimplifiedReportData = {
  childName: string;
  ageBand: string;
  archetype: string;
  archetypeFitTier: string;
  parentPattern: string;
  parentInstinctFitTier: string;
  archetypeDesc: string;
  parentInstinctDesc: string;
  profile: {
    attentionShape: { label: string; desc: string };
    attentionCompetition: { label: string; desc: string };
    frictionResponse: { label: string; desc: string };
    rechargeType: { label: string; desc: string };
  };
  m01Title: string | null;
  m01Content: string | null;
  // DETAIL 01 simplified — 3-4 checklist bullets extracted from m_01 prose.
  detail01Bullets: string[] | null;
  // DETAIL 03 — populated from m_03 (loop detected) or m_instinct_interaction_fallback.
  // fixLoopRefs() is applied at render time on both paths. Trimmed to first paragraph at render.
  detail03Content: string | null;
  detail03Title: string | null;
  // DETAIL 05 — emoji stripped at call site; text only.
  strengths: string[] | null;
  // Try Tonight — from m_simplified_actions.tryTonight.
  actions: { emoji: string; label: string; description: string }[] | null;
  tryTonight: { title: string; steps: string[] } | null;
  weekTitles: [string, string, string];
  sessionId: string;
  // Attention Advantage report fields
  patternLine: string;
  meaning: string[];
  frictionPoints: string[];
  instinctLine: string;
  tonightSay: string;
  tonightWatch: string;
  nowLines: string[];
  thenLines: string[];
  ladderCurrent: number;
  testimonial: { quote: string; who: string; detail: string };
  drawsIn: string;
  pullsAway: string;
  friction: string;
  recharge: string;
  weakestTwo: string[];
  dimValues: {
    attention_shape: string;
    attention_competition: string;
    friction_response: string;
    recharge_type: string;
  };
};

type Tab = "home" | "assess" | "report" | "sell";

// Scoped substitution for m_03 content when rendered in DETAIL 03.
// m_03 uses "the loop" / "The loop" as a subject — this has a proper antecedent in the
// gated report's "Family Attention Loop" section heading, but not here. Replace with
// "this dynamic" / "This dynamic" at display time only; stored data is unchanged.
function fixLoopRefs(text: string): string {
  return text
    .replace(/\bThe loop\b/g, "This dynamic")
    .replace(/\bthe loop\b/g, "this dynamic");
}

// Renders a narrative prose string (m_01 / m_03 content) as React paragraphs.
// Splits on double-newline, converts **bold** to <strong>.
function NarrativeProse({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className={className}>
      {paras.map((para, i) => {
        const parts = para.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} style={{ fontSize: "13px", color: "var(--dim)", lineHeight: 1.75, marginBottom: i < paras.length - 1 ? "14px" : 0 }}>
            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: "var(--navy)" }}>{part}</strong> : part)}
          </p>
        );
      })}
    </div>
  );
}

const css = `
  .sv1 * { margin: 0; padding: 0; box-sizing: border-box; }
  .sv1 {
    --navy: #14284D; --navy-2: #1B355E; --blue: #2F72B6;
    --gold: #F5A623; --gold-2: #FBCB4A; --gold-tint: rgba(245,166,35,.1);
    --teal: #22A38A; --teal-tint: rgba(34,163,138,.1);
    --violet: #6C63FF;
    --paper: #FFFFFF; --paper-2: #FAFAF8;
    --line: rgba(20,40,77,.12); --line-soft: rgba(20,40,77,.06);
    --ink: #14284D; --dim: #5B6478; --dim2: #8B93A3;
    background: var(--paper-2); color: var(--ink);
    font-family: var(--font-instrument), 'Instrument Sans', sans-serif;
    line-height: 1.6; min-height: 100vh; overflow-x: hidden;
  }
  .sv1 h1, .sv1 h2, .sv1 h3 {
    font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif;
    letter-spacing: -.01em;
  }
  .sv1 .meta-bar { padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--dim); background: var(--paper); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 50; }
  .sv1 .tabs { display: flex; gap: 6px; background: var(--paper-2); border: 1px solid var(--line); border-radius: 8px; padding: 4px; }
  .sv1 .tab { padding: 8px 14px; border-radius: 5px; cursor: pointer; font-weight: 600; color: var(--dim); font-size: 12.5px; background: none; border: none; font-family: inherit; }
  .sv1 .tab.active { background: var(--navy); color: #fff; }
  .sv1 .note { max-width: 1000px; margin: 20px auto; background: var(--teal-tint); border: 1px solid rgba(34,163,138,.3); border-radius: 10px; padding: 14px 18px; font-size: 12.5px; color: #155e4f; line-height: 1.6; }
  .sv1 .note b { color: #0d3f35; }
  .sv1 .screen { display: none; }
  .sv1 .screen.active { display: block; }
  .sv1 .cta-primary { display: inline-flex; align-items: center; gap: 8px; background: var(--navy); color: #fff; font-weight: 700; padding: 15px 27px; border-radius: 10px; font-size: 13.5px; border: none; cursor: pointer; font-family: inherit; box-shadow: 0 8px 20px rgba(20,40,77,.18); }
  .sv1 .cta-primary.gold { background: linear-gradient(135deg,var(--gold),var(--gold-2)); color: var(--navy); box-shadow: 0 8px 20px rgba(245,166,35,.28); }
  .sv1 .cta-sub { font-size: 11.5px; color: var(--dim2); margin-top: 10px; letter-spacing: .02em; }
  .sv1 .hp-nav { display: flex; justify-content: space-between; align-items: center; padding: 18px 44px; max-width: 1240px; margin: 0 auto; }
  .sv1 .hp-nav img.logo-h { height: 34px; }
  .sv1 .hp-nav-links { display: flex; gap: 30px; font-size: 13px; font-weight: 600; color: var(--dim); }
  .sv1 .hp-hero { max-width: 1240px; margin: 0 auto; padding: 40px 44px 64px; display: grid; grid-template-columns: 1.05fr .95fr; gap: 56px; align-items: center; }
  .sv1 .hero-tagline { font-size: 13px; font-weight: 700; color: var(--gold); letter-spacing: .02em; margin-bottom: 16px; text-transform: uppercase; }
  .sv1 .hp-badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--gold); color: var(--gold); padding: 6px 13px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-bottom: 14px; letter-spacing: .04em; }
  .sv1 .hp-hero h1 { font-size: 40px; line-height: 1.14; margin-bottom: 18px; color: var(--navy); }
  .sv1 .hp-hero h1 .accent { background: linear-gradient(90deg,var(--gold),var(--teal)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sv1 .hp-hero .sub { font-size: 15.5px; color: var(--dim); margin-bottom: 26px; max-width: 440px; }
  .sv1 .hp-trust-row { display: flex; gap: 22px; flex-wrap: wrap; margin-bottom: 28px; font-size: 12.5px; color: var(--dim); font-weight: 600; }
  .sv1 .hp-trust-row span { display: flex; align-items: center; gap: 6px; }
  .sv1 .hero-visual { position: relative; background: var(--paper); border: 1px solid var(--line); border-radius: 24px; aspect-ratio: 1/1; padding: 32px; box-shadow: 0 20px 50px rgba(20,40,77,.08); display: flex; align-items: center; justify-content: center; margin-bottom: 32px; }
  .sv1 .orbit-svg { width: 78%; max-width: 280px; height: auto; }
  .sv1 .leader { position: absolute; font-size: 11px; font-weight: 700; color: var(--navy); max-width: 128px; line-height: 1.4; background: var(--paper); padding: 9px 12px; border-radius: 9px; border: 1px solid var(--line); box-shadow: 0 4px 12px rgba(20,40,77,.08); }
  .sv1 .lead-1 { top: 24px; left: 50%; transform: translateX(-50%); text-align: center; }
  .sv1 .lead-2 { top: 50%; right: 16px; transform: translateY(-50%); text-align: right; }
  .sv1 .lead-3 { bottom: 24px; left: 50%; transform: translateX(-50%); text-align: center; }
  .sv1 .lead-4 { top: 50%; left: 16px; transform: translateY(-50%); }
  .sv1 .panel-caption { position: absolute; bottom: -32px; left: 0; right: 0; font-size: 10.5px; color: var(--dim2); text-align: center; font-style: italic; }
  .sv1 .hp-trustbar { background: var(--paper); border: 1px solid var(--line); padding: 20px 44px; display: flex; justify-content: center; gap: 44px; flex-wrap: wrap; font-size: 12.5px; color: var(--navy); font-weight: 700; max-width: 1140px; margin: 0 auto; border-radius: 14px; }
  .sv1 .hp-section { max-width: 1040px; margin: 60px auto; padding: 0 44px; text-align: center; }
  .sv1 .hp-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--gold); font-weight: 700; margin-bottom: 12px; }
  .sv1 .hp-section h2 { font-size: 27px; margin-bottom: 12px; color: var(--navy); }
  .sv1 .hp-section .sub { color: var(--dim); font-size: 14px; margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto; }
  .sv1 .pattern-link { display: flex; align-items: stretch; gap: 0; border: 1px solid var(--line); margin-top: 8px; border-radius: 14px; overflow: hidden; background: var(--paper); }
  .sv1 .pattern-node { flex: 1; padding: 28px; text-align: left; }
  .sv1 .pattern-node .pn-label { font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 15px; color: var(--navy); margin-bottom: 8px; }
  .sv1 .pattern-node .pn-desc { font-size: 12px; color: var(--dim); line-height: 1.55; }
  .sv1 .pattern-connector { flex-shrink: 0; width: 120px; position: relative; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg,var(--gold-tint),var(--teal-tint)); }
  .sv1 .pattern-connector::before, .sv1 .pattern-connector::after { content: ""; position: absolute; width: 7px; height: 7px; background: var(--gold); top: 50%; transform: translateY(-50%); border-radius: 50%; }
  .sv1 .pattern-connector::before { left: -3px; }
  .sv1 .pattern-connector::after { right: -3px; background: var(--teal); }
  .sv1 .pattern-connector .mid-label { font-size: 9.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: .03em; text-align: center; padding: 0 8px; line-height: 1.4; }
  .sv1 .hp-icon-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
  .sv1 .hp-icon-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 22px 16px; font-size: 12.5px; font-weight: 700; color: var(--navy); box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .hp-icon-card .emoji { font-size: 22px; margin-bottom: 10px; display: block; }
  .sv1 .hp-steps { display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-top: 20px; }
  .sv1 .hp-step { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 20px 16px; font-size: 12px; text-align: left; box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .hp-step .num { width: 30px; height: 30px; border-radius: 9px; background: linear-gradient(135deg,var(--gold),var(--gold-2)); color: var(--navy); display: flex; align-items: center; justify-content: center; font-weight: 800; font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-size: 13px; margin-bottom: 12px; }
  .sv1 .hp-step b { display: block; font-size: 13.5px; margin-bottom: 5px; color: var(--navy); }
  .sv1 .scroll-viewport { overflow: hidden; margin-top: 20px; border-radius: 14px; }
  .sv1 .scroll-track { display: flex; width: max-content; animation: scrollLeft 32s linear infinite; gap: 14px; }
  .sv1 .scroll-viewport:hover .scroll-track { animation-play-state: paused; }
  .sv1 .hp-test-card { width: 320px; flex-shrink: 0; background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 22px; text-align: left; font-size: 12.5px; box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .stars { color: var(--gold); font-size: 13px; margin-bottom: 12px; letter-spacing: 2px; }
  .sv1 .hp-test-card .quote { font-style: italic; color: var(--ink); margin-bottom: 14px; line-height: 1.65; }
  .sv1 .hp-test-card .who { font-weight: 700; font-size: 12px; color: var(--navy); }
  .sv1 .hp-test-card.pending { background: repeating-linear-gradient(135deg,var(--line-soft),var(--line-soft) 7px,transparent 7px,transparent 14px); }
  .sv1 .pending-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 700; color: var(--dim2); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 10px; }
  @keyframes scrollLeft { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .sv1 .hp-final-cta { max-width: 1140px; margin: 60px auto; background: linear-gradient(135deg,var(--navy),var(--navy-2)); border-radius: 22px; padding: 40px 44px; display: flex; justify-content: space-between; align-items: center; gap: 24px; box-shadow: 0 20px 50px rgba(20,40,77,.25); }
  .sv1 .hp-final-cta .left h3 { font-size: 21px; margin-bottom: 6px; color: #fff; }
  .sv1 .hp-final-cta .left .sub { font-size: 13px; color: rgba(255,255,255,.72); }
  .sv1 .hp-footer { background: var(--navy); color: rgba(255,255,255,.65); padding: 28px 44px; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; flex-wrap: wrap; gap: 12px; }
  .sv1 .hp-footer img { height: 26px; filter: brightness(0) invert(1); }
  .sv1 .hp-footer a { color: rgba(255,255,255,.65); margin-right: 16px; text-decoration: none; }
  .sv1 .assess-wrap { max-width: 620px; margin: 56px auto; padding: 0 24px; }
  .sv1 .journey-bar { display: flex; justify-content: space-between; margin-bottom: 32px; position: relative; }
  .sv1 .journey-bar::before { content: ""; position: absolute; top: 11px; left: 0; right: 0; height: 2px; background: var(--line); z-index: 0; }
  .sv1 .journey-step { position: relative; z-index: 1; text-align: center; flex: 1; }
  .sv1 .journey-dot { width: 22px; height: 22px; border-radius: 50%; background: var(--paper); border: 2px solid var(--line); margin: 0 auto 8px; }
  .sv1 .journey-step.done .journey-dot { background: var(--teal); border-color: var(--teal); }
  .sv1 .journey-step.current .journey-dot { background: var(--gold); border-color: var(--gold); box-shadow: 0 0 0 5px var(--gold-tint); }
  .sv1 .journey-label { font-size: 10.5px; color: var(--dim); font-weight: 700; }
  .sv1 .journey-step.current .journey-label { color: var(--navy); }
  .sv1 .assess-card { background: var(--paper); border: 1px solid var(--line); border-radius: 20px; padding: 32px; box-shadow: 0 12px 32px rgba(20,40,77,.08); }
  .sv1 .assess-card h2 { font-size: 20px; margin-bottom: 8px; color: var(--navy); }
  .sv1 .assess-card .sub { font-size: 13px; color: var(--dim); margin-bottom: 24px; }
  .sv1 .opt-card { border: 1.5px solid var(--line); border-radius: 12px; padding: 16px; margin-bottom: 10px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
  .sv1 .opt-card.selected { border-color: var(--gold); background: var(--gold-tint); }
  .sv1 .opt-card .arrow { opacity: 0; }
  .sv1 .opt-card.selected .arrow { opacity: 1; color: var(--gold); }
  .sv1 .micro-insight { background: var(--teal-tint); border: 1px solid rgba(34,163,138,.3); border-radius: 14px; padding: 17px; margin-bottom: 22px; font-size: 13px; color: #155e4f; }
  .sv1 .micro-insight b { display: block; margin-bottom: 5px; color: #0d3f35; }
  .sv1 .report-wrap { max-width: 960px; margin: 44px auto; padding: 0 24px; }
  .sv1 .detail-num { font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-size: 11px; font-weight: 800; color: var(--gold); letter-spacing: .06em; margin-bottom: 8px; display: block; }
  .sv1 .report-top { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; margin-bottom: 20px; align-items: start; }
  .sv1 .report-head-card { background: linear-gradient(135deg,var(--navy),var(--navy-2)); color: #fff; border-radius: 18px; padding: 32px; box-shadow: 0 16px 36px rgba(20,40,77,.2); }
  .sv1 .report-head-card .eyebrow { font-size: 10.5px; text-transform: uppercase; letter-spacing: .1em; color: var(--gold-2); font-weight: 700; margin-bottom: 12px; }
  .sv1 .report-head-card h1 { font-size: 26px; margin-bottom: 8px; color: #fff; }
  .sv1 .report-head-card .who { font-size: 13.5px; font-weight: 700; color: rgba(255,255,255,.85); margin-bottom: 6px; }
  .sv1 .report-head-card .sub { font-size: 12.5px; color: rgba(255,255,255,.65); margin-bottom: 18px; }
  .sv1 .meta-row { display: flex; gap: 20px; font-size: 11px; color: rgba(255,255,255,.6); border-top: 1px solid rgba(255,255,255,.15); padding-top: 14px; }
  .sv1 .profile-card { background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 28px; box-shadow: 0 8px 20px rgba(20,40,77,.06); }
  .sv1 .profile-card h3 { font-size: 13.5px; margin-bottom: 6px; color: var(--navy); }
  .sv1 .profile-caption { font-size: 10.5px; color: var(--dim2); font-style: italic; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--line); }
  .sv1 .profile-row { padding: 11px 0; border-bottom: 1px solid var(--line-soft); }
  .sv1 .profile-row:last-child { border-bottom: none; }
  .sv1 .profile-row .label { font-size: 12.5px; font-weight: 700; margin-bottom: 3px; color: var(--navy); }
  .sv1 .profile-row .desc { font-size: 11px; color: var(--dim); }
  .sv1 .report-card { background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 28px; margin-bottom: 18px; box-shadow: 0 8px 20px rgba(20,40,77,.06); }
  .sv1 .report-card h3 { font-size: 15px; margin-bottom: 14px; display: flex; align-items: center; gap: 9px; color: var(--navy); }
  .sv1 .recognize-list { list-style: none; }
  .sv1 .recognize-list li { font-size: 13px; padding: 9px 0; border-bottom: 1px solid var(--line-soft); display: flex; gap: 11px; }
  .sv1 .recognize-list li:last-child { border-bottom: none; }
  .sv1 .recognize-list li::before { content: "✓"; color: var(--teal); font-weight: 700; flex-shrink: 0; }
  .sv1 .archetype-reveal { background: linear-gradient(135deg,var(--gold-tint),var(--teal-tint)); border: 1px solid rgba(245,166,35,.3); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 18px; }
  .sv1 .archetype-reveal .label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: #a1731a; font-weight: 700; margin-bottom: 8px; }
  .sv1 .archetype-reveal h2 { font-size: 23px; color: var(--navy); }
  .sv1 .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
  .sv1 .icon-list { list-style: none; }
  .sv1 .icon-list li { display: flex; gap: 11px; font-size: 12.5px; padding: 9px 0; align-items: flex-start; }
  .sv1 .icon-list .ic { font-size: 16px; flex-shrink: 0; }
  .sv1 .remember-box { background: var(--teal-tint); border-radius: 12px; padding: 16px; margin-top: 14px; font-size: 12px; color: #155e4f; }
  .sv1 .remember-box b { display: block; margin-bottom: 5px; color: #0d3f35; }
  .sv1 .tonight-box { background: linear-gradient(135deg,var(--gold-tint),rgba(245,166,35,.05)); border: 1px solid rgba(245,166,35,.3); border-radius: 16px; padding: 28px; margin-bottom: 18px; }
  .sv1 .tonight-box h3 { color: #a1731a; }
  .sv1 .tonight-box ol { padding-left: 20px; font-size: 13px; line-height: 1.85; }
  .sv1 .pull-quote { text-align: center; font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-size: 17px; font-weight: 700; background: linear-gradient(90deg,var(--gold),var(--teal)); -webkit-background-clip: text; background-clip: text; color: transparent; padding: 24px; max-width: 520px; margin: 0 auto 18px; }
  .sv1 .report-cta { text-align: center; padding: 28px; background: var(--paper); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 8px 20px rgba(20,40,77,.06); }
  .sv1 .report-cta .sub { font-size: 12.5px; color: var(--dim); margin-bottom: 16px; }
  .sv1 .report-footnote { text-align: center; font-size: 11px; color: var(--dim2); margin-top: 20px; }
  .sv1 .sell-wrap { max-width: 840px; margin: 44px auto; padding: 0 24px; }
  .sv1 .sell-trust-row { display: flex; justify-content: center; gap: 24px; font-size: 11.5px; color: var(--dim); margin-bottom: 24px; flex-wrap: wrap; font-weight: 600; }
  .sv1 .sell-head h1 { font-size: 26px; margin-bottom: 10px; color: var(--navy); }
  .sv1 .sell-head .sub { font-size: 14px; color: var(--dim); margin-bottom: 16px; }
  .sv1 .sell-icon-row { display: flex; gap: 24px; margin-bottom: 26px; flex-wrap: wrap; }
  .sv1 .sell-icon-row span { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 7px; color: var(--navy); }
  .sv1 .gap-box { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: linear-gradient(135deg,var(--navy),var(--navy-2)); color: #fff; border-radius: 16px; padding: 24px; margin-bottom: 28px; align-items: center; box-shadow: 0 12px 30px rgba(20,40,77,.2); }
  .sv1 .gap-box .left { font-size: 14.5px; font-weight: 700; }
  .sv1 .gap-box .left .highlight { color: var(--gold-2); }
  .sv1 .gap-box .right { font-size: 12.5px; color: rgba(255,255,255,.75); }
  .sv1 .gap-box .right b { display: block; margin-bottom: 3px; color: #fff; }
  .sv1 .week-preview { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 28px; }
  .sv1 .week-card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .week-card.locked { opacity: .55; }
  .sv1 .week-card .wk { font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 11px; color: var(--gold); margin-bottom: 7px; }
  .sv1 .week-card .theme { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--navy); }
  .sv1 .week-card ul { list-style: none; font-size: 10.5px; color: var(--dim); flex: 1; }
  .sv1 .week-tag { font-size: 9.5px; font-weight: 700; padding: 7px 8px; border-radius: 8px; margin-top: 10px; text-align: center; }
  .sv1 .week-tag.wk1 { background: var(--teal-tint); color: #155e4f; }
  .sv1 .week-tag.wk2 { background: rgba(91,100,120,.1); color: var(--dim); }
  .sv1 .week-tag.wk3 { background: var(--gold-tint); color: #a1731a; }
  .sv1 .week-tag.wk4 { background: var(--line); color: var(--dim2); }
  .sv1 .receive-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 28px; }
  .sv1 .receive-item { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 18px; text-align: center; font-size: 12.5px; font-weight: 700; color: var(--navy); box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .receive-item .emoji { font-size: 22px; display: block; margin-bottom: 7px; }
  .sv1 .receive-item .desc { font-weight: 400; color: var(--dim); font-size: 10.5px; margin-top: 5px; }
  .sv1 .example-section { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; margin-bottom: 28px; }
  .sv1 .example-box { display: flex; flex-direction: column; gap: 12px; }
  .sv1 .example-col { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 17px; box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .example-col .tag { font-size: 10.5px; text-transform: uppercase; font-weight: 700; color: var(--dim2); margin-bottom: 7px; }
  .sv1 .example-col p { font-size: 13px; }
  .sv1 .example-col.instead { background: #FEF1EE; border-color: #F5CFC2; }
  .sv1 .example-col.try { background: var(--teal-tint); border-color: rgba(34,163,138,.3); }
  .sv1 .helps-list { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 22px; box-shadow: 0 4px 14px rgba(20,40,77,.05); }
  .sv1 .helps-list h4 { font-size: 13px; margin-bottom: 14px; color: var(--navy); }
  .sv1 .helps-list ul { list-style: none; }
  .sv1 .helps-list li { display: flex; gap: 9px; font-size: 12.5px; padding: 9px 0; align-items: flex-start; }
  .sv1 .price-box { background: linear-gradient(135deg,var(--navy),var(--navy-2)); color: #fff; border-radius: 20px; padding: 32px; text-align: center; margin-bottom: 18px; box-shadow: 0 20px 44px rgba(20,40,77,.28); }
  .sv1 .price-box .price { font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-size: 38px; font-weight: 800; background: linear-gradient(135deg,var(--gold),var(--gold-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sv1 .price-feat-row { display: flex; justify-content: center; gap: 20px; font-size: 11.5px; color: rgba(255,255,255,.7); margin-top: 14px; flex-wrap: wrap; }
  .sv1 .guarantee { font-size: 12px; color: rgba(255,255,255,.65); margin-top: 14px; }
  .sv1 .pay-logos { display: flex; justify-content: center; gap: 10px; margin-top: 16px; font-size: 11px; color: rgba(255,255,255,.5); font-weight: 700; }
  .sv1 .pay-logos span { border: 1px solid rgba(255,255,255,.25); border-radius: 6px; padding: 3px 9px; }
  .sv1 .faq-accordion { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-bottom: 20px; background: var(--paper); }
  .sv1 .faq-acc-item { border-bottom: 1px solid var(--line); }
  .sv1 .faq-acc-item:last-child { border-bottom: none; }
  .sv1 .faq-acc-item summary { padding: 17px 20px; font-size: 13px; font-weight: 700; color: var(--navy); cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .sv1 .faq-acc-item summary::-webkit-details-marker { display: none; }
  .sv1 .acc-icon { font-family: var(--font-bricolage), 'Bricolage Grotesque', sans-serif; font-size: 16px; color: var(--gold); flex-shrink: 0; transition: transform .15s; }
  .sv1 .faq-acc-item[open] .acc-icon { transform: rotate(45deg); }
  .sv1 .acc-body { padding: 0 20px 18px; font-size: 12.5px; color: var(--dim); line-height: 1.6; }
  .sv1 .faq-acc-item.pending .acc-body { font-style: italic; color: var(--dim2); }
  .sv1 .sell-footnote { text-align: center; font-size: 11px; color: var(--dim2); margin-top: 10px; margin-bottom: 30px; }
  .sv1 .live-badge { display: inline-flex; align-items: center; gap: 6px; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; border-radius: 5px; padding: 3px 9px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; }
  .sv1 .live-dot { width: 6px; height: 6px; background: #16a34a; border-radius: 50%; }
  @media (max-width: 860px) {
    .sv1 .hp-nav { padding: 16px 20px; }
    .sv1 .hp-nav-links { display: none; }
    .sv1 .hp-hero { grid-template-columns: 1fr; gap: 40px; padding: 24px 20px 48px; }
    .sv1 .hp-hero h1 { font-size: 29px; }
    .sv1 .hp-section { padding: 0 20px; margin: 48px auto; }
    .sv1 .hp-trustbar { padding: 16px 20px; gap: 14px; flex-direction: column; text-align: center; margin: 0 20px; }
    .sv1 .hero-visual { aspect-ratio: auto; padding: 24px; margin-bottom: 56px; flex-direction: column; align-items: stretch; }
    .sv1 .orbit-svg { max-width: 180px; margin: 0 auto 20px; display: block; }
    .sv1 .leader { position: static; max-width: none; margin: 0 auto 8px; transform: none !important; text-align: center !important; display: block; width: fit-content; }
    .sv1 .panel-caption { position: static; margin-top: 16px; }
    .sv1 .hp-icon-grid, .sv1 .hp-steps { grid-template-columns: 1fr; }
    .sv1 .hp-final-cta { flex-direction: column; text-align: center; padding: 32px 20px; margin: 48px 20px; }
    .sv1 .hp-test-card { width: 260px; }
    .sv1 .pattern-link { flex-direction: column; }
    .sv1 .pattern-connector { width: auto; height: 40px; }
    .sv1 .report-wrap, .sv1 .sell-wrap { padding: 0 16px 80px; margin: 40px auto; }
    .sv1 .report-top { grid-template-columns: 1fr; }
    .sv1 .two-col { grid-template-columns: 1fr; }
    .sv1 .gap-box { grid-template-columns: 1fr; }
    .sv1 .week-preview { grid-template-columns: 1fr; }
    .sv1 .receive-grid { grid-template-columns: 1fr; }
    .sv1 .example-section { grid-template-columns: 1fr; }
    .sv1 .price-box { padding: 28px 20px; }
  }
  @media (max-width: 420px) {
    .sv1 .hp-nav { flex-wrap: wrap; gap: 10px; justify-content: center; }
    .sv1 .hp-nav img.logo-h { height: 28px; }
    .sv1 .hp-nav .cta-primary { padding: 10px 16px; font-size: 12px; width: auto; }
    .sv1 .hp-hero h1 { font-size: 25px; }
    .sv1 .hp-hero .sub { font-size: 14px; }
    .sv1 .cta-primary { padding: 13px 20px; font-size: 13px; width: 100%; justify-content: center; }
    .sv1 .hero-visual { padding: 16px; }
    .sv1 .orbit-svg { max-width: 160px; margin: 0 auto 16px; display: block; }
    .sv1 .hp-section h2 { font-size: 22px; }
    .sv1 .pattern-node { padding: 20px; }
    .sv1 .report-head-card, .sv1 .profile-card, .sv1 .report-card, .sv1 .tonight-box, .sv1 .archetype-reveal, .sv1 .report-cta { padding: 20px; }
    .sv1 .price-box { padding: 22px 16px; }
    .sv1 .price-box .price { font-size: 32px; }
    .sv1 .journey-label { font-size: 9px; }
    .sv1 .journey-bar { margin-bottom: 24px; }
  }
`;

// ─── Attention Advantage Report ──────────────────────────────────────────────
// Full-scroll single-column report page — 7 full-bleed band sections.
// Mock preview (data=null) continues to use SimplifiedFunnelClient tab UI.
function AttentionAdvantageReport({ data }: { data: SimplifiedReportData }) {
  const router = useRouter();
  const c = data.childName;

  const NAVY       = "#14284D";
  const NAVY_GRAD  = "linear-gradient(160deg,#1B3059 0%,#27406E 100%)";
  const GOLD       = "#F5A623";
  const TEAL       = "#137A66";
  const CREAM      = "#FDF9F1";
  const AMBER_BG   = "#FDF1DC";
  const AMBER_TEXT = "#B87308";
  const AMBER_LINE = "#F2DFB8";
  const TEAL_BG    = "#DCECE7";
  const TEAL_LINE  = "#C4E0D7";
  const DIM        = "#5A6472";
  const BF         = "var(--font-bricolage),'Bricolage Grotesque',sans-serif";

  // ── Eyebrow helper ──────────────────────────────────────────────────────────
  const eyebrow = (color = GOLD): React.CSSProperties => ({
    font: "700 10px/1.2 ‘Instrument Sans’,sans-serif",
    letterSpacing: "0.11em",
    textTransform: "uppercase",
    color,
    marginBottom: 12,
  } as React.CSSProperties);

  // ── Snapshot grouping ────────────────────────────────────────────────────────
  const AXIS_TO_DIM: Record<string, string> = {
    Stability:  "friction_response",
    Resistance: "attention_competition",
    Recovery:   "recharge_type",
    Attention:  "attention_shape",
  };
  const weakKeys = new Set(
    (data.weakestTwo ?? []).map(ax => AXIS_TO_DIM[ax]).filter(Boolean)
  );

  const DIMS: { key: string; label: string; val: string; desc: string }[] = [
    { key: "attention_shape",      label: "How they focus",          val: data.dimValues.attention_shape       ?? "", desc: data.profile.attentionShape.desc },
    { key: "attention_competition", label: "What breaks their focus", val: data.dimValues.attention_competition ?? "", desc: data.profile.attentionCompetition.desc },
    { key: "friction_response",    label: "When it gets hard",       val: data.dimValues.friction_response     ?? "", desc: data.profile.frictionResponse.desc },
    { key: "recharge_type",        label: "How they recharge",       val: data.dimValues.recharge_type         ?? "", desc: data.profile.rechargeType.desc },
  ];

  const WHERE: Record<string, Record<string, string>> = {
    attention_shape: {
      "narrow-deep":       "Starting something they can go right into, and staying there.",
      "wide-shifting":     "Starting homework, a new topic, anything unfamiliar.",
      "social-anchored":   "Anything done at the kitchen table rather than alone.",
      "sensation-seeking": "Whatever’s most alive in the room at the time.",
    },
    attention_competition: {
      novelty:  "A thought arriving mid-task, and the page stopping.",
      external: "Screens, a sibling in the room, noise from the next flat.",
      internal: "The moment it stops being interesting, before anything else happens.",
      social:   "Whatever’s going on with the people nearby.",
    },
    friction_response: {
      avoid:              "Whether they step back quietly, before anyone notices.",
      "solo-push":        "Whether they ask, push on, or quietly stop.",
      "support-seek":     "Whether they come and find you, or wait.",
      "emotional-derail": "How long it takes to get back to it after a wobble.",
    },
    recharge_type: {
      "sensory-quiet":           "What the hour after school needs to look like.",
      "social-connection":       "Whether they want company or space after a hard day.",
      "cognitive-displacement":  "What they reach for when they need to switch off.",
      "autonomous-unstructured": "How much of the evening needs to be theirs.",
    },
  };

  const tealDims = DIMS.filter(d => !weakKeys.has(d.key));
  const amberDims = DIMS.filter(d => weakKeys.has(d.key));
  const allOneGroup = tealDims.length === 0 || amberDims.length === 0;
  const N_WORDS = ["", "One", "Two", "Three", "Four"];
  const nWord = N_WORDS[tealDims.length] ?? String(tealDims.length);
  const isAre = tealDims.length === 1 ? "is" : "are";
  const placeWord = amberDims.length === 1 ? "the one place" : "the places";

  const renderDimItem = (d: { key: string; label: string; val: string; desc: string }, amber: boolean) => (
    <div key={d.key} style={{ paddingLeft: 13, borderLeft: `2px solid ${amber ? AMBER_LINE : TEAL_LINE}`, marginLeft: 3, padding: "6px 0 6px 13px", marginBottom: 6 }}>
      <div style={{ font: "700 12px/1.3 ‘Instrument Sans’,sans-serif", color: NAVY, marginBottom: 3 }}>{d.label}</div>
      <div style={{ font: "400 11.5px/1.5 ‘Instrument Sans’,sans-serif", color: DIM, marginBottom: amber ? 4 : 0 }}>{d.desc}</div>
      {d.val && WHERE[d.key]?.[d.val] && (
        <div style={{ font: "italic 400 11px/1.45 ‘Instrument Sans’,sans-serif", color: amber ? AMBER_TEXT : TEAL, marginTop: 4 }}>
          Where you see it: {WHERE[d.key][d.val]}
        </div>
      )}
    </div>
  );

  // ── Attention Fit ────────────────────────────────────────────────────────────
  const SHIFT: Record<string, string> = {
    "The Quick Fixer":  "Count to ten before you offer. Most stalls resolve themselves inside eight seconds.",
    "The Pusher":       "Ask one question before you push — where it got hard, not whether it did.",
    "The Negotiator":   "Decide it once, before the task starts. Then stop discussing it tonight.",
    "The Steady Hand":  "Keep the calm. Just offer the first step when they have not found one in a minute.",
  };
  const shift = SHIFT[data.parentPattern] ?? SHIFT["The Pusher"]!;
  const fitPara = data.detail03Content
    ? fixLoopRefs(data.detail03Content.split(/\n\n+/)[0] ?? data.detail03Content)
    : null;

  return (
    <div style={{ fontFamily: "’Instrument Sans’,system-ui,sans-serif", lineHeight: 1.6, overflowX: "hidden" }}>

      {/* Sticky header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 20px", borderBottom: "1px solid #EFEDE8", background: "rgba(250,250,246,.95)", backdropFilter: "blur(10px)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 28, width: "auto", display: "block" }} />
        <div style={{ font: "700 10px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: "0.11em", textTransform: "uppercase", color: "#646464" }}>Attention Health</div>
      </header>

      {/* §1 Hero — navy */}
      <div style={{ background: NAVY_GRAD }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 20px 32px" }}>
          <div style={eyebrow(GOLD)}>Attention Health · Your report</div>
          <h1 style={{ margin: "0 0 14px", font: `400 clamp(26px,5vw,34px)/1.2 ${BF}`, color: "#fff", letterSpacing: "-0.015em" }}>
            Here&rsquo;s how {c}&rsquo;s attention tends to work
          </h1>
          <p style={{ margin: "0 0 20px", font: "400 16px/1.6 ‘Instrument Sans’,sans-serif", color: "#C3CBD9" }}>
            Based on what you told us, in plain words.
          </p>
          <div style={{ paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.14)", font: "400 13px/1.5 ‘Instrument Sans’,sans-serif", color: "#9FAABE" }}>
            Assessment complete · Age band {data.ageBand}
          </div>
        </div>
      </div>

      {/* §2 Snapshot — cream */}
      <div style={{ background: CREAM }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 20px" }}>
          <div style={eyebrow(TEAL)}>Attention Health Snapshot</div>
          <h2 style={{ margin: "0 0 6px", font: `700 19px/1.25 ${BF}`, color: NAVY }}>Four things we looked at — and where you see them.</h2>
          <div style={{ background: "#fff", border: "1px solid #E4E0D9", borderRadius: 14, padding: "18px 16px", marginTop: 18 }}>
            {allOneGroup ? (
              DIMS.map(d => renderDimItem(d, false))
            ) : (
              <>
                {tealDims.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#21A38A", flexShrink: 0 }} />
                      <div style={{ font: "700 10.5px/1.2 ‘Instrument Sans’,sans-serif", color: TEAL }}>Already working for {c}</div>
                    </div>
                    {tealDims.map(d => renderDimItem(d, false))}
                  </div>
                )}
                {amberDims.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
                      <div style={{ font: "700 10.5px/1.2 ‘Instrument Sans’,sans-serif", color: AMBER_TEXT }}>Where the plan starts</div>
                    </div>
                    {amberDims.map(d => renderDimItem(d, true))}
                  </div>
                )}
              </>
            )}
            {!allOneGroup && (
              <div style={{ background: "#EEF1E7", border: "1px solid #DDE3D0", borderRadius: 10, padding: "10px 13px", marginTop: 14 }}>
                <p style={{ margin: 0, font: "400 11.5px/1.5 ‘Instrument Sans’,sans-serif", color: "#4A5A44" }}>
                  <strong style={{ color: NAVY }}>{nWord} of these {isAre} already working for {c}.</strong> The plan leans on those and opens at {placeWord} attention takes more effort.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* §3 Pattern reveal — navy */}
      <div style={{ background: NAVY }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 20px" }}>
          <div style={eyebrow(GOLD)}>This pattern has a name</div>
          <h2 style={{ margin: "0 0 10px", font: `700 clamp(26px,5vw,34px)/1.15 ${BF}`, color: "#fff", letterSpacing: "-0.015em" }}>
            {data.archetype}
          </h2>
          <div style={{ width: 34, height: 2, background: GOLD, marginBottom: 18 }} />
          {data.patternLine && (
            <p style={{ margin: "0 0 16px", font: "400 15px/1.65 ‘Instrument Sans’,sans-serif", color: "#C3CBD9" }}>
              {data.patternLine}
            </p>
          )}
          {data.meaning.length > 0 && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {data.meaning.map((bullet, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "5px 0" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, flexShrink: 0, marginTop: 8 }} />
                  <span style={{ font: "400 14px/1.6 ‘Instrument Sans’,sans-serif", color: "#C3CBD9" }}>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* §4 Where to start — white */}
      <div style={{ background: "#fff" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 20px" }}>
          <div style={eyebrow(AMBER_TEXT)}>Where to start</div>
          <h2 style={{ margin: "0 0 6px", font: `700 19px/1.25 ${BF}`, color: NAVY }}>
            One place attention takes more effort right now
          </h2>
          <p style={{ margin: "0 0 16px", font: "400 14px/1.55 ‘Instrument Sans’,sans-serif", color: "#646464" }}>
            This is where the six weeks open — rather than starting at something {c} can already do.
          </p>
          {data.frictionPoints[0] && (
            <div style={{ background: AMBER_BG, border: `1px solid ${AMBER_LINE}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ color: "#9FAABE", flexShrink: 0, fontWeight: 700, marginTop: 3 }}>—</span>
              <span style={{ font: "400 15px/1.6 ‘Instrument Sans’,sans-serif", color: "#7A5A16" }}>{data.frictionPoints[0]}</span>
            </div>
          )}
        </div>
      </div>

      {/* §5 Attention Fit — navy */}
      <div style={{ background: NAVY }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 20px" }}>
          <div style={eyebrow(GOLD)}>Your Attention Fit</div>
          <h2 style={{ margin: "0 0 16px", font: `700 20px/1.25 ${BF}`, color: "#fff" }}>
            What {c} needs, and what you naturally do
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ font: "700 9px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9AA7BC", marginBottom: 6 }}>{c} tends to</div>
              <div style={{ font: `700 17px/1.25 ${BF}`, color: "#fff", marginBottom: 4 }}>{data.archetype}</div>
              <p style={{ margin: 0, font: "400 13px/1.55 ‘Instrument Sans’,sans-serif", color: "#C1CAD8" }}>{data.archetypeDesc}</p>
            </div>
            <div style={{ textAlign: "center", font: "700 9px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: ".12em", textTransform: "uppercase", color: GOLD }}>meets</div>
            <div style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ font: "700 9px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: "#9AA7BC", marginBottom: 6 }}>You naturally</div>
              <div style={{ font: `700 17px/1.25 ${BF}`, color: "#fff", marginBottom: 4 }}>{data.parentPattern}</div>
              <p style={{ margin: 0, font: "400 13px/1.55 ‘Instrument Sans’,sans-serif", color: "#C1CAD8" }}>{data.parentInstinctDesc}</p>
            </div>
          </div>
          {fitPara && (
            <div style={{ borderLeft: "2px solid #F5A623", borderRadius: "0 10px 10px 0", background: "rgba(255,255,255,.05)", padding: "12px 14px", marginTop: 14 }}>
              <p style={{ margin: 0, font: "400 13.5px/1.6 ‘Instrument Sans’,sans-serif", color: "#D6DEEA" }}>{fitPara}</p>
            </div>
          )}
          <div style={{ background: AMBER_BG, borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
            <div style={{ font: "700 9px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: AMBER_TEXT, marginBottom: 6 }}>The one shift</div>
            <p style={{ margin: 0, font: "600 13.5px/1.5 ‘Instrument Sans’,sans-serif", color: "#6B5220" }}>{shift}</p>
          </div>
          <p style={{ margin: "12px 0 0", font: "italic 400 12px/1.5 ‘Instrument Sans’,sans-serif", color: "#9AA7BC" }}>
            Every instinct is a good instinct meeting a particular child. Nothing here says you&rsquo;ve been doing it wrong.
          </p>
        </div>
      </div>

      {/* §6 Try Tonight — cream */}
      <div style={{ background: CREAM }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 20px" }}>
          <div style={eyebrow(AMBER_TEXT)}>Try tonight</div>
          <h2 style={{ margin: "0 0 10px", font: `700 22px/1.25 ${BF}`, color: AMBER_TEXT }}>
            {data.tryTonight?.title ?? "Ten quiet minutes"}
          </h2>
          {data.tryTonight?.steps[0] && (
            <p style={{ margin: "0 0 20px", font: "400 14px/1.55 ‘Instrument Sans’,sans-serif", color: "#8A6318" }}>
              {data.tryTonight.steps[0]}
            </p>
          )}
          <div style={{ background: "#fff", border: `1px solid ${AMBER_LINE}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ font: "700 9px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: TEAL, marginBottom: 8 }}>What to say</div>
            <div style={{ font: "italic 400 16px/1.55 ‘Instrument Sans’,sans-serif", color: NAVY }}>{data.tonightSay}</div>
          </div>
          <div>
            <div style={{ font: "700 9px/1.2 ‘Instrument Sans’,sans-serif", letterSpacing: ".1em", textTransform: "uppercase", color: AMBER_TEXT, marginBottom: 8 }}>What to watch for</div>
            <div style={{ font: "400 14px/1.6 ‘Instrument Sans’,sans-serif", color: "#7A5A16" }}>{data.tonightWatch}</div>
          </div>
        </div>
      </div>

      {/* §7 CTA — navy */}
      <div style={{ background: NAVY }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "44px 20px", textAlign: "center" }}>
          <div style={eyebrow(GOLD)}>What to do next</div>
          <h2 style={{ margin: "0 0 14px", font: `400 clamp(22px,4vw,28px)/1.25 ${BF}`, color: "#fff", letterSpacing: "-0.015em" }}>
            See {c}&rsquo;s six-week plan
          </h2>
          <p style={{ margin: "0 auto 26px", maxWidth: 380, font: "400 16px/1.6 ‘Instrument Sans’,sans-serif", color: "#C3CBD9" }}>
            Built around what&rsquo;s already working, opening where it takes the most effort.
          </p>
          <button
            onClick={() => router.push(`/simplified/roadmap?session=${data.sessionId}`)}
            style={{ all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box", textAlign: "center", background: `linear-gradient(135deg,${GOLD},#FBCB4A)`, color: NAVY, font: `700 16px/1.3 ‘Instrument Sans’,sans-serif`, padding: "16px 24px", borderRadius: 12, boxShadow: "0 6px 20px rgba(245,166,35,.35)" }}
          >
            See {c}&rsquo;s six-week plan →
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #EFEDE8", background: "#F3F1EA" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height: 26, width: "auto", display: "block" }} />
          <div style={{ font: "400 14px/1.6 ‘Instrument Sans’,sans-serif", color: "#646464" }}>Made for parents who want to understand, not diagnose.</div>
          <div style={{ font: "400 13px/1.5 ‘Instrument Sans’,sans-serif", color: "#9A9A9A" }}>Attention Architect helps parents understand their child. It is not a medical test and it does not diagnose anything.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", justifyContent: "center", font: "400 14px/1.5 ‘Instrument Sans’,sans-serif" }}>
            <a href="/privacy" style={{ color: NAVY, textDecoration: "none" }}>Privacy Policy</a>
            <a href="/terms" style={{ color: NAVY, textDecoration: "none" }}>Terms of Service</a>
            <a href="mailto:support@thehumandecision.in" style={{ color: NAVY, textDecoration: "none" }}>support@thehumandecision.in</a>
          </div>
          <div style={{ font: "400 13px/1.5 ‘Instrument Sans’,sans-serif", color: "#9A9A9A" }}>© 2026 The Human Decision. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default function SimplifiedFunnelClient({ data }: { data: SimplifiedReportData | null }) {
  const router = useRouter();
  const [active, setActive] = useState<Tab>(data ? "report" : "home");
  const tab = (id: Tab, label: string) => (
    <button className={`tab${active === id ? " active" : ""}`} onClick={() => setActive(id)}>{label}</button>
  );

  // Shorthand: real child name or the mock "Kabir"
  const c = data?.childName ?? "Kabir";
  const archetype = data?.archetype ?? "The All-In Kid";
  const parentPattern = data?.parentPattern ?? "The Quick Fixer";
  const weekTitles = data?.weekTitles ?? ["The Opening Choice", "Screens, The Hardest Domain", "Beyond One Task"];

  const profile = data?.profile ?? {
    attentionShape:      { label: "What draws attention in", desc: "Deeply absorbed in things they choose themselves." },
    attentionCompetition:{ label: "What pulls it away",      desc: "Less-preferred tasks, nearby distractions." },
    frictionResponse:    { label: "Response to friction",    desc: "Returns to a task fairly quickly on their own." },
    rechargeType:        { label: "What helps them recharge",desc: "Diving fully into something else." },
  };

  const archetypeDesc = data?.archetypeDesc ?? "Deep, chosen focus; harder to hold on open-ended or repetitive tasks";
  const parentInstinctDesc = data?.parentInstinctDesc ?? "When something isn’t working, you move fast to find a new approach";

  const metaLabel = data
    ? <><span className="live-badge"><span className="live-dot" />LIVE DATA</span> &nbsp;{c} · {archetype} · session {data.sessionId.slice(0, 8)}&hellip;</>
    : "Simplified funnel variant — v4, real brand · not final copy";

  // Pre-computed for mock JSX — data is narrowed to null after the early return below.
  const aBandText   = data?.ageBand ? `Age band: ${data.ageBand}` : null;
  const d01         = data?.detail01Bullets ?? null;
  const dm01Content = data?.m01Content ?? null;
  const dm01Title   = data?.m01Title ?? null;
  const d03         = data?.detail03Content ?? null;
  const dStrengths  = data?.strengths ?? null;
  const dTryTonight = data?.tryTonight ?? null;
  const dSessionId  = data?.sessionId ?? null;

  // Real session → render the full Attention Advantage report; mock tab UI is design-review only.
  if (data) {
    return <AttentionAdvantageReport data={data} />;
  }

  return (
    <div className="sv1">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {!data && (
        <div className="meta-bar">
          <span>{metaLabel}</span>
          <div className="tabs">
            {tab("home", "1. Homepage")}
            {tab("assess", "2. Assessment")}
            {tab("report", "3. Report")}
            {tab("sell", "4. Roadmap")}
          </div>
        </div>
      )}

      {!data && (
        <div className="note">
          <b>What changed: real brand, not invented.</b> Real logo assets used throughout (nav, hero, footer). Color system rebuilt from the actual logo — navy/blue, warm gold-orange, teal, matching its sunrise/ascent mood — replacing the invented &ldquo;architect blueprint&rdquo; concept, which didn&rsquo;t match the logo&rsquo;s actual warmth. Kept: hairline precision, numbered Detail markers, the parent-instinct relationship diagram. Dropped: corner registration marks, title blocks, &ldquo;drawing sheet&rdquo; framing.
        </div>
      )}

      {/* Persistent nav — outside all screens */}
      <div className="hp-nav">
        <img className="logo-h" src="/aa-logo.png" alt="Attention Architect" />
        <div className="hp-nav-links">
          <span>How It Works</span>
          <span>What is Attention Health?</span>
          <span>For Parents</span>
          <span>FAQs</span>
        </div>
        {!data && <button className="cta-primary" style={{ padding: "11px 20px", fontSize: "12.5px" }}>Take Free Assessment</button>}
      </div>

      {/* ===== HOMEPAGE ===== */}
      <div className={`screen${active === "home" ? " active" : ""}`}>
        <div className="hp-hero">
          <div>
            <div className="hp-badge">◆ For parents of children 8–14</div>
            <div className="hero-tagline">Become the Architect of Your Child&rsquo;s Attention Health</div>
            <h1>Understand your child&rsquo;s attention.<br /><span className="accent">Support their growth.</span></h1>
            <div className="sub">A free, parent-led assessment that helps you understand how your child&rsquo;s attention works in everyday life.</div>
            <div className="hp-trust-row">
              <span>⏱ ~5 minutes</span>
              <span>🙂 Free, parent-led</span>
              <span>◆ Personalized</span>
              <span>◇ No sign-up required</span>
            </div>
            <button className="cta-primary gold">Understand My Child&rsquo;s Attention →</button>
            <div className="cta-sub">FREE · ~5 MINUTES · NO SIGN-UP · NO DIAGNOSIS, NO LABELS</div>
          </div>

          <div className="hero-visual">
            <svg className="orbit-svg" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FBCB4A" stopOpacity=".9" />
                  <stop offset="55%" stopColor="#F5A623" stopOpacity=".35" />
                  <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F5A623" />
                  <stop offset="50%" stopColor="#22A38A" />
                  <stop offset="100%" stopColor="#2F72B6" />
                </linearGradient>
              </defs>
              <circle cx="160" cy="160" r="130" fill="url(#sunGlow)" />
              <circle cx="160" cy="160" r="98" fill="none" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="2 6" opacity=".55" />
              <circle cx="160" cy="160" r="46" fill="#FFFFFF" stroke="#F5A623" strokeWidth="1.5" />
              <circle cx="160" cy="160" r="46" fill="none" stroke="#FFFFFF" strokeWidth="6" />
              <g fill="#14284D" opacity=".85"><circle cx="160" cy="160" r="3" /></g>
              <circle cx="160" cy="14" r="5" fill="#F5A623" />
              <circle cx="306" cy="160" r="5" fill="#22A38A" />
              <circle cx="160" cy="306" r="5" fill="#2F72B6" />
              <circle cx="14" cy="160" r="5" fill="#6C63FF" />
            </svg>
            <div className="leader lead-1">What genuinely captures their focus</div>
            <div className="leader lead-2">What breaks it — and how fast</div>
            <div className="leader lead-3">What happens when things get hard</div>
            <div className="leader lead-4">What actually helps them recharge</div>
            <div className="panel-caption">Four things we look at closely — described in words, never scored or rated</div>
          </div>
        </div>

        <div className="hp-trustbar">
          <span>✓ Not a diagnostic tool</span>
          <span>✓ No labels, no scores</span>
          <span>✓ 100% private</span>
          <span>✓ Built with real families, refined over time</span>
        </div>

        <div className="hp-section">
          <div className="hp-eyebrow">What Makes This Different</div>
          <h2>Most assessments only look at your child.<br />We look at both of you.</h2>
          <div className="sub">Attention isn&rsquo;t something a child manages alone — it&rsquo;s shaped by the relationship between how they focus and how you respond when they struggle. Understanding one without the other only tells half the story.</div>
          <div className="pattern-link">
            <div className="pattern-node">
              <div className="pn-label">Your Child&rsquo;s Pattern</div>
              <div className="pn-desc">How they focus, what pulls them away, how they recover</div>
            </div>
            <div className="pattern-connector"><span className="mid-label">shapes &amp; is shaped by</span></div>
            <div className="pattern-node">
              <div className="pn-label">Your Instinct</div>
              <div className="pn-desc">How you respond when they struggle — and whether that helps or works against their pattern</div>
            </div>
          </div>
          <div className="sub" style={{ marginTop: "24px", marginBottom: 0 }}>Every report includes your own Parent Instinct — not to judge how you parent, but to show you exactly where your instinct and your child&rsquo;s pattern meet.</div>
        </div>

        <div className="hp-section">
          <div className="hp-eyebrow">The Category</div>
          <h2>What is Attention Health?</h2>
          <div className="sub">How your child uses attention in everyday life — at home, at school, during play, and when things get difficult.</div>
          <div className="hp-icon-grid">
            <div className="hp-icon-card"><span className="emoji">📚</span>Can support learning</div>
            <div className="hp-icon-card"><span className="emoji">📝</span>Can support task completion</div>
            <div className="hp-icon-card"><span className="emoji">💬</span>Can support listening &amp; communication</div>
            <div className="hp-icon-card"><span className="emoji">🌱</span>Can support confidence &amp; independence</div>
          </div>
        </div>

        <div className="hp-section">
          <div className="hp-eyebrow">The Process</div>
          <h2>How It Works</h2>
          <div className="hp-steps">
            <div className="hp-step"><div className="num">1</div><b>Answer</b>A few real questions about your child</div>
            <div className="hp-step"><div className="num">2</div><b>Discover</b>We look for patterns in how attention shows up</div>
            <div className="hp-step"><div className="num">3</div><b>Get Insights</b>Your child&rsquo;s Attention Profile, in plain language</div>
            <div className="hp-step"><div className="num">4</div><b>Understand</b>What it means in everyday situations</div>
            <div className="hp-step"><div className="num">5</div><b>Take Action</b>One real thing to try tonight</div>
          </div>
        </div>

        <div className="hp-section">
          <div className="hp-eyebrow">Real Parents</div>
          <h2>What Parents Are Saying</h2>
        </div>
        <div className="scroll-viewport">
          <div className="scroll-track">
            <div className="hp-test-card"><div className="stars">★★★★★</div><div className="quote">&ldquo;A few simple changes reduced the daily arguments, and studying no longer feels like a battle.&rdquo;</div><div className="who">Sandeel Shukla · Parent of a 14-year-old · Raipur</div></div>
            <div className="hp-test-card pending"><div className="pending-tag">◷ Content pending</div><div className="quote">Real quote from Manya Gangele (Indore) — pull verbatim from live site, do not paraphrase.</div><div className="who">Manya Gangele · Indore</div></div>
            <div className="hp-test-card pending"><div className="pending-tag">◷ Content pending</div><div className="quote">Real quote from Suchitra Mehta (Mumbai) — pull verbatim from live site, do not paraphrase.</div><div className="who">Suchitra Mehta · Mumbai</div></div>
            <div className="hp-test-card" aria-hidden="true"><div className="stars">★★★★★</div><div className="quote">&ldquo;A few simple changes reduced the daily arguments, and studying no longer feels like a battle.&rdquo;</div><div className="who">Sandeel Shukla · Parent of a 14-year-old · Raipur</div></div>
            <div className="hp-test-card pending" aria-hidden="true"><div className="pending-tag">◷ Content pending</div><div className="quote">Real quote from Manya Gangele (Indore) — pull verbatim from live site, do not paraphrase.</div><div className="who">Manya Gangele · Indore</div></div>
            <div className="hp-test-card pending" aria-hidden="true"><div className="pending-tag">◷ Content pending</div><div className="quote">Real quote from Suchitra Mehta (Mumbai) — pull verbatim from live site, do not paraphrase.</div><div className="who">Suchitra Mehta · Mumbai</div></div>
          </div>
        </div>

        <div className="hp-final-cta">
          <div className="left">
            <h3>Every child&rsquo;s attention is unique.</h3>
            <div className="sub">Take the first step in less than 5 minutes.</div>
          </div>
          <button className="cta-primary gold">Take the Free Attention Assessment →</button>
        </div>
      </div>

      {/* ===== ASSESSMENT ===== */}
      <div className={`screen${active === "assess" ? " active" : ""}`}>
        <div className="assess-wrap">
          <div className="journey-bar">
            <div className="journey-step done"><div className="journey-dot"></div><div className="journey-label">Getting Started</div></div>
            <div className="journey-step current"><div className="journey-dot"></div><div className="journey-label">Understanding Patterns</div></div>
            <div className="journey-step"><div className="journey-dot"></div><div className="journey-label">Building Profile</div></div>
            <div className="journey-step"><div className="journey-dot"></div><div className="journey-label">Your Insights</div></div>
          </div>
          <div className="micro-insight">
            <b>Interesting — you&rsquo;re already helping us see a pattern.</b>
            Your answers so far suggest your child&rsquo;s attention may work differently depending on the situation. A few more questions will help us see exactly how.
          </div>
          <div className="assess-card">
            <h2>Let&rsquo;s start with what you&rsquo;ve noticed.</h2>
            <div className="sub">What&rsquo;s happening most often?</div>
            <div className="opt-card selected">📚 Homework becomes a battle <span className="arrow">→</span></div>
            <div className="opt-card">🎯 I keep reminding them to focus <span className="arrow">→</span></div>
            <div className="opt-card">📱 Screens easily pull them away <span className="arrow">→</span></div>
            <div className="opt-card">🔄 They start things but don&rsquo;t finish <span className="arrow">→</span></div>
            <div className="opt-card">😤 They give up when things get difficult <span className="arrow">→</span></div>
            <div className="opt-card">🗣️ They seem not to listen <span className="arrow">→</span></div>
            <div className="opt-card">✏️ Something else <span className="arrow">→</span></div>
            <button className="cta-primary" style={{ width: "100%", marginTop: "10px", justifyContent: "center" }}>Continue</button>
          </div>
        </div>
      </div>

      {/* ===== REPORT ===== */}
      <div className={`screen${active === "report" ? " active" : ""}`}>
        <div className="report-wrap">
          <div className="report-top">
            <div className="report-head-card">
              <div className="eyebrow">Attention Health Report</div>
              <h1>{c}&rsquo;s Attention Report</h1>
              <div className="who">A personalized report for {c}</div>
              <div className="meta-row">
                <span>Taken 17 May 2026</span>
                <span>{aBandText ?? "4 min 32 sec"}</span>
              </div>
            </div>
            <div className="profile-card">
              <h3>What we looked at</h3>
              <div className="profile-caption">Described in words below — nothing here is scored or rated</div>
              <div className="profile-row">
                <div className="label">{profile.attentionShape.label}</div>
                <div className="desc">{profile.attentionShape.desc}</div>
              </div>
              <div className="profile-row">
                <div className="label">{profile.attentionCompetition.label}</div>
                <div className="desc">{profile.attentionCompetition.desc}</div>
              </div>
              <div className="profile-row">
                <div className="label">{profile.frictionResponse.label}</div>
                <div className="desc">{profile.frictionResponse.desc}</div>
              </div>
              <div className="profile-row">
                <div className="label">{profile.rechargeType.label}</div>
                <div className="desc">{profile.rechargeType.desc}</div>
              </div>
            </div>
          </div>

          <div className="report-card">
            <span className="detail-num">DETAIL 01</span>
            <h3>What we noticed</h3>
            {d01 && d01.length > 0 ? (
              <ul className="recognize-list">
                {d01.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            ) : dm01Content ? (
              <>
                {dm01Title && (
                  <p style={{ fontSize: "12px", fontStyle: "italic", color: "var(--dim2)", marginBottom: "14px" }}>
                    &ldquo;{dm01Title}&rdquo;
                  </p>
                )}
                <NarrativeProse text={dm01Content} />
              </>
            ) : (
              <ul className="recognize-list">
                <li>Gets deeply absorbed in things {c} chooses themselves</li>
                <li>Homework and less-preferred tasks pull their attention away quickly</li>
                <li>Sounds, movement, and screens nearby tend to break their focus</li>
                <li>Once distracted, they tend to come back to a task fairly quickly on their own</li>
              </ul>
            )}
          </div>

          <div className="archetype-reveal">
            <div className="label">This pattern has a name</div>
            <h2>{archetype}</h2>
          </div>

          <div className="report-card">
            <span className="detail-num">DETAIL 02</span>
            <h3>And something most reports skip — your own instinct</h3>
            <p style={{ fontSize: "12.5px", color: "var(--dim)", marginBottom: "16px" }}>Attention isn&rsquo;t something {c} manages alone. It&rsquo;s shaped by how you respond when they struggle — so we looked at that too.</p>
            <div className="pattern-link" style={{ marginTop: 0 }}>
              <div className="pattern-node">
                <div className="pn-label">{c}&rsquo;s Pattern</div>
                <div className="pn-desc">{archetype} — {archetypeDesc}</div>
              </div>
              <div className="pattern-connector"><span className="mid-label">meets</span></div>
              <div className="pattern-node">
                <div className="pn-label">Your Instinct</div>
                <div className="pn-desc">{parentPattern} — {parentInstinctDesc}</div>
              </div>
            </div>
          </div>

          <div className="report-card">
            <span className="detail-num">DETAIL 03</span>
            <h3>How your instinct meets {c}&rsquo;s pattern</h3>
            {d03 ? (
              <>
                <NarrativeProse text={fixLoopRefs(d03.split(/\n\n+/)[0] ?? d03)} />
                <div className="remember-box" style={{ marginTop: "16px" }}>
                  <b>Worth knowing, not worth worrying about</b>
                  This doesn&rsquo;t mean your instinct is wrong. It means knowing when to hold it back is as useful as knowing when to use it.
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: "12.5px", color: "var(--dim)", marginBottom: "14px" }}>Ten minutes into homework, {c} stalls. Your hand is already reaching for a new approach — &ldquo;let&rsquo;s try it this way instead,&rdquo; &ldquo;maybe do it on the whiteboard,&rdquo; &ldquo;okay, let&rsquo;s take a break and restart.&rdquo; That reflex has saved the day more times than you can count. But here&rsquo;s the catch with {c} specifically: the stall you&rsquo;re seeing usually isn&rsquo;t a sign the approach is wrong — it&rsquo;s the moment right before they lock in. Switch it up here, and you&rsquo;re not fixing the stall. You&rsquo;re resetting the one thing that was about to work.</p>
                <div className="remember-box"><b>Worth knowing, not worth worrying about</b>This doesn&rsquo;t mean your instinct is wrong. It means knowing when to hold it back is as useful as knowing when to use it.</div>
              </>
            )}
          </div>

          <div className="report-card">
            <span className="detail-num">DETAIL 05</span>
            <h3>{c}&rsquo;s strengths</h3>
            {dStrengths && dStrengths.length > 0 ? (
              <ul className="icon-list">
                {dStrengths.slice(0, 2).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            ) : (
              <ul className="icon-list">
                <li><span className="ic">🌱</span>Recovers and returns to a task on their own, without much prompting</li>
                <li><span className="ic">🎯</span>Can go deep and focus hard on things they genuinely care about</li>
              </ul>
            )}
          </div>

          <div className="tonight-box">
            <span className="detail-num">TRY TONIGHT</span>
            {dTryTonight ? (
              <>
                <h3>{dTryTonight.title}</h3>
                <ol>
                  {dTryTonight.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </>
            ) : (
              <>
                <h3>The 10-Minute Task</h3>
                <ol>
                  <li>Pick one small task {c} can finish in about 10 minutes.</li>
                  <li>Set a timer. Minimize obvious distractions nearby.</li>
                  <li>Don&rsquo;t interrupt, remind, or correct — just observe.</li>
                  <li>Notice: what pulls their attention away? What helps them stay? What happens when they get stuck — can they come back on their own?</li>
                </ol>
              </>
            )}
            <p style={{ fontSize: "11.5px", color: "var(--dim)", marginTop: "12px" }}>You&rsquo;re not testing {c}. You&rsquo;re learning how they actually work.</p>
          </div>

          <div className="report-cta">
            <div className="sub">You know what&rsquo;s happening and why. The roadmap is what to change — six weeks, one step at a time.</div>
            <button
              className="cta-primary gold"
              onClick={() => {
                const dest = dSessionId
                  ? `/simplified/roadmap?session=${dSessionId}`
                  : undefined;
                if (dest) router.push(dest);
                else setActive("sell");
              }}
            >
              Explore {c}&rsquo;s Roadmap — ₹2,999 →
            </button>
          </div>

          <div className="report-footnote">This report is for your understanding and guidance only. It is not a diagnostic tool.</div>
        </div>
      </div>

      {/* ===== ROADMAP / SELL ===== */}
      <div className={`screen${active === "sell" ? " active" : ""}`}>
        <div className="sell-wrap">
          <div className="sell-trust-row">
            <span>✓ Not a diagnostic tool</span>
            <span>◆ 100% private and secure</span>
            <span>◇ Designed for parents</span>
          </div>
          <div className="sell-head">
            <h1>Here&rsquo;s how you can support {c}&rsquo;s attention.</h1>
            <div className="sub">Based on {c}&rsquo;s Attention Report, we&rsquo;ve built a personalized roadmap to turn these insights into everyday action.</div>
            <div className="sell-icon-row">
              <span>🧠 Understand what&rsquo;s happening and why</span>
              <span>🎯 Get a step-by-step plan built for {c}</span>
              <span>🌱 Build stronger attention habits over time</span>
            </div>
          </div>

          <div className="gap-box">
            <div className="left">You now know <span className="highlight">WHAT</span> you&rsquo;re seeing.<br />The next question is: <span className="highlight">what do you do about it?</span></div>
            <div className="right"><b>That&rsquo;s what the roadmap is for.</b>A practical, step-by-step plan designed around {c}&rsquo;s own patterns — not a generic course.</div>
          </div>

          <h3 style={{ marginBottom: "16px", color: "var(--navy)" }}>A preview of {c}&rsquo;s roadmap</h3>
          <div className="week-preview">
            <div className="week-card">
              <div className="wk">WEEK 1</div>
              <div className="theme">{weekTitles[0]}</div>
              <ul><li>Real content, live today</li><li>Build the right foundation</li><li>Specific to {archetype}</li></ul>
              <div className="week-tag wk1">Build the right foundation</div>
            </div>
            <div className="week-card">
              <div className="wk">WEEK 2</div>
              <div className="theme">{weekTitles[1]}</div>
              <ul><li>Real content, live today</li><li>Where attention is hardest to hold</li><li>What to do when it slips</li></ul>
              <div className="week-tag wk2">Strengthen focus over time</div>
            </div>
            <div className="week-card">
              <div className="wk">WEEK 3</div>
              <div className="theme">{weekTitles[2]}</div>
              <ul><li>Real content, live today</li><li>Ownership stretched across a routine</li><li>Holding up under real pressure</li></ul>
              <div className="week-tag wk3">Stay on track through friction</div>
            </div>
            <div className="week-card locked">
              <div className="wk">WEEK 4</div><div className="theme">Content not yet written</div>
              <ul><li>Failure-tolerance theme</li></ul>
              <div className="week-tag wk4">Create lasting change</div>
            </div>
          </div>

          <h3 style={{ marginBottom: "16px", color: "var(--navy)" }}>What you&rsquo;ll receive</h3>
          <div className="receive-grid">
            <div className="receive-item"><span className="emoji">🧠</span>{c}&rsquo;s Attention Report<div className="desc">Already generated from the assessment</div></div>
            <div className="receive-item"><span className="emoji">📖</span>Personalized learning modules<div className="desc">Understand what&rsquo;s happening and why</div></div>
            <div className="receive-item"><span className="emoji">🛠️</span>Parent action plan<div className="desc">Specific things to try at home</div></div>
            <div className="receive-item"><span className="emoji">🎯</span>Attention-building activities<div className="desc">Simple, real practices</div></div>
            <div className="receive-item"><span className="emoji">💬</span>Parent scripts<div className="desc">What to say instead of &ldquo;just focus&rdquo;</div></div>
            <div className="receive-item"><span className="emoji">📅</span>Weekly plan<div className="desc">One step at a time, never all at once</div></div>
          </div>

          <h3 style={{ marginBottom: "16px", color: "var(--navy)" }}>From insight to action</h3>
          <div className="example-section">
            <div className="example-box">
              <div className="example-col"><div className="tag">Insight from the report</div><p>{c} tends to lose momentum on repetitive or less-engaging tasks after a short stretch.</p></div>
              <div className="example-col instead"><div className="tag">Instead of</div><p>&ldquo;Finish your homework.&rdquo;</p></div>
              <div className="example-col try"><div className="tag">Try</div><p>&ldquo;Let&rsquo;s finish these three questions first. Then we&rsquo;ll take a short break.&rdquo; Break the task into short blocks with a clear finish point before they start.</p></div>
            </div>
            <div className="helps-list">
              <h4>This roadmap helps you</h4>
              <ul>
                <li>📋 Reduce daily struggles around homework and tasks</li>
                <li>🌱 Build healthier attention habits that last</li>
                <li>💪 Improve focus, confidence, and independence</li>
                <li>❤️ Strengthen your relationship with {c}</li>
              </ul>
            </div>
          </div>

          <div className="price-box">
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", opacity: .85 }}>{c}&rsquo;s Personalized Attention Health Roadmap</div>
            <div className="price">₹2,999</div>
            <div className="price-feat-row"><span>One-time payment</span><span>No hidden fees</span><span>Instant access</span><span>7-day guarantee</span></div>
            <button className="cta-primary gold" style={{ marginTop: "18px" }}>Build {c}&rsquo;s Roadmap — ₹2,999 →</button>
            <div className="guarantee">Secure payment · Instant access · If it&rsquo;s not helping, tell us within 7 days</div>
            <div className="pay-logos"><span>VISA</span><span>Mastercard</span><span>RuPay</span><span>UPI</span></div>
          </div>

          <h3 style={{ marginBottom: "8px", color: "var(--navy)" }}>Frequently asked questions</h3>
          <div className="faq-accordion">
            <details className="faq-acc-item"><summary>Is this a medical or clinical test?<span className="acc-icon">+</span></summary><div className="acc-body">No. Attention Architect is a parent-education and self-discovery tool, not a diagnostic service.</div></details>
            <details className="faq-acc-item"><summary>Who is this for?<span className="acc-icon">+</span></summary><div className="acc-body">Parents of children aged 8–14.</div></details>
            <details className="faq-acc-item"><summary>Does this diagnose ADHD or any condition?<span className="acc-icon">+</span></summary><div className="acc-body">No — and it&rsquo;s not designed to. If something here concerns you clinically, that&rsquo;s worth a conversation with a pediatrician or child psychologist.</div></details>
            <details className="faq-acc-item pending"><summary>How long do I have access? <span className="pending-tag">◷ pending</span><span className="acc-icon">+</span></summary><div className="acc-body">Pull real answer literally from live site.</div></details>
            <details className="faq-acc-item"><summary>Is this the same as the report I already got?<span className="acc-icon">+</span></summary><div className="acc-body">No. The report helped you understand {c}&rsquo;s pattern. The roadmap is what helps you act on it, one week at a time.</div></details>
            <details className="faq-acc-item pending"><summary>What if I need help along the way? <span className="pending-tag">◷ pending</span><span className="acc-icon">+</span></summary><div className="acc-body">Pull real answer literally from live site.</div></details>
          </div>

          <div className="sell-footnote">Attention Architect is a parent-education and guidance platform, not a diagnostic service.</div>
        </div>
      </div>

      {/* Persistent footer — outside all screens */}
      <div className="hp-footer">
        <img src="/aa-logo.png" alt="Attention Architect" />
        <div><a href="#">Privacy Policy</a><a href="#">Terms of Use</a><a href="#">Support</a></div>
        <div>© 2026 · Made with care for parents</div>
      </div>
    </div>
  );
}
