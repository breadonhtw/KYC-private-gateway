
import os
import json
import re
import time
from typing import List, Dict, Any, Optional

# If you already have an OpenAI client wrapper, you can replace this import and client creation.
try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover
    OpenAI = None  # Placeholder to keep module importable without the library


# ---- Public API ----------------------------------------------------------------

ENTITY_TYPES = [
    "PERSON_NAME",
    "NRIC",
    "PASSPORT",
    "PHONE_NUMBER",
    "EMAIL",
    "ADDRESS",
    "JOB_TITLE",
    "DOB",
    "ORGANISATION"
]


def extract_entities(
    text: str,
    model: str = "gpt-4o-mini",
    temperature: float = 0.0,
    max_retries: int = 2,
    timeout: int = 30,
) -> List[Dict[str, Any]]:
    """
    LLM-based NER. Returns a list of entities as dicts:
    { "type": <ENTITY_TYPES>, "value": <str>, "start": <int>, "end": <int> }.
    Offsets are best-effort (computed post-hoc by searching the value in text).

    Requirements:
      - pip install openai>=1.0.0
      - env OPENAI_API_KEY must be set
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    if OpenAI is None:
        raise RuntimeError("openai python package not installed. Run: pip install openai")

    client = OpenAI(api_key=api_key, timeout=timeout)

    # We enforce a strict JSON schema for stability.
    schema = {
        "name": "entities_schema",
        "schema": {
            "type": "object",
            "properties": {
                "entities": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "type": {"type": "string", "enum": ENTITY_TYPES},
                            "value": {"type": "string"}
                        },
                        "required": ["type", "value"],
                        "additionalProperties": False
                    }
                }
            },
            "required": ["entities"],
            "additionalProperties": False
        },
        "strict": True
    }

    system = (
        "You are a precise information extraction engine for compliance.\n"
        "Only extract explicit entities that appear verbatim in the text.\n"
        "Never hallucinate. Use the provided label set exactly.\n"
        "If nothing is found, return an empty list.\n"
    )

    user = (
        "Extract entities from the text.\n"
        f"Allowed labels: {', '.join(ENTITY_TYPES)}\n\n"
        f"Text:\n{text}"
    )

    last_err: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            # Use JSON schema if available
            resp = client.chat.completions.create(
                model=model,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_schema", "json_schema": schema},
            )
            raw = resp.choices[0].message.content or "{}"
            parsed = json.loads(raw)
            entities = parsed.get("entities", [])
            entities = _attach_offsets(text, entities)
            return entities
        except Exception as e:  # simple retry for transient issues
            last_err = e
            if attempt < max_retries:
                time.sleep(0.8 * (attempt + 1))
            else:
                raise

    if last_err:
        raise last_err
    return []


def llm_then_regex_fallback(
    text: str,
    regex_entities: List[Dict[str, Any]],
    prefer_llm: bool = True,
) -> List[Dict[str, Any]]:
    """
    Merge LLM results with your existing regex NER.
    - If prefer_llm=True, LLM extractions override duplicates from regex by span.
    - Otherwise regex wins.
    Duplicates are de-duped by (type, value, start, end).
    """
    try:
        llm_entities = extract_entities(text)
    except Exception:
        # If LLM call fails, just return regex results
        return _dedupe_entities(regex_entities)

    if prefer_llm:
        merged = _merge_entities(primary=llm_entities, secondary=regex_entities)
    else:
        merged = _merge_entities(primary=regex_entities, secondary=llm_entities)
    return _dedupe_entities(merged)


# ---- Helpers -------------------------------------------------------------------

def _attach_offsets(text: str, ents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compute best-effort start/end by searching the value in the original text.
    If multiple occurrences exist, pick the first occurrence not yet used.
    """
    taken_ranges: List[range] = []
    out = []
    for ent in ents:
        val = ent.get("value", "").strip()
        typ = ent.get("type", "").strip()
        if not val or not typ:
            continue
        # Find a non-overlapping occurrence
        span = _find_non_overlapping(text, val, taken_ranges)
        if span is None:
            # Fallback: just skip offsets
            out.append({"type": typ, "value": val, "start": None, "end": None})
        else:
            s, e = span
            taken_ranges.append(range(s, e))
            out.append({"type": typ, "value": val, "start": s, "end": e})
    return out


def _find_non_overlapping(text: str, value: str, taken: List[range]) -> Optional[tuple]:
    for m in re.finditer(re.escape(value), text):
        span = range(m.start(), m.end())
        if not any(_overlaps(span, t) for t in taken):
            return (m.start(), m.end())
    return None


def _overlaps(a: range, b: range) -> bool:
    return a.start < b.stop and b.start < a.stop


def _merge_entities(primary: List[Dict[str, Any]], secondary: List[Dict[str, Any]]):
    # Keep primary, add any secondary that is not a duplicate span/type/value
    out = list(primary)
    for e in secondary:
        if e not in out:
            out.append(e)
    return out


def _dedupe_entities(ents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    out = []
    for e in ents:
        key = (e.get("type"), e.get("value"), e.get("start"), e.get("end"))
        if key not in seen:
            seen.add(key)
            out.append(e)
    return out


# ---- CLI -----------------------------------------------------------------------

def _demo():
    import argparse
    p = argparse.ArgumentParser(description="LLM NER demo")
    p.add_argument("text", help="Text to extract entities from")
    p.add_argument("--model", default="gpt-4o-mini")
    args = p.parse_args()

    ents = extract_entities(args.text, model=args.model)
    print(json.dumps(ents, indent=2))


if __name__ == "__main__":
    _demo()
