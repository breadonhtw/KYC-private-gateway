import React, { useState } from "react";

interface PolicyBanner {
  policy: {
    level: "green" | "amber" | "red";
    reasons: string[];
    requiredActions: string[];
    confidence?: number;
    riskFactors?: string[];
    suggestions?: string[];
  } | null;
}

export default function PolicyBanner({ policy }: PolicyBanner) {
  const [showDetails, setShowDetails] = useState(false);

  if (!policy) return null;

  const color =
    policy.level === "green"
      ? "#1f883d"
      : policy.level === "amber"
      ? "#b08200"
      : "#d1242f";
  const bg =
    policy.level === "green"
      ? "#152a1c"
      : policy.level === "amber"
      ? "#2a220a"
      : "#2a1315";
  const label = policy.level.toUpperCase();

  const hasExtendedInfo =
    policy.confidence !== undefined ||
    (policy.riskFactors && policy.riskFactors.length > 0) ||
    (policy.suggestions && policy.suggestions.length > 0);

  return (
    <div
      style={{
        border: `1px solid ${color}`,
        background: bg,
        padding: 12,
        borderRadius: 10,
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: policy.reasons.length > 0 ? 6 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
            }}
          />
          <strong>{label}</strong>
          {policy.confidence !== undefined && (
            <span
              style={{
                fontSize: 12,
                opacity: 0.8,
                background: "rgba(255,255,255,0.1)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {Math.round(policy.confidence * 100)}% confidence
            </span>
          )}
        </div>

        {hasExtendedInfo && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: `1px solid ${color}`,
              color: "white",
              padding: "4px 8px",
              borderRadius: 4,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        )}
      </div>

      {/* Reasons */}
      {policy.reasons?.length > 0 && (
        <ul style={{ margin: "0 0 8px 0", paddingLeft: 18 }}>
          {policy.reasons.map((reason, i) => (
            <li key={i} style={{ marginBottom: 2 }}>
              {reason}
            </li>
          ))}
        </ul>
      )}

      {/* Required Actions */}
      {policy.requiredActions?.length > 0 && (
        <div
          style={{
            marginBottom: showDetails ? 8 : 0,
            fontSize: 13,
            opacity: 0.9,
            fontWeight: 500,
          }}
        >
          <strong>Required:</strong> {policy.requiredActions.join(", ")}
        </div>
      )}

      {/* Extended Details */}
      {showDetails && hasExtendedInfo && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid rgba(255,255,255,0.2)`,
            fontSize: 13,
          }}
        >
          {/* Risk Factors */}
          {policy.riskFactors && policy.riskFactors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 500, marginBottom: 4, opacity: 0.9 }}>
                🚨 Risk Factors:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.8 }}>
                {policy.riskFactors.map((risk, i) => (
                  <li key={i}>{risk.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {policy.suggestions && policy.suggestions.length > 0 && (
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4, opacity: 0.9 }}>
                💡 Suggestions:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.8 }}>
                {policy.suggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
