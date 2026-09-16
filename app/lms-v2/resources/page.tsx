import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { ARTICLES } from "@/content/resources/index";
import ResourcesClient from "@/components/lms-v2/ResourcesClient";

export default async function ResourcesPage() {
  const ctx = await getLmsUserContext();

  return (
    <div style={{ background:"var(--v2-bg)", minHeight:"100dvh", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:9,
      }}>
        <Link href="/lms-v2" style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none" }}>← Home</Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)" }}>Resources</span>
      </div>

      <div style={{ maxWidth:1060, margin:"0 auto", padding:"24px 28px 80px" }}>

        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>The attention library</h1>
        <p style={{ fontSize:14, color:"var(--v2-dim2)", marginBottom:0, lineHeight:1.6 }}>
          Everything about how attention works, in plain language. No jargon, no diagnosis.
        </p>

        <ResourcesClient articles={ARTICLES} childName={ctx.childName} />
      </div>
    </div>
  );
}
