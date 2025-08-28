import React, { useEffect, useState } from 'react';

export default function AuditDrawer({ caseId }: { caseId: string }) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // Read the log file via a tiny debug endpoint in the future.
    // For MVP we just show a “mock view” explaining where to find it.
    setLines([
      `Logs are written to server-side JSONL: ./logs/${caseId}.jsonl`,
      `Each line contains: ts, caseId, eventType, payload, prevHash, hash`
    ]);
  }, [caseId]);

  return (
    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1.6 }}>
      {lines.map((l, i) => <div key={i} style={{ opacity: i === 0 ? 1 : 0.8 }}>{l}</div>)}
    </div>
  );
}
