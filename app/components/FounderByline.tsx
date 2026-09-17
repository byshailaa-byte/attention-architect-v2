import type { CSSProperties } from "react";

export type FounderEntry = {
  // Omitted or null → an initials monogram is rendered, never a placeholder image.
  photo?: string | null;
  alt: string;
  name: string;
  role: string;
  nameStyle?: CSSProperties;
  metaStyle?: CSSProperties;
  badge?: { label: string; style: CSSProperties };
};

// Initials for the monogram fallback. Drops honorifics ("Smt.", "Dr.") so
// "Smt. Shashi Agrawal" → "SA".
function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith("."));
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function FounderByline({
  founders,
  size = 56,
  gap = 20,
  innerGap = 14,
  photoBorder,
}: {
  founders: readonly FounderEntry[];
  size?: number;
  gap?: number;
  innerGap?: number;
  photoBorder?: string;
}) {
  return (
    <div style={{ display: "flex", gap, flexWrap: "wrap" }}>
      {founders.map((f) => (
        <div key={f.name} style={{ display: "flex", gap: innerGap, alignItems: "flex-start", flex: "1 1 180px" }}>
          {f.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={f.photo}
              alt={f.alt}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                ...(photoBorder ? { border: photoBorder } : {}),
              }}
            />
          ) : (
            <div
              aria-label={f.alt}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(20,40,77,.08)",
                color: "#14284D",
                fontWeight: 700,
                fontSize: Math.round(size * 0.36),
                ...(photoBorder ? { border: photoBorder } : {}),
              }}
            >
              {initials(f.name)}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={f.nameStyle}>{f.name}</div>
            <div style={f.metaStyle}>{f.role}</div>
            {f.badge && (
              <span style={{ alignSelf: "flex-start", borderRadius: "999px", padding: "3px 10px", ...f.badge.style }}>
                {f.badge.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
