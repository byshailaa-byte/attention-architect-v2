"use client";

// Testimonials carousel — auto-advances every 2.5 s, pauses on hover.
// prefers-reduced-motion: auto-advance disabled; dot navigation still works.
// Styling matches the existing card/testimonial design in NarrativeReportView.

import { useState, useEffect, useRef } from "react";

const T = {
  paperDeep: "#E3D9C3",
  surface:   "#FBF9F3",
  ink:       "#201E19",
  inkSoft:   "#5B5648",
  inkFaint:  "#8B8570",
  accent:    "#34503F",
} as const;
const PUBLIC_SANS = "'Public Sans', system-ui, sans-serif";

const TESTIMONIALS = [
  {
    before: "We believed our son just needed more discipline.",
    after:  "This completely changed our perspective. A few simple changes reduced the daily arguments, and studying no longer feels like a battle.",
    who:    "Sandeel Shukla, Parent of a 14-year-old Son · Raipur",
  },
  {
    before: "We thought our son was just being lazy or spending too much time on screens.",
    after:  "This helped us understand what was really happening. Homework became much calmer, and so did our evenings.",
    who:    "Manya Gangele, Parent of an 11-year-old Son · Indore",
  },
  {
    before: "I was constantly reminding my daughter to stay on task.",
    after:  "Small changes in how we approached things at home made a huge difference. She's much more independent now.",
    who:    "Suchitra Mehta, Parent of an 8-year-old Daughter · Mumbai",
  },
];

export function TestimonialsCarousel() {
  const [current, setCurrent]     = useState(0);
  const [visible, setVisible]     = useState(true);
  const [reducedMotion, setRM]    = useState(false);
  const hoveredRef                = useRef(false);

  // Detect prefers-reduced-motion after mount (avoids SSR mismatch)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRM(mq.matches);
    const handler = (e: MediaQueryListEvent) => setRM(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-advance timer: 2.5 s per card, pauses on hover
  useEffect(() => {
    if (reducedMotion) return;

    const id = setInterval(() => {
      if (hoveredRef.current) return;
      // Fade out, advance, fade in
      setVisible(false);
      setTimeout(() => {
        setCurrent(c => (c + 1) % TESTIMONIALS.length);
        setVisible(true);
      }, 180);
    }, 2500);

    return () => clearInterval(id);
  }, [reducedMotion]);

  function goTo(idx: number) {
    if (idx === current) return;
    if (!reducedMotion) {
      setVisible(false);
      setTimeout(() => { setCurrent(idx); setVisible(true); }, 180);
    } else {
      setCurrent(idx);
    }
  }

  const { before, after, who } = TESTIMONIALS[current];

  return (
    <div
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      {/* Card */}
      <div
        style={{
          background:    T.surface,
          border:        `1px solid ${T.paperDeep}`,
          borderRadius:  "12px",
          padding:       "20px 22px",
          opacity:       reducedMotion ? 1 : (visible ? 1 : 0),
          transition:    reducedMotion ? "none" : "opacity 0.18s ease",
          minHeight:     "160px",
        }}
      >
        <div style={{ marginBottom: "14px" }}>
          <div style={{
            fontFamily:    PUBLIC_SANS,
            fontSize:      "10px",
            color:         T.inkFaint,
            fontWeight:    700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            marginBottom:  "6px",
          }}>
            Before
          </div>
          <p style={{
            fontFamily: PUBLIC_SANS,
            fontSize:   "14px",
            color:      T.inkFaint,
            fontStyle:  "italic",
            margin:     0,
            lineHeight: 1.6,
          }}>
            &ldquo;{before}&rdquo;
          </p>
        </div>
        <div style={{
          borderTop:   `1px solid ${T.paperDeep}`,
          paddingTop:  "14px",
          marginBottom: "10px",
        }}>
          <div style={{
            fontFamily:    PUBLIC_SANS,
            fontSize:      "10px",
            color:         T.accent,
            fontWeight:    700,
            textTransform: "uppercase",
            letterSpacing: ".08em",
            marginBottom:  "6px",
          }}>
            After
          </div>
          <p style={{
            fontFamily: PUBLIC_SANS,
            fontSize:   "14px",
            color:      T.ink,
            fontStyle:  "italic",
            margin:     0,
            lineHeight: 1.6,
          }}>
            &ldquo;{after}&rdquo;
          </p>
        </div>
        <div style={{ fontFamily: PUBLIC_SANS, fontSize: "12px", color: T.inkFaint, fontWeight: 600 }}>
          — {who}
        </div>
      </div>

      {/* Dot navigation — always shown; auto-advance only when !reducedMotion */}
      <div style={{
        display:        "flex",
        justifyContent: "center",
        gap:            "10px",
        marginTop:      "20px",
      }}>
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Show testimonial ${i + 1}`}
            style={{
              width:        i === current ? "20px" : "8px",
              height:       "8px",
              borderRadius: "4px",
              background:   i === current ? T.accent : T.paperDeep,
              border:       "none",
              padding:      0,
              cursor:       "pointer",
              transition:   reducedMotion ? "none" : "all 0.2s ease",
              outline:      "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}
