export default function PolicyBanner({
  policy
}: {
  policy: { level: 'green'|'amber'|'red'; reasons: string[]; requiredActions: string[] } | null
}) {
  if (!policy) return null;

  const color = policy.level === 'green' ? '#1f883d' : policy.level === 'amber' ? '#b08200' : '#d1242f';
  const bg = policy.level === 'green' ? '#152a1c' : policy.level === 'amber' ? '#2a220a' : '#2a1315';
  const label = policy.level.toUpperCase();

  return (
    <div style={{
      border: `1px solid ${color}`, background: bg, padding: 12, borderRadius: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <strong>{label}</strong>
      </div>
      {policy.reasons?.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {policy.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
      {policy.requiredActions?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
          Required: {policy.requiredActions.join(', ')}
        </div>
      )}
    </div>
  );
}
