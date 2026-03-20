"""Configuration for the LLM Council."""

import os
try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv()
except Exception:
    # Keep dotenv optional so the app can still run in environments that provide
    # variables via the process environment (Docker, systemd, etc.).
    pass

# LLM provider selection
# - openrouter: uses https://openrouter.ai/api/v1/chat/completions and OpenRouter model IDs (e.g. "openai/gpt-5.1")
# - abacus: uses Abacus RouteLLM OpenAI-compatible API (default: https://routellm.abacus.ai/v1/chat/completions)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Abacus RouteLLM API key + endpoint
ABACUS_API_KEY = os.getenv("ABACUS_API_KEY")
ABACUS_API_URL = os.getenv("ABACUS_API_URL", "https://routellm.abacus.ai/v1/chat/completions")

# Council members - list of OpenRouter model identifiers
_COUNCIL_MODELS_ENV = os.getenv("COUNCIL_MODELS", "").strip()
if _COUNCIL_MODELS_ENV:
    COUNCIL_MODELS = [m.strip() for m in _COUNCIL_MODELS_ENV.split(",") if m.strip()]
else:
    COUNCIL_MODELS = [
        "openai/gpt-5.1",
        "google/gemini-3-pro-preview",
        "anthropic/claude-sonnet-4.5",
        "x-ai/grok-4",
    ]

# Chairman model - synthesizes final response
CHAIRMAN_MODEL = os.getenv("CHAIRMAN_MODEL", "google/gemini-3-pro-preview").strip()

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
