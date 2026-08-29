import type { CSSProperties } from "react";

export type FounderEntry = {
  photo: string;
  alt: string;
  name: string;
  role: string;
  nameStyle?: CSSProperties;
  metaStyle?: CSSProperties;
  badge?: { label: string; style: CSSProperties };
};

export function FounderByline({
  founders,
  size = 56,
  gap = 20,
  innerGap = 14,
  photoBorder,
}: {
  founders: [FounderEntry, FounderEntry];
  size?: number;
  gap?: number;
  innerGap?: number;
  photoBorder?: string;
}) {
  return (
    <div style={{ display: "flex", gap, flexWrap: "wrap" }}>
      {founders.map((f) => (
        <div key={f.name} style={{ display: "flex", gap: innerGap, alignItems: "flex-start", flex: "1 1 180px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
