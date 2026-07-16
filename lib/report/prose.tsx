import React from "react";

// Renders a string with minimal markdown: **bold**, *italic*, [[MISSING: ...]] highlights.
// Paragraphs are split on double-newline. Lines starting with "- " become list items.
export function Prose({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className={className} style={style}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^[-•] /.test(l) || l.trim() === "");
        if (isList) {
          const items = lines.filter((l) => /^[-•] /.test(l));
          return (
            <ul key={i} className="list-disc pl-5 space-y-1 mb-3">
              {items.map((item, j) => (
                <li key={j}>{inlineNodes(item.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mb-3">
            {inlineNodes(block)}
          </p>
        );
      })}
    </div>
  );
}

export function inlineNodes(text: string): React.ReactNode[] {
  // Split on **bold**, *italic*, [[MISSING: ...]]
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\[MISSING:[^\]]+\]\])/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("[[MISSING:"))
      return (
        <span
          key={i}
          style={{
            background: "#ffd6d0",
            color: "#8b1a0e",
            borderRadius: 3,
            padding: "1px 4px",
            fontSize: "0.85em",
            fontFamily: "monospace",
          }}
        >
          {part}
        </span>
      );
    return part;
  });
}
