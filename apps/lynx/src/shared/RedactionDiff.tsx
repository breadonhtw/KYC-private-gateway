import React from 'react';

type Entity = { type: string; start: number; end: number; value: string };

export default function RedactionDiff({
  original,
  tokenised,
  entities
}: {
  original: string;
  tokenised: string;
  entities: Entity[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Original</div>
        <CodeBlock>{renderHighlighted(original, entities)}</CodeBlock>
      </div>
      <div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Outbound (tokenised)</div>
        <CodeBlock>{tokenised || <span style={{ opacity: 0.5 }}>—</span>}</CodeBlock>
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid #30363d', borderRadius: 10, padding: 12,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6
    }}>
      {children}
    </div>
  );
}

function renderHighlighted(text: string, entities: Entity[]) {
  if (!text) return <span style={{ opacity: 0.5 }}>—</span>;
  if (!entities || entities.length === 0) return text;

  const sorted = [...entities].sort((a,b) => a.start - b.start);
  const out: React.ReactNode[] = [];
  let idx = 0;

  sorted.forEach((e, i) => {
    if (e.start > idx) out.push(<span key={`p-${i}-${idx}`}>{text.slice(idx, e.start)}</span>);
    const color = chipColor(e.type);
    out.push(
      <span key={`e-${i}`} style={{ background: color.bg, color: color.fg, borderRadius: 6, padding: '0 4px' }}>
        {text.slice(e.start, e.end)}
      </span>
    );
    idx = e.end;
  });
  if (idx < text.length) out.push(<span key={`tail-${idx}`}>{text.slice(idx)}</span>);
  return out;
}

function chipColor(type: string) {
  switch (type) {
    case 'PERSON_NAME': return { bg: '#1f2d3a', fg: '#8ab4f8' };
    case 'NRIC': return { bg: '#2d1f2a', fg: '#f28b82' };
    case 'ACCOUNT_NUMBER': return { bg: '#2a2d1f', fg: '#c5e478' };
    default: return { bg: '#24292f', fg: '#e6edf3' };
  }
}
