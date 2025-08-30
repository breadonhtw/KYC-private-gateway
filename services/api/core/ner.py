import os
import re
import hashlib

# --- LLM hybrid integration (optional) -----------------------------------------
# Set USE_LLM_NER=1 to enable LLM extraction and merge with regex results.
# Requires ner_llm.py and OPENAI_API_KEY.
try:
    from ner_llm import llm_then_regex_fallback, extract_entities as extract_entities_llm  # type: ignore
except Exception:  # keep file importable even if ner_llm is missing
    llm_then_regex_fallback = None
    extract_entities_llm = None

PATTERNS = {
    "NRIC": re.compile(r"\b[STFG]\d{7}[A-Z]\b"),
    "EMAIL": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "PHONE": re.compile(r"(?:\+?65[-\s]?)?[689]\d{3}[-\s]?\d{4}\b"),

    "PERSON_NAME": re.compile(
        r"\b([A-Z][a-z]+(?:\s+(?:bin|binti|binte|van|von|de|del|da|dos|di|la|le|al|[A-Z][a-z]+)){1,3})\b"
    ),

    "ADDRESS": re.compile(
        r"\b\d{1,4}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s"
        r"(?:Road|Street|Avenue|Lane|Drive|Close|Crescent|Walk|Way|Place|Boulevard|Terrace|View|Park|Rise|Heights|Jalan|Lor|Lorong)\b"
    ),
}

def _hash(val: str) -> str:
    return hashlib.sha256(val.encode("utf-8")).hexdigest()[:8]

def detect_entities(text: str):
    
    final = []
    for typ, pat in PATTERNS.items():
        for m in pat.finditer(text):
            final.append({
                "type": typ,
                "start": m.start(),
                "end": m.end(),
                "valueHash": _hash(m.group(0)),
                "confidence": 0.9,
            })

    # Optional LLM hybrid:
    use_llm = os.getenv("USE_LLM_NER") in ("1", "true", "True")
    if use_llm and llm_then_regex_fallback is not None:
        regex_entities = [
            {"type": e["type"], "value": text[e["start"]:e["end"]], "start": e["start"], "end": e["end"]}
            for e in final
        ]
        try:
            merged = llm_then_regex_fallback(text, regex_entities, prefer_llm=True)
            out = []
            for m in merged:
                s, e = m.get("start"), m.get("end")
                val = m.get("value") if s is None or e is None else text[s:e]
                out.append({
                    "type": m.get("type"),
                    "start": s if s is not None else text.find(val),
                    "end": e if e is not None else (text.find(val) + len(val) if val else None),
                    "valueHash": _hash(val or ""),
                    "confidence": 0.85
                })
            return out
        except Exception:
            pass

    return final