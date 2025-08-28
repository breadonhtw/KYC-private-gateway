import re, yaml, os
RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "infra", "policy.rules.yaml")
with open(RULES_PATH, "r") as f:
    RULES = yaml.safe_load(f)

RAW_BLOCK_RX = {"ACCOUNT_NUMBER": re.compile(r"\b\d{3}[- ]?\d{3}[- ]?\d{3,}\b")}

def check_policy(tokenised_text: str, entity_types: list[str], ctx: dict):
    for name, rx in RAW_BLOCK_RX.items():
        if rx.search(tokenised_text):
            return {"level":"red","reasons":[f"Raw {name} present"],"requiredActions":["remove_or_tokenise"]}
    reasons = []
    if "JOB_TITLE" in entity_types:
        reasons.append("Job title present (indirect identifier)")
        return {"level":"amber","reasons":reasons,"requiredActions":["justify_or_remove"]}
    return {"level":"green","reasons":[], "requiredActions":[]}
