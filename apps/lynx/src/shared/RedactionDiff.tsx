import React from "react";

type Entity = { type: string; start: number; end: number; value: string };

export default function RedactionDiff({
  original,
  tokenised,
  entities,
}: {
  original: string;
  tokenised: string;
  entities: Entity[];
}) {
  // Responsive layout: side-by-side on larger screens, stacked on smaller screens
  const gridColumns = tokenised
    ? "repeat(auto-fit, minmax(300px, 1fr))"
    : "1fr";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridColumns,
        gap: 12,
        width: "100%",
      }}
    >
      {/* Always show original with highlighting if we have entities */}
      <div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
          Original (with PII highlighted)
        </div>
        <CodeBlock>{renderHighlighted(original, entities)}</CodeBlock>
      </div>

      {/* Only show tokenised section if we have tokenised text */}
      {tokenised && (
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Tokenised (privacy-safe)
          </div>
          <CodeBlock>{tokenised}</CodeBlock>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #30363d",
        borderRadius: 6,
        padding: 10,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        whiteSpace: "pre-wrap",
        lineHeight: 1.5,
        fontSize: 12,
        maxHeight: 150,
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
}

function renderHighlighted(text: string, entities: Entity[]) {
  if (!text) return <span style={{ opacity: 0.5 }}>—</span>;
  if (!entities || entities.length === 0) return text;

  const sorted = [...entities].sort((a, b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let idx = 0;

  sorted.forEach((e, i) => {
    if (e.start > idx)
      out.push(<span key={`p-${i}-${idx}`}>{text.slice(idx, e.start)}</span>);
    const color = chipColor(e.type);
    out.push(
      <span
        key={`e-${i}`}
        style={{
          background: color.bg,
          color: color.fg,
          borderRadius: 4,
          padding: "2px 4px",
        }}
      >
        {text.slice(e.start, e.end)}
      </span>
    );
    idx = e.end;
  });
  if (idx < text.length)
    out.push(<span key={`tail-${idx}`}>{text.slice(idx)}</span>);
  return out;
}

function chipColor(type: string) {
  switch (type) {
    case "PERSON_NAME":
      return { bg: "#1f2d3a", fg: "#8ab4f8" };
    case "NRIC":
      return { bg: "#2d1f2a", fg: "#f28b82" };
    case "ACCOUNT_NUMBER":
      return { bg: "#2a2d1f", fg: "#c5e478" };
    default:
      return { bg: "#24292f", fg: "#e6edf3" };
  }
}
