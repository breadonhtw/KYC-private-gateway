import React, { useMemo, useState, useRef } from "react"; 

import PolicyBanner from "../shared/PolicyBanner";
import RedactionDiff from "../shared/RedactionDiff";
import AuditDrawer from "../shared/AuditDrawer";
import Result from "./Result";

type Entity = { type: string; start: number; end: number; value: string };

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

export default function Compose() {
  const [caseId] = useState(
    () => `case-${Math.random().toString(36).slice(2, 8)}`
  );
  const [text, setText] = useState<string>("");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tokenised, setTokenised] = useState<string>("");
  const [policy, setPolicy] = useState<{
    level: "green" | "amber" | "red";
    reasons: string[];
    requiredActions: string[];
  } | null>(null);

  const textRef = useRef<HTMLTextAreaElement | null>(null);

  const handleReset = () => {
    setText("");
    setEntities([]);
    setTokenised("");
    setPolicy(null);
    setSnippets([]);
    setAnswer("");
    setCitations([]);
    setPrevHash("");
    setShowAudit(false);
    if (textRef.current) textRef.current.focus();
  };
  const [snippets, setSnippets] = useState<
    Array<{ id: string; textSanitised: string; source: string }>
  >([]);
  const [answer, setAnswer] = useState<string>("");
  const [citations, setCitations] = useState<string[]>([]);
  const [prevHash, setPrevHash] = useState<string>("");
  const [loading, setLoading] = useState<
    "analyse" | "tokenise" | "policy" | "search" | "summarise" | null
  >(null);
  const [showAudit, setShowAudit] = useState<boolean>(false);

  const subjectToken = useMemo(() => {
    const m = tokenised.match(/\bSUBJ_[A-Z0-9]{4,}\b/);
    return m ? m[0] : null;
  }, [tokenised]);

  async function callAudit(eventType: string, payload: any) {
    try {
      const r = await fetch(`${API_BASE}/audit/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, eventType, payload, prevHash }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j.hash) setPrevHash(j.hash);
      }
    } catch {
      /* ignore in MVP */
    }
  }

  async function onAnalyse() {
    setLoading("analyse");
    setAnswer("");
    setCitations([]);
    setSnippets([]);
    try {
      const r = await fetch(`${API_BASE}/pii/analyse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      setEntities(j.entities ?? []);
      await callAudit("analyse", {
        textLen: text.length,
        found: j.entities?.length ?? 0,
      });
    } finally {
      setLoading(null);
    }
  }

  async function onTokenise() {
    setLoading("tokenise");
    setAnswer("");
    setCitations([]);
    setSnippets([]);
    try {
      // ensure latest entities
      if (entities.length === 0) await onAnalyse();

      const r = await fetch(`${API_BASE}/pii/tokenise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, entities }),
      });
      const j = await r.json();
      setTokenised(j.tokenisedText ?? "");
      await callAudit("tokenise", {
        preview: (j.tokenisedText ?? "").slice(0, 80),
      });

      // Policy check
      setLoading("policy");
      const policyResponse = await fetch(`${API_BASE}/policy/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenisedText: j.tokenisedText,
          // 🔹 Map PHONE → PHONE_NUMBER for policy engine
          entityTypes: entities.map((e) =>
            e.type === "PHONE" ? "PHONE_NUMBER" : e.type
          ),
        }),
      });

      if (!policyResponse.ok) {
        throw new Error(`Policy check failed: ${policyResponse.status}`);
      }

      const pj = await policyResponse.json();
      setPolicy({
        level: pj.level,
        reasons: pj.reasons ?? [],
        requiredActions: pj.requiredActions ?? [],
      });
      await callAudit("policy", pj);
    } catch (error) {
      console.error("Tokenise/Policy error:", error);
      // Set a fallback policy to green to allow debugging
      setPolicy({
        level: "green",
        reasons: [
          "Fallback: Policy check failed, allowing proceed for debugging",
        ],
        requiredActions: [],
      });
    } finally {
      setLoading(null);
    }
  }

  async function onSearchAndSummarise() {
    console.log("=== SEARCH & SUMMARISE DEBUG ===");
    console.log("subjectToken:", subjectToken);
    console.log("tokenised text:", tokenised);
    console.log("policy level:", policy?.level);
    console.log("API_BASE:", API_BASE);

    if (!subjectToken) {
      console.log("❌ No subject token found");
      console.log(
        "All tokens in text:",
        tokenised.match(/\b[A-Z]+_[A-Z0-9]{4,}\b/g)
      );
      alert("No SUBJ token found. Ensure a person name was tokenised.");
      return;
    }

    console.log("✅ Subject token found:", subjectToken);
    setLoading("search");
    setAnswer("");
    setCitations([]);
    setSnippets([]);

    try {
      console.log("🔍 Starting search request...");
      const searchUrl = `${API_BASE}/search`;
      const searchPayload = { subjectToken };

      console.log("Search URL:", searchUrl);
      console.log("Search payload:", searchPayload);

      const sr = await fetch(searchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchPayload),
      });

      console.log("Search response status:", sr.status);
      console.log("Search response ok:", sr.ok);

      if (!sr.ok) {
        const errorText = await sr.text();
        console.error("❌ Search request failed:", errorText);
        throw new Error(`Search failed: ${sr.status} ${errorText}`);
      }

      const sj = await sr.json();
      console.log("✅ Search response:", sj);

      const snippets = sj.snippets ?? [];
      setSnippets(snippets);
      console.log("📄 Snippets found:", snippets.length);

      await callAudit("search", { got: snippets.length });

      if (snippets.length === 0) {
        console.log("⚠️ No snippets found, skipping summarise");
        setLoading(null);
        return;
      }

      console.log("🤖 Starting summarise request...");
      setLoading("summarise");

      const summariseUrl = `${API_BASE}/summarise`;
      const summarisePayload = { subjectToken, snippets };

      console.log("Summarise URL:", summariseUrl);
      console.log("Summarise payload:", summarisePayload);

      const rr = await fetch(summariseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summarisePayload),
      });

      console.log("Summarise response status:", rr.status);
      console.log("Summarise response ok:", rr.ok);

      if (!rr.ok) {
        const errorText = await rr.text();
        console.error("❌ Summarise request failed:", errorText);
        throw new Error(`Summarise failed: ${rr.status} ${errorText}`);
      }

      const rj = await rr.json();
      console.log("✅ Summarise response:", rj);

      setAnswer(rj.answer ?? "");
      setCitations(rj.citations ?? []);
      await callAudit("summarise", {
        len: (rj.answer ?? "").length,
        cites: rj.citations ?? [],
      });

      console.log("🎉 Search & Summarise completed successfully!");
    } catch (error) {
      console.error("❌ Search & Summarise failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(null);
    }
  }

  const canSend = policy?.level === "green";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Input Section */}
      <section style={{ display: "grid", gap: 10 }}>
        <label htmlFor="prompt" style={{ fontSize: 14, opacity: 0.9 }}>
          Enter analyst prompt:
        </label>
        <textarea
          id="prompt"
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Check adverse media on Tan Mei Ling, NRIC S1234567A, account 12-345-678"
          style={{
            width: "100%",
            minHeight: 100,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #30363d",
            background: "#0e1116",
            color: "#e6edf3",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onAnalyse}
            disabled={loading !== null}
            style={btnStyle}
          >
            {loading === "analyse" ? "Analyzing…" : "Detect PII"}
          </button>
          <button
            onClick={onTokenise}
            disabled={loading !== null}
            style={btnStyle}
          >  
            {loading === "tokenise" || loading === "policy"
              ? "Processing…"
              : "Tokenise & Check"}
          </button>
          <button
            onClick={onSearchAndSummarise}
            disabled={loading !== null || !canSend}
            style={{ ...btnStyle, background: canSend ? "#238636" : "#30363d" }}
          >
            {loading === "search" || loading === "summarise"
              ? "Running…"
              : "Search & Summarise"}
          </button>
          <button
            onClick={() => setShowAudit((s) => !s)}
            style={{ ...btnStyle, background: "#444" }}
          >
            {showAudit ? "Hide Audit" : "Audit"}
          </button>
          <button
            onClick={handleReset}
            disabled={loading !== null}
            style={{ ...btnStyle, background: "#dc2626" }}
          >
            Reset
          </button>
        </div>

        <PolicyBanner policy={policy} />
      </section>

      {/* Conditional Sections - Only show when there's content */}
      {entities.length > 0 && (
        <section style={cardStyle}>
          <h3 style={h3Style}>PII Detection & Redaction</h3>
          <RedactionDiff
            original={text}
            tokenised={tokenised}
            entities={entities}
          />
        </section>
      )}

      {(answer || snippets.length > 0) && (
        <section style={cardStyle}>
          <h3 style={h3Style}>Results</h3>
          <Result answer={answer} citations={citations} snippets={snippets} />
        </section>
      )}

      {showAudit && (
        <section style={cardStyle}>
          <h3 style={h3Style}>Audit Trail</h3>
          <AuditDrawer caseId={caseId} />
        </section>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1f6feb",
  color: "white",
  padding: "8px 12px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
};

const cardStyle: React.CSSProperties = {
  background: "#0e1116",
  border: "1px solid #30363d",
  borderRadius: 8,
  padding: 12,
};

const h3Style: React.CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: 14,
  opacity: 0.9,
};
