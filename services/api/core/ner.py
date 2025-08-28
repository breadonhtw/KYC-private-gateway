import re
from hashlib import sha256

PATTERNS = {
    "PERSON_NAME": re.compile(r"\b([A-Z][a-z]+(?:[-'][A-Z][a-z]+)?\s[A-Z][a-z]+(?:[-'][A-Z][a-z]+)?)\b"),
    "NRIC": re.compile(r"\b[STFG]\d{7}[A-Z]\b", re.IGNORECASE),
    "ACCOUNT_NUMBER": re.compile(r"\b\d{3}[- ]?\d{3}[- ]?\d{3,}\b"),
    "EMAIL": re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),
    "PHONE": re.compile(r"\b(?:\+?\d{1,3}[-\s]?)?(?:\d{3,4}[-\s]?){2,3}\d{3,4}\b"),
    "DOB": re.compile(r"\b(?:\d{4}-\d{2}-\d{2}|\d{2}[/\-]\d{2}[/\-]\d{4})\b"),
}

def _hash(val: str) -> str:
    return sha256(val.encode()).hexdigest()

def detect_entities(text: str):
    cand = []
    for etype, rx in PATTERNS.items():
        for m in rx.finditer(text):
            val = m.group(0)
            if etype == "PERSON_NAME" and len(val.split()) != 2:
                continue
            cand.append({
                "type": etype, "start": m.start(), "end": m.end(),
                "valueHash": _hash(val), "confidence": 0.9 if etype != "PERSON_NAME" else 0.7
            })
    cand.sort(key=lambda e: (e["start"], -(e["end"]-e["start"])))
    final, last_end = [], -1
    for e in cand:
        if e["start"] >= last_end:
            final.append(e); last_end = e["end"]
    return final