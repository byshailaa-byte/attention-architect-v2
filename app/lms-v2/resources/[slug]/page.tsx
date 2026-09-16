import { notFound } from "next/navigation";
import Link from "next/link";
import { getLmsUserContext } from "@/lib/lms/user-context";
import { getArticle } from "@/content/resources/index";
import { renderResourceMarkdown } from "@/lib/resources/render";

const BG = `var(--font-bricolage),'Bricolage Grotesque',sans-serif`;

const CATEGORY_LABELS: Record<string, string> = {
  "start-here":          "Start here",
  "six-skills":          "The six skills",
  "evening-problems":    "Evening problems",
  "your-pattern":        "Your pattern",
  "difficult-questions": "Difficult questions",
  "shareables":          "Shareables",
};

type Props = { params: Promise<{ slug: string }> };

export default async function ResourceArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  // Auth check — ensures only logged-in users see resources
  await getLmsUserContext();

  const bodyHtml = renderResourceMarkdown(article.body);
  const shortTitle = article.title.length > 50 ? article.title.slice(0, 50) + "…" : article.title;
  const catLabel = CATEGORY_LABELS[article.category] ?? article.category;

  return (
    <div style={{ background:"var(--v2-bg)", minHeight:"100dvh", fontFamily:"var(--v2-IS)", color:"var(--v2-dim)" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid var(--v2-line)", padding:"12px 28px",
        display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:9,
      }}>
        <Link href="/lms-v2/resources" style={{ fontSize:12.5, fontWeight:600, color:"var(--v2-dim2)", textDecoration:"none", whiteSpace:"nowrap" }}>
          ← The attention library
        </Link>
        <span style={{ fontSize:12.5, color:"var(--v2-dim2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          Resources &rsaquo; {shortTitle}
        </span>
      </div>

      <div style={{ maxWidth:740, margin:"0 auto", padding:"14px 28px 80px" }}>

        <div className="v2-card" style={{ padding:"30px 34px", marginTop:14 }}>

          {/* Kicker */}
          <div style={{ fontSize:10.5, letterSpacing:".1em", textTransform:"uppercase", fontWeight:700, color:"#A3781E" }}>
            {catLabel}
          </div>

          {/* Title */}
          <h1 style={{ fontSize:28, lineHeight:1.15, margin:"9px 0 10px" }}>
            {article.title}
          </h1>

          {/* Meta */}
          <div style={{
            fontSize:12.5, color:"var(--v2-dim2)",
            paddingBottom:18, borderBottom:"1px solid var(--v2-line)", marginBottom:20,
          }}>
            {article.readMinutes} min read
            {article.updatedAt && ` · Updated ${article.updatedAt}`}
          </div>

          {/* Body */}
          <div
            className="v2-prose"
            style={{ fontSize:15, lineHeight:1.72 }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* Share bar */}
          <div style={{
            display:"flex", gap:9, marginTop:24, paddingTop:20,
            borderTop:"1px solid var(--v2-line)", flexWrap:"wrap",
          }}>
            <button style={{
              border:"none", borderRadius:9, padding:"10px 16px", fontSize:12.5,
              fontWeight:600, color:"#fff", background:"var(--v2-teal)", cursor:"pointer", fontFamily:"var(--v2-IS)",
            }}>
              Copy link
            </button>
            <button style={{
              border:"1px solid var(--v2-line)", borderRadius:9, padding:"10px 16px", fontSize:12.5,
              fontWeight:600, color:"var(--v2-navy)", background:"#fff", cursor:"pointer", fontFamily:"var(--v2-IS)",
            }}>
              Share via WhatsApp
            </button>
            <button style={{
              border:"1px solid var(--v2-line)", borderRadius:9, padding:"10px 16px", fontSize:12.5,
              fontWeight:600, color:"var(--v2-navy)", background:"#fff", cursor:"pointer", fontFamily:"var(--v2-IS)",
            }}>
              Email to yourself
            </button>
          </div>
        </div>

        <div style={{ marginTop:18, fontSize:13, color:"var(--v2-dim2)" }}>
          <Link href="/lms-v2/resources" style={{ color:"var(--v2-teal-700)", fontWeight:600, textDecoration:"none" }}>
            ← Back to the attention library
          </Link>
        </div>
      </div>
    </div>
  );
}
