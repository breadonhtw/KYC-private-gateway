import re
from hashlib import sha256

PATTERNS = {
    "PERSON_NAME": re.compile(
    r"\b"
    r"([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{1,20}(?:[-'][A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{1,20})?)"  # first name
    r"(?:\s"  # space before next name part
    r"([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{1,20}(?:[-'][A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{1,20})?"  # middle/last name
    r"|(?i:bin|binti|binte|van|von|de|del|da|dos|di|la|le|al))"  # common prefixes
    r"){0,9}"  # allow up to 9 additional name parts
    r"\b")
    ,
    "NRIC": re.compile(r"\b[STFG][ -]?\d{7}[ -]?[A-Z]\b", re.IGNORECASE),
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
            if etype == "PERSON_NAME":
                tokens = val.split()
                if not (2 <= len(tokens) <= 6):
                    continue
            cand.append({
                "type": etype, "start": m.start(), "end": m.end(),
                "valueHash": _hash(val), "confidence": 0.9 if etype != "PERSON_NAME" else 0.7
            })
    # Overlap resolution: preserve different types even when overlapping,
    # but for same type, keep the longer span.
    cand.sort(key=lambda e: (e["start"], -(e["end"]-e["start"])) )
    final = []
    for e in cand:
        if not final:
            final.append(e)
            continue
        last = final[-1]
        # No overlap
        if e["start"] >= last["end"]:
            final.append(e)
            continue
        # Overlap exists
        if e["type"] != last["type"]:
            # Keep both if different types (e.g., PERSON_NAME vs NRIC)
            final.append(e)
            continue
        # Same type overlap: keep the longer span
        last_len = last["end"] - last["start"]
        curr_len = e["end"] - e["start"]
        if curr_len > last_len:
            final[-1] = e
        # else: keep last, drop e
    return final