"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SHASHANK } from "@/lib/founders-data";

type Props = {
  childName: string;
  archetype: string;
  ageBand: string;
  parentPattern: string;
  currentWeek: number;
};

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

export default function V2Sidebar({ childName, archetype, ageBand, currentWeek }: Props) {
  const pathname = usePathname();
  const isHome    = pathname === "/lms-v2";
  const isPlan    = !isHome && pathname.startsWith("/lms-v2/week");
  const isSay     = pathname.startsWith("/lms-v2/what-to-say");
  const isTrack   = pathname.startsWith("/lms-v2/progress");
  const isRes     = pathname.startsWith("/lms-v2/resources");

  const ageBandLabel = ageBand === "10-11" ? "10–11" : ageBand === "12-14" ? "12–14" : ageBand;
  const archetypeShort = archetype.startsWith("The ") ? archetype.slice(4) : archetype;

  const navItem = (active: boolean, href: string, icon: string, label: string, badge?: string) => (
    <Link href={href} style={{
      display:"flex", alignItems:"center", gap:10, width:"100%",
      padding:"8.5px 10px", borderRadius:9, fontSize:13.5, fontWeight: active ? 700 : 500,
      color: active ? "var(--v2-navy)" : "var(--v2-dim)",
      background: active ? "var(--v2-gold-tint)" : "transparent",
      marginBottom:1, textDecoration:"none",
    }}>
      <span style={{ width:16, textAlign:"center", opacity:.7, fontSize:13 }}>{icon}</span>
      {label}
      {badge && (
        <span style={{ marginLeft:"auto", background:"var(--v2-teal-tint)", color:"var(--v2-teal-700)", fontSize:9.5, fontWeight:700, padding:"2px 6px", borderRadius:5, fontFamily:BG }}>
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <aside className="v2-sidebar-el" style={{
      background:"#fff", borderRight:"1px solid var(--v2-line)", padding:"18px 13px",
      height:"100dvh", overflowY:"auto",
    }}>
      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"0 7px 16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-horizontal-icon-wordmark.png" alt="Attention Architect" style={{ height:22 }} />
      </div>

      {/* Child card */}
      <div style={{ background:"var(--v2-navy)", borderRadius:12, padding:"13px 14px", marginBottom:16 }}>
        <div style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"#8FA0BC", fontWeight:600 }}>Your child</div>
        <div style={{ fontFamily:BG, fontSize:19, fontWeight:800, color:"#fff", marginTop:2 }}>{childName}</div>
        <div style={{ display:"flex", gap:5, marginTop:8, flexWrap:"wrap" }}>
          <span style={{ background:"rgba(245,166,35,.18)", color:"var(--v2-gold-lt)", borderRadius:20, padding:"3px 9px", fontSize:10.5, fontWeight:600 }}>
            ◆ {archetypeShort}
          </span>
          <span style={{ background:"rgba(255,255,255,.12)", color:"#C5D2E5", borderRadius:20, padding:"3px 9px", fontSize:10.5, fontWeight:600 }}>
            Age {ageBandLabel}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ marginBottom:8 }}>
        {navItem(isHome,  "/lms-v2",                    "⌂", "Home")}
        {navItem(isPlan,  `/lms-v2/week/${currentWeek}`, "▤", "My Plan")}
        {navItem(isSay,   "/lms-v2/what-to-say",        "❝", "What to Say")}
        {navItem(isTrack, "/lms-v2/progress",           "◴", "Track Progress")}
        {navItem(isRes,   "/lms-v2/resources",          "✦", "Resources")}
      </nav>

      {/* Help card */}
      <div style={{ marginTop:"auto", background:"var(--v2-gold-tint)", border:"1px solid var(--v2-gold-line)", borderRadius:11, padding:13 }}>
        <b style={{ display:"block", fontFamily:BG, fontSize:12.5, color:"var(--v2-navy)" }}>Stuck this week?</b>
        <p style={{ fontSize:11.5, margin:"3px 0 9px", color:"#8A6A28" }}>30 minutes with {SHASHANK.name}, {SHASHANK.role}.</p>
        <a href="#" style={{ display:"block", textAlign:"center", background:"#fff", border:"1px solid var(--v2-gold-line)", borderRadius:8, padding:7, fontSize:12, fontWeight:700, color:"var(--v2-navy)", fontFamily:BG }}>Book a call →</a>
      </div>
    </aside>
  );
}
