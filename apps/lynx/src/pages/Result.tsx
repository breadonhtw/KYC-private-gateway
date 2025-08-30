import React from "react";

export default function Result({
  answer,
  citations,
  snippets,
}: {
  answer: string;
  citations: string[];
  snippets: Array<{ id: string; textSanitised: string; source: string }>;
}) {
  if (!answer && (!snippets || snippets.length === 0)) {
    return (
      <p style={{ opacity: 0.7, margin: 0, fontSize: 14 }}>
        No result yet. Run "Search & Summarise".
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {answer && (
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Summary
          </div>
          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
              fontSize: 14,
              padding: 10,
              background: "#0a0c10",
              borderRadius: 6,
              border: "1px solid #21262d",
              maxHeight: 200,
              overflow: "auto",
            }}
          >
            {answer}
          </div>
        </div>
      )}

      {citations?.length > 0 && (
        <details>
          <summary
            style={{
              opacity: 0.8,
              cursor: "pointer",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            Citations ({citations.length})
          </summary>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 16, fontSize: 12 }}>
            {citations.map((c, i) => (
              <li key={i} style={{ lineHeight: 1.5, marginBottom: 4 }}>
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}

      {snippets?.length > 0 && (
        <details>
          <summary
            style={{
              opacity: 0.8,
              cursor: "pointer",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            Evidence ({snippets.length} items)
          </summary>
          <div
            style={{ margin: "6px 0 0 0", maxHeight: 160, overflow: "auto" }}
          >
            {snippets.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 8,
                  margin: "6px 0",
                  background: "#0a0c10",
                  borderRadius: 4,
                  border: "1px solid #21262d",
                }}
              >
                <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 4 }}>
                  {s.textSanitised}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>→ {s.source}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
