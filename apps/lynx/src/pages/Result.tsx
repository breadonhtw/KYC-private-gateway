import React from 'react';

export default function Result({
  answer,
  citations,
  snippets
}: {
  answer: string;
  citations: string[];
  snippets: Array<{id:string;textSanitised:string;source:string}>;
}) {
  if (!answer && (!snippets || snippets.length === 0)) {
    return <p style={{ opacity: 0.7 }}>No result yet. Run “Search & Summarise”.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {answer && (
        <div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Summary</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{answer}</div>
        </div>
      )}
      {citations?.length > 0 && (
        <div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Citations</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {citations.map((c, i) => <li key={i} style={{ lineHeight: 1.6 }}>{c}</li>)}
          </ul>
        </div>
      )}
      {snippets?.length > 0 && (
        <div>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>Evidence</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {snippets.map(s => (
              <li key={s.id} style={{ lineHeight: 1.6 }}>
                <span style={{ opacity: 0.8 }}>{s.textSanitised}</span>
                <div style={{ fontSize: 12, opacity: 0.6 }}>source: {s.source}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
