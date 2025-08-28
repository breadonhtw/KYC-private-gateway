import os, httpx, asyncio
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

PROMPT = """You are a compliance assistant. Given tokenised subject and sanitised excerpts, summarise adverse media.
Subject: {subject}
Excerpts:
{excerpts}
Return bullets + 1-line risk note. Never try to guess real identity.
"""

async def _call_openai(prompt: str):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    body = {"model":"gpt-4o-mini","messages":[{"role":"user","content":prompt}], "temperature":0.2}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(url, headers=headers, json=body); r.raise_for_status()
        data = r.json(); return data["choices"][0]["message"]["content"], data.get("usage", {})

def summarise(subject_token: str, snippets: list[dict]):
    excerpts = "\n".join(f"- {s['textSanitised']}" for s in snippets)
    prompt = PROMPT.format(subject=subject_token, excerpts=excerpts)
    if not OPENAI_API_KEY:
        return {
            "answer": "- 2023 regulatory fine (MAS)\n- 2019 regulatory warning\n**Risk:** Moderate; verify sanctions list.",
            "citations": [s["source"] for s in snippets],
            "model": "mock-llm",
            "latencyMs": 42,
        }
    content, usage = asyncio.run(_call_openai(prompt))
    return {
        "answer": content,
        "citations": [s["source"] for s in snippets],
        "model": "gpt-4o-mini",
        "latencyMs": usage.get("total_tokens", 0),
    }
