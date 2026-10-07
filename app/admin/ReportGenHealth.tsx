// Admin Overview tile: report-generation health from report_generation_log (phase 52) — the 7-day
// share of LLM-written reports vs the static fallback, plus the fallback reasons. Self-contained
// server component (own query); renders zeros if the table is absent (pre-migration).
import { getSql } from "@/lib/db/client";
import { reportHealth7d } from "@/lib/report-v2/health";

export default async function ReportGenHealth() {
  const h = await reportHealth7d(getSql());
  const warn = h.total >= 5 && h.fallbackPct > 15; // same threshold the daily alert uses
  const pctColor = h.total === 0 ? "#8A93A3" : warn ? "#9B2C2C" : "#1E7A46";

  const box: React.CSSProperties = { background: "#fff", border: "1px solid #EFE8DA", borderRadius: 14, padding: "16px 18px", maxWidth: 520 };
  const label: React.CSSProperties = { fontSize: 12.5, color: "#5B6577" };

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fontWeight: 600, color: "#1B2333" }}>AI-written reports</div>
        <span style={label}>last 7 days</span>
      </div>
      {h.total === 0 ? (
        <div style={label}>No reports generated in the last 7 days.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: pctColor, fontVariantNumeric: "tabular-nums" }}>{h.llmPct}%</div>
              <div style={label}>LLM-written ({h.llm}/{h.total})</div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: pctColor, fontVariantNumeric: "tabular-nums" }}>{h.fallbackPct}%</div>
              <div style={label}>fell back to static ({h.fallback})</div>
            </div>
          </div>
          {h.reasons.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#4A3470" }}>
              <span style={label}>fallback reasons: </span>
              {h.reasons.map((r, i) => (
                <span key={r.reason}>{i > 0 ? " · " : ""}{r.reason} {r.count}</span>
              ))}
            </div>
          )}
          {warn && <div style={{ marginTop: 8, fontSize: 12.5, color: "#9B2C2C", fontWeight: 600 }}>Fallback above 15% — check report generation.</div>}
        </>
      )}
    </div>
  );
}
