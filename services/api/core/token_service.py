import os, hmac, hashlib
SALT = (os.getenv("TOKEN_SALT") or "change-me-32chars-minimum").encode()
PREFIX = {"PERSON_NAME":"SUBJ","NRIC":"ID","ACCOUNT_NUMBER":"ACC","EMAIL":"EML","PHONE":"TEL","DOB":"DOB"}
def tokenise(text: str, entities: list[dict]):
    ents = sorted(entities, key=lambda e: e["start"])
    out, i = [], 0
    for e in ents:
        out.append(text[i:e["start"]])
        raw = text[e["start"]:e["end"]].encode()
        digest = hmac.new(SALT, raw, hashlib.sha256).hexdigest()[:4].upper()
        out.append(f"{PREFIX.get(e['type'],'TOK')}_{digest}")
        i = e["end"]
    out.append(text[i:])
    return "".join(out)
