"use client";

import { useState } from "react";
import Link from "next/link";
import type { ResourceArticle, ResourceCategory } from "@/content/resources/types";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

type CategoryChip = { key: string; label: string };
const CHIPS: CategoryChip[] = [
  { key: "all",                 label: "All" },
  { key: "start-here",         label: "Start here" },
  { key: "six-skills",         label: "The six skills" },
  { key: "evening-problems",   label: "Evening problems" },
  { key: "your-pattern",       label: "Your pattern" },
  { key: "difficult-questions", label: "Difficult questions" },
  { key: "shareables",         label: "Shareables" },
];

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  "start-here":          "Start here",
  "six-skills":          "The six skills",
  "evening-problems":    "Evening problems",
  "your-pattern":        "Your pattern",
  "difficult-questions": "Difficult questions",
  "shareables":          "Shareables",
};

const CATEGORY_ORDER: ResourceCategory[] = [
  "start-here", "six-skills", "evening-problems", "your-pattern", "difficult-questions", "shareables",
];

type Props = {
  articles: ResourceArticle[];
  childName: string;
};

export default function ResourcesClient({ articles, childName }: Props) {
  const [query, setQuery]         = useState("");
  const [activeCat, setActiveCat] = useState("all");

  const featured = articles.find(a => a.slug === "what-attention-actually-is") ?? null;

  const filtered = articles.filter(a => {
    if (activeCat !== "all" && a.category !== activeCat) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group remaining non-featured articles by category
  const nonFeatured = filtered.filter(a => a.slug !== "what-attention-actually-is" || activeCat !== "all" || query !== "");
  const byCategory = CATEGORY_ORDER.map(cat => ({
    cat,
    label: CATEGORY_LABELS[cat],
    items: nonFeatured.filter(a => a.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <>
      {/* Search */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, background:"#fff",
        border:"1px solid var(--v2-line)", borderRadius:12, padding:"12px 16px", margin:"16px 0 18px",
      }}>
        <span style={{ fontSize:14, opacity:.5 }}>🔍</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search — screens, homework, sleep, focus, siblings…"
          style={{ border:"none", outline:"none", flex:1, fontSize:14, color:"var(--v2-navy)", background:"transparent", fontFamily:"var(--v2-IS)" }}
        />
      </div>

      {/* Category chips */}
      <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:20 }}>
        {CHIPS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCat(key)}
            className={activeCat === key ? "v2-chip on" : "v2-chip"}
            style={{ border: activeCat === key ? "1px solid var(--v2-navy)" : "1px solid var(--v2-line)" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Featured article */}
      {featured && activeCat === "all" && !query && (
        <div style={{
          background:"linear-gradient(115deg,var(--v2-navy),var(--v2-navy-lt))",
          border:"none", padding:"26px 28px", marginBottom:20, borderRadius:14,
        }}>
          <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"var(--v2-gold-lt)" }}>
            {CATEGORY_LABELS[featured.category]}
          </div>
          <h2 style={{ color:"#fff", fontSize:23, margin:"9px 0 8px", maxWidth:560, lineHeight:1.2 }}>
            {featured.title}
          </h2>
          <p style={{ color:"#B6C4D9", fontSize:14, maxWidth:580, lineHeight:1.6 }}>{featured.summary}</p>
          <Link href={`/lms-v2/resources/${featured.slug}`} style={{
            display:"inline-block", marginTop:15,
            background:"linear-gradient(135deg,var(--v2-gold-lt),var(--v2-gold))",
            color:"var(--v2-navy)", borderRadius:9, padding:"11px 20px",
            fontFamily:BG, fontWeight:700, fontSize:13.5,
          }}>
            Read the guide →
          </Link>
        </div>
      )}

      {/* Category groups */}
      {byCategory.length > 0 && byCategory.map(({ cat, label, items }) => (
        <div key={cat} style={{ marginBottom:26 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:11 }}>
            <h3 style={{ fontSize:16 }}>{label}</h3>
            <span style={{ fontSize:12, color:"var(--v2-dim2)" }}>{items.length} {items.length === 1 ? "article" : "articles"}</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:13 }}>
            {items.map(art => (
              <Link
                key={art.slug}
                href={`/lms-v2/resources/${art.slug}`}
                className={`v2-art${art.shareable ? " share" : ""}`}
                style={{ textDecoration:"none" }}
              >
                <div style={{ fontSize:9.5, letterSpacing:".09em", textTransform:"uppercase", fontWeight:700, color:"#A3781E" }}>
                  {CATEGORY_LABELS[art.category]}
                </div>
                <h4 style={{ fontSize:15, fontWeight:700, margin:"7px 0 6px", lineHeight:1.28 }}>{art.title}</h4>
                <p style={{ fontSize:12.5, color:"var(--v2-dim2)", lineHeight:1.5, flex:1 }}>{art.summary}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, fontSize:11.5, color:"var(--v2-dim2)" }}>
                  {art.readMinutes} min
                  <span style={{ marginLeft:"auto", color:"var(--v2-teal-700)", fontWeight:700 }}>Read →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ padding:"44px 24px", textAlign:"center", color:"var(--v2-dim2)" }}>
          <b style={{ display:"block", fontFamily:BG, fontSize:16, color:"var(--v2-navy)", marginBottom:6 }}>No articles found</b>
          Try a different search term or category.
        </div>
      )}

      {/* If only featured matches and we're on all/no-query — show count */}
      {filtered.length === 1 && filtered[0].slug === "what-attention-actually-is" && activeCat === "all" && !query && (
        <div style={{ fontSize:12.5, color:"var(--v2-dim2)", marginTop:8 }}>
          More articles coming soon. The six attention skills, evening problems, and shareable guides are in progress.
        </div>
      )}
    </>
  );
}
