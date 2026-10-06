"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  reportId: string;
  initialStatus: string;
  qualityPassed: boolean | null;
};

export function PublishButton({ reportId, initialStatus, qualityPassed }: Props) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [promoted, setPromoted] = useState(initialStatus === "published");

  if (promoted) {
    return (
      <span style={{
        padding:       "6px 14px",
        borderRadius:  "6px",
        fontSize:      "12px",
        fontWeight:    700,
        background:    "#EAF0EA",
        color:         "#2F5D3A",
        border:        "1px solid rgba(47, 93, 58, 0.3)",
        letterSpacing: ".04em",
      }}>
        ✓ Published
      </span>
    );
  }

  // Block the button if quality failed (quality_passed = false, not null).
  const blocked = qualityPassed === false;

  async function handlePublish() {
    if (loading || blocked) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/report/${reportId}/promote`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Promote failed");
      } else {
        setPromoted(true);
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button
        onClick={handlePublish}
        disabled={loading || blocked}
        title={blocked ? "Quality checks failed — regenerate first" : undefined}
        style={{
          padding:       "6px 16px",
          borderRadius:  "6px",
          fontSize:      "12px",
          fontWeight:    700,
          cursor:        loading || blocked ? "not-allowed" : "pointer",
          background:    blocked ? "rgba(27, 35, 51, 0.06)" : "#2F5D3A",
          color:         blocked ? "#8A93A3" : "#FFFFFF",
          border:        `1px solid ${blocked ? "#E6DECF" : "rgba(47, 93, 58, 0.5)"}`,
          letterSpacing: ".04em",
          opacity:       loading ? 0.7 : 1,
          transition:    "opacity 0.15s ease",
        }}
      >
        {loading ? "Publishing…" : blocked ? "Quality failed" : "Publish"}
      </button>
      {error && (
        <span style={{ color: "#9B2C2C", fontSize: "11px" }}>{error}</span>
      )}
    </div>
  );
}
