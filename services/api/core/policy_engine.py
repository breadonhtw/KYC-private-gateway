import os, httpx, asyncio, json
import re, yaml
from typing import Dict, List, Any

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "infra", "policy.rules.yaml")

# Load existing rules for context
with open(RULES_PATH, "r") as f:
    RULES = yaml.safe_load(f)

# Keep some critical regex patterns for immediate blocking
RAW_BLOCK_RX = {"ACCOUNT_NUMBER": re.compile(r"\b\d{3}[- ]?\d{3}[- ]?\d{3,}\b")}

POLICY_ASSESSMENT_PROMPT = """You are a privacy and compliance policy engine for a financial institution's KYC system.

Your task is to assess whether tokenised text is safe to process based on:
1. Whether sensitive PII has been properly tokenised/redacted
2. Compliance with data protection regulations
3. Risk assessment for downstream processing

CONTEXT:
- Original text contained these entity types: {entity_types}
- Text after tokenisation: "{tokenised_text}"
- Tokens follow format like SUBJ_A1B2, NRIC_X9Y8, etc.
- Institution policy rules: {policy_rules}

ASSESSMENT CRITERIA:
🔴 RED (Block processing):
- Raw account numbers, credit card numbers, or other financial identifiers still present
- Untokenised government IDs (NRIC, passport numbers, SSN)
- Raw personal data that violates regulations
- Critical PII leakage that could cause regulatory violations

🟡 AMBER (Requires justification):
- Indirect identifiers present (job titles, addresses, company names)
- Partially tokenised but still potentially identifiable information
- Medium-risk scenarios requiring analyst approval
- Context that might allow re-identification when combined

🟢 GREEN (Safe to proceed):
- All sensitive PII properly tokenised
- Only anonymous tokens and generic context remain
- Compliant with data protection requirements
- Safe for downstream LLM processing

Respond with JSON only:
{{
  "level": "green|amber|red",
  "confidence": 0.0-1.0,
  "reasons": ["specific reason 1", "specific reason 2"],
  "requiredActions": ["action1", "action2"],
  "riskFactors": ["factor1", "factor2"],
  "suggestions": ["suggestion1", "suggestion2"]
}}
"""

