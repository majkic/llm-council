"""Configuration for the LLM Council."""

import os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRETS_ENV_PATH = os.path.join(PROJECT_ROOT, ".env")
PARAMS_ENV_PATH = os.path.join(PROJECT_ROOT, "llm-params.env")

def _load_env_file_fallback(path: str, *, override: bool) -> None:
    """Minimal .env loader when python-dotenv isn't available."""
    if not os.path.exists(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()
                # Strip simple surrounding quotes if present.
                if (value.startswith('"') and value.endswith('"')) or (
                    value.startswith("'") and value.endswith("'")
                ):
                    value = value[1:-1]
                if override or os.getenv(key) is None:
                    os.environ[key] = value
    except Exception:
        # Best effort; if this fails, we still allow running with real process env vars.
        pass

try:
    from dotenv import load_dotenv  # type: ignore

    # Load secrets (API keys) first, then non-secret configuration.
    # - Secrets should live in ".env"
    # - Non-secrets should live in "llm-params.env"
    load_dotenv(dotenv_path=SECRETS_ENV_PATH, override=False)
    if os.path.exists(PARAMS_ENV_PATH):
        load_dotenv(dotenv_path=PARAMS_ENV_PATH, override=True)
except Exception:
    # Keep dotenv optional so the app can still run in environments that provide
    # variables via the process environment (Docker, systemd, etc.).
    _load_env_file_fallback(SECRETS_ENV_PATH, override=False)
    _load_env_file_fallback(PARAMS_ENV_PATH, override=True)

# LLM provider selection
# - openrouter: uses https://openrouter.ai/api/v1/chat/completions and OpenRouter model IDs (e.g. "openai/gpt-5.1")
# - abacus: uses Abacus RouteLLM OpenAI-compatible API (default: https://routellm.abacus.ai/v1/chat/completions)
DEFAULT_LLM_PROVIDER = os.getenv("LLM_PROVIDER", "abacus")

# Google OAuth Settings
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Default to empty for security; must be set in .env on public server
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "majkic@gmail.com") 
SECRET_KEY = os.getenv("SECRET_KEY", "your-long-secret-key-change-this") # For SessionMiddleware

# Detection for public vs local
# We can use an environment variable or check the host at request time
# For now, we'll allow setting it via APP_ENV
APP_ENV = os.getenv("APP_ENV", "local") # local, production
IS_PUBLIC_SERVER = APP_ENV == "production"

# Helper to check if we are on localhost
def is_localhost(host: str) -> bool:
    return host in ["localhost", "127.0.0.1"] or host.startswith("localhost:") or host.startswith("127.0.0.1:")

# OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Abacus RouteLLM API key + endpoint
ABACUS_API_KEY = os.getenv("ABACUS_API_KEY")
ABACUS_API_URL = os.getenv("ABACUS_API_URL", "https://routellm.abacus.ai/v1/chat/completions")

# Council members - list of OpenRouter model identifiers
_COUNCIL_MODELS_ENV = os.getenv("COUNCIL_MODELS", "").strip()
if _COUNCIL_MODELS_ENV:
    DEFAULT_COUNCIL_MODELS = [m.strip() for m in _COUNCIL_MODELS_ENV.split(",") if m.strip()]
else:
    DEFAULT_COUNCIL_MODELS = [
        "openai/gpt-5.1",
        "google/gemini-3-pro-preview",
        "anthropic/claude-sonnet-4.5",
        "x-ai/grok-4",
    ]

# Chairman model - synthesizes final response
DEFAULT_CHAIRMAN_MODEL = os.getenv("CHAIRMAN_MODEL", "google/gemini-3-pro-preview").strip()

# Legacy names for backward compatibility (still used in some places)
LLM_PROVIDER = DEFAULT_LLM_PROVIDER
COUNCIL_MODELS = DEFAULT_COUNCIL_MODELS
CHAIRMAN_MODEL = DEFAULT_CHAIRMAN_MODEL

# OpenRouter API endpoint
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Data directory for conversation storage
DATA_DIR = "data/conversations"
