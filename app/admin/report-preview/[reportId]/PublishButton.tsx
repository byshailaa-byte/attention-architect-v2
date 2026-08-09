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
        background:    "rgba(127, 255, 127, 0.15)",
        color:         "#7fff7f",
        border:        "1px solid rgba(127, 255, 127, 0.3)",
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
          background:    blocked ? "rgba(160, 160, 160, 0.15)" : "rgba(52, 80, 63, 0.9)",
          color:         blocked ? "#888" : "#e0fbe8",
          border:        `1px solid ${blocked ? "#555" : "rgba(127, 255, 127, 0.3)"}`,
          letterSpacing: ".04em",
          opacity:       loading ? 0.7 : 1,
          transition:    "opacity 0.15s ease",
        }}
      >
        {loading ? "Publishing…" : blocked ? "Quality failed" : "Publish"}
      </button>
      {error && (
        <span style={{ color: "#ff7f7f", fontSize: "11px" }}>{error}</span>
      )}
    </div>
  );
}