async def _call_openai_policy(prompt: str) -> dict:
    """Call OpenAI API for policy assessment"""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    body = {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,  # Low temperature for consistent policy decisions
        "response_format": {"type": "json_object"}
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
        return json.loads(data["choices"][0]["message"]["content"])

def check_policy_llm(tokenised_text: str, entity_types: list[str], ctx: dict) -> dict:
    """
    LLM-based policy engine that dynamically assesses privacy/compliance risks
    """
    
    # First, run critical regex checks for immediate blocking
    for name, rx in RAW_BLOCK_RX.items():
        if rx.search(tokenised_text):
            return {
                "level": "red",
                "confidence": 1.0,
                "reasons": [f"Raw {name} detected - immediate block required"],
                "requiredActions": ["remove_sensitive_data", "re_tokenise"],
                "riskFactors": ["regulatory_violation", "pii_leakage"],
                "suggestions": ["Ensure all account numbers are properly tokenised before processing"]
            }
    
    # If no OpenAI API key, fall back to enhanced rule-based system
    if not OPENAI_API_KEY:
        return _fallback_policy_check(tokenised_text, entity_types, ctx)
    
    try:
        # Prepare policy rules context for LLM
        policy_context = json.dumps(RULES, indent=2)
        
        # Build the assessment prompt
        prompt = POLICY_ASSESSMENT_PROMPT.format(
            entity_types=", ".join(entity_types) if entity_types else "None detected",
            tokenised_text=tokenised_text[:500],  # Limit text length
            policy_rules=policy_context
        )
        
        # Get LLM assessment
        result = asyncio.run(_call_openai_policy(prompt))
        
        # Validate and sanitize the response
        return _validate_policy_response(result)
        
    except Exception as e:
        print(f"LLM policy check failed: {e}")
        # Fall back to rule-based system
        return _fallback_policy_check(tokenised_text, entity_types, ctx)

def _validate_policy_response(response: dict) -> dict:
    """Validate and sanitize LLM policy response"""
    
    # Ensure required fields exist
    level = response.get("level", "amber").lower()
    if level not in ["green", "amber", "red"]:
        level = "amber"  # Default to caution
    
    return {
        "level": level,
        "confidence": max(0.0, min(1.0, response.get("confidence", 0.5))),
        "reasons": response.get("reasons", ["LLM policy assessment completed"]),
        "requiredActions": response.get("requiredActions", []),
        "riskFactors": response.get("riskFactors", []),
        "suggestions": response.get("suggestions", [])
    }

def _fallback_policy_check(tokenised_text: str, entity_types: list[str], ctx: dict) -> dict:
    """Enhanced fallback when LLM is unavailable"""
    
    reasons = []
    required_actions = []
    risk_factors = []
    suggestions = []
    
    # High-risk entities that should trigger amber/red
    high_risk_entities = ["PERSON_NAME", "NRIC", "PASSPORT", "PHONE_NUMBER", "EMAIL", "ADDRESS"]
    critical_entities = ["ACCOUNT_NUMBER", "CREDIT_CARD", "BANK_ROUTING"]
    
    detected_high_risk = [e for e in entity_types if e in high_risk_entities]
    detected_critical = [e for e in entity_types if e in critical_entities]
    
    # Check for improperly tokenised critical data
    if detected_critical:
        # Look for patterns that suggest raw critical data
        if re.search(r'\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b', tokenised_text):  # Credit card pattern
            return {
                "level": "red",
                "confidence": 0.9,
                "reasons": ["Potential raw credit card number detected"],
                "requiredActions": ["remove_sensitive_data", "re_tokenise"],
                "riskFactors": ["financial_data_exposure"],
                "suggestions": ["Ensure all payment card data is properly tokenised"]
            }
    
    # Check for job titles and indirect identifiers
    if "JOB_TITLE" in entity_types:
        reasons.append("Job title detected - indirect identifier present")
        required_actions.append("justify_business_need")
        risk_factors.append("indirect_identification_risk")
    
    # Check for high-risk PII combinations
    if len(detected_high_risk) > 2:
        reasons.append(f"Multiple PII types detected: {', '.join(detected_high_risk)}")
        required_actions.append("verify_tokenisation_quality")
        risk_factors.append("re_identification_risk")
        suggestions.append("Consider additional anonymisation for high-risk combinations")
        
        return {
            "level": "amber",
            "confidence": 0.8,
            "reasons": reasons,
            "requiredActions": required_actions,
            "riskFactors": risk_factors,
            "suggestions": suggestions
        }
    
    # Check for tokens that might not be properly anonymised
    token_pattern = r'\b[A-Z]+_[A-Z0-9]{4,}\b'
    tokens_found = re.findall(token_pattern, tokenised_text)
    
    if detected_high_risk and len(tokens_found) < len(detected_high_risk):
        reasons.append("Detected PII entities but insufficient tokenisation")
        required_actions.append("verify_complete_tokenisation")
        risk_factors.append("incomplete_anonymisation")
        
        return {
            "level": "amber",
            "confidence": 0.7,
            "reasons": reasons,
            "requiredActions": required_actions,
            "riskFactors": risk_factors,
            "suggestions": ["Ensure all detected PII is properly tokenised"]
        }
    
    if reasons:
        return {
            "level": "amber",
            "confidence": 0.6,
            "reasons": reasons,
            "requiredActions": required_actions,
            "riskFactors": risk_factors,
            "suggestions": suggestions
        }
    
    # Default to green if no issues found
    return {
        "level": "green",
        "confidence": 0.8,
        "reasons": ["No policy violations detected"],
        "requiredActions": [],
        "riskFactors": [],
        "suggestions": []
    }

# For backward compatibility, keep the original function name
def check_policy(tokenised_text: str, entity_types: list[str], ctx: dict) -> dict:
    """Main policy check function - now LLM-powered"""
    result = check_policy_llm(tokenised_text, entity_types, ctx)
    
    # Transform to match original response format while preserving new features
    return {
        "level": result["level"],
        "reasons": result["reasons"],
        "requiredActions": result["requiredActions"],
        # Additional fields for enhanced UI (optional)
        "confidence": result.get("confidence", 0.5),
        "riskFactors": result.get("riskFactors", []),
        "suggestions": result.get("suggestions", [])
    }