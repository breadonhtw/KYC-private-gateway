import React, { useMemo, useState } from 'react';
import PolicyBanner from '../shared/PolicyBanner';
import RedactionDiff from '../shared/RedactionDiff';
import AuditDrawer from '../shared/AuditDrawer';
import Result from './Result';

type Entity = { type: string; start: number; end: number; value: string };

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000';

export default function Compose() {
  const [caseId] = useState(() => `case-${Math.random().toString(36).slice(2, 8)}`);
  const [text, setText] = useState<string>('');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tokenised, setTokenised] = useState<string>('');
  const [policy, setPolicy] = useState<{ level: 'green'|'amber'|'red'; reasons: string[]; requiredActions: string[] } | null>(null);
  const [snippets, setSnippets] = useState<Array<{id:string;textSanitised:string;source:string}>>([]);
  const [answer, setAnswer] = useState<string>('');
  const [citations, setCitations] = useState<string[]>([]);
  const [prevHash, setPrevHash] = useState<string>('');
  const [loading, setLoading] = useState<'analyse'|'tokenise'|'policy'|'search'|'summarise'|null>(null);
  const [showAudit, setShowAudit] = useState<boolean>(false);

  const subjectToken = useMemo(() => {
    const m = tokenised.match(/\bSUBJECT_[A-Z0-9]{4,}\b/);
    return m ? m[0] : null;
  }, [tokenised]);

  async function callAudit(eventType: string, payload: any) {
    try {
      const r = await fetch(`${API_BASE}/audit/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, eventType, payload, prevHash }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j.hash) setPrevHash(j.hash);
      }
    } catch { /* ignore in MVP */ }
  }

  async function onAnalyse() {
    setLoading('analyse');
    setAnswer(''); setCitations([]); setSnippets([]);
    try {
      const r = await fetch(`${API_BASE}/pii/analyse`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const j = await r.json();
      setEntities(j.entities ?? []);
      await callAudit('analyse', { textLen: text.length, found: j.entities?.length ?? 0 });
    } finally {
      setLoading(null);
    }
  }

  async function onTokenise() {
    setLoading('tokenise');
    setAnswer(''); setCitations([]); setSnippets([]);
    try {
      // ensure latest entities
      if (entities.length === 0) await onAnalyse();

      const r = await fetch(`${API_BASE}/pii/tokenise`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, entities })
      });
      const j = await r.json();
      setTokenised(j.tokenisedText ?? '');
      await callAudit('tokenise', { preview: (j.tokenisedText ?? '').slice(0, 80) });

      // Policy check
      setLoading('policy');
      const p = await fetch(`${API_BASE}/policy/check`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenisedText: j.tokenisedText ?? '',
          entityTypes: entities.map(e => e.type)
        })
      });
      const pj = await p.json();
      setPolicy({ level: pj.level, reasons: pj.reasons ?? [], requiredActions: pj.requiredActions ?? [] });
      await callAudit('policy', pj);
    } finally {
      setLoading(null);
    }
  }

  async function onSearchAndSummarise() {
    if (!subjectToken) {
      alert('No SUBJECT_ token found. Ensure a person name was tokenised (SUBJECT_XXXX).');
      return;
    }
    setLoading('search');
    setAnswer(''); setCitations([]); setSnippets([]);

    try {
      const sr = await fetch(`${API_BASE}/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectToken })
      });
      const sj = await sr.json();
      setSnippets(sj.snippets ?? []);
      await callAudit('search', { got: (sj.snippets ?? []).length });

      setLoading('summarise');
      const rr = await fetch(`${API_BASE}/summarise`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectToken, snippets: sj.snippets ?? [] })
      });
      const rj = await rr.json();
      setAnswer(rj.answer ?? '');
      setCitations(rj.citations ?? []);
      await callAudit('summarise', { len: (rj.answer ?? '').length, cites: rj.citations ?? [] });
    } finally {
      setLoading(null);
    }
  }

  const canSend = policy?.level === 'green';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ display: 'grid', gap: 12 }}>
        <label htmlFor="prompt" style={{ fontSize: 14, opacity: 0.9 }}>Enter analyst prompt (raw):</label>
        <textarea
          id="prompt"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`e.g. Check adverse media on Tan Mei Ling, NRIC S1234567A, account 12-345-678`}
          style={{
            width: '100%', minHeight: 140, padding: 12, borderRadius: 10, border: '1px solid #30363d',
            background: '#0e1116', color: '#e6edf3', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onAnalyse} disabled={loading !== null}
            style={btnStyle}>{loading === 'analyse' ? 'Analyzing…' : 'Detect PII'}</button>
          <button onClick={onTokenise} disabled={loading !== null}
            style={btnStyle}>{loading === 'tokenise' || loading === 'policy' ? 'Tokenising…' : 'Tokenise & Check'}</button>
          <button onClick={onSearchAndSummarise} disabled={loading !== null || !canSend}
            style={{ ...btnStyle, background: canSend ? '#238636' : '#30363d' }}>
              {loading === 'search' || loading === 'summarise' ? 'Running…' : 'Search & Summarise'}
          </button>
          <button onClick={() => setShowAudit(s => !s)} style={{ ...btnStyle, background: '#444' }}>
            {showAudit ? 'Hide Audit' : 'Show Audit'}
          </button>
        </div>

        <PolicyBanner policy={policy} />
      </section>

      <section style={cardStyle}>
        <h3 style={h3Style}>Redaction Diff</h3>
        <RedactionDiff original={text} tokenised={tokenised} entities={entities} />
      </section>

      <section style={cardStyle}>
        <h3 style={h3Style}>LLM Result</h3>
        <Result answer={answer} citations={citations} snippets={snippets} />
      </section>

      {showAudit && (
        <section style={cardStyle}>
          <h3 style={h3Style}>Audit</h3>
          <AuditDrawer caseId={caseId} />
        </section>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#1f6feb', color: 'white', padding: '10px 14px', border: 'none', borderRadius: 8, cursor: 'pointer'
};

const cardStyle: React.CSSProperties = {
  background: '#0e1116', border: '1px solid #30363d', borderRadius: 12, padding: 16
};

const h3Style: React.CSSProperties = { margin: '0 0 10px 0', fontSize: 16, opacity: 0.9 };
