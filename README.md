# KYC Private Gateway - API Setup

## Problem Statement: Privacy Meets AI: Building a Safer Digital Future
- PII Detection and Redaction for LLM Prompts
- An application that automatically detects and redacts personally identifiable information (PII) in real time, tokenising PII and utilising them for internal searches on adverse media on individuals.

## Functionality and features
- Real-time PII detection system, which protects the privacy of individuals
- LLM-powered tokenising system, which is used for internal searches of adverse media
- LLM-powered search function, which summarises the adverse media regarding the individual in question
- Allows institutions such as banks and universities to conduct background checks without leaking sensitive information through LLMs

## Prerequisites

- Python 3.8+
- OpenAI API account

## Setup Instructions

1. **Install dependencies:**

   ```bash
   cd services/api
   pip install -r requirements.txt
   ```

2. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```
3. **Add your API credentials to `.env`:**

   ```bash
   OPENAI_API_KEY=sk-your-openai-api-key-here
   TOKEN_SALT=your-32-character-minimum-salt-here
   ```

   > **🔑 Get your OpenAI API key:** https://platform.openai.com/api-keys

   > **🧂 Generate a random salt:** Use any 32+ character string for TOKEN_SALT

4. **Start the server:**

   ```bash
   uvicorn main:app --reload
   ```

5. **Test the API:**
   ```bash
   curl http://localhost:8000/
   # Should return: {"ok": true, "service": "kpg-api"}
   ```

## Environment Variables

| Variable         | Required | Description                                      |
| ---------------- | -------- | ------------------------------------------------ |
| `OPENAI_API_KEY` | Yes      | Your OpenAI API key (starts with `sk-`)          |
| `TOKEN_SALT`     | Yes      | Random string for hashing PII tokens (32+ chars) |

## Fallback Mode

If no `OPENAI_API_KEY` is provided, the system will:

- Use mock responses for LLM calls
- Still perform PII detection and tokenization
- Fall back to rule-based policy checking
