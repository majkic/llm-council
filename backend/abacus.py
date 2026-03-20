"""Abacus RouteLLM API client (OpenAI-compatible)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from .config import ABACUS_API_KEY, ABACUS_API_URL


def _to_abacus_model_id(model: str) -> str:
    """
    Convert existing OpenRouter-style IDs to Abacus RouteLLM IDs when possible.

    OpenRouter IDs often look like "vendor/model". Abacus RouteLLM expects model IDs
    like "gpt-5.1", "claude-4-5-sonnet", "gemini-3-pro", etc.
    """
    normalized = model.strip()
    if "/" in normalized:
        vendor, name = normalized.split("/", 1)
        vendor = vendor.strip().lower()
        name = name.strip()
        # Prefer a few explicit aliases for models we use by default.
        if vendor == "google" and name == "gemini-3-pro-preview":
            return "gemini-3-pro"
        if vendor == "anthropic" and name == "claude-sonnet-4.5":
            return "claude-4-5-sonnet"
        if vendor == "openai" and name == "gpt-5.2":
            return "gpt-5.2"
        # Generic fallback: strip vendor prefix.
        return name
    return normalized


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0,
    ) -> Optional[Dict[str, Any]]:
    """
    Query a single model via Abacus RouteLLM (OpenAI-compatible) API.

    Returns:
        Dict with 'content' (assistant message content) or None if failed.
    """
    if not ABACUS_API_KEY:
        print("ABACUS_API_KEY is not set.")
        return None

    headers = {
        "Authorization": f"Bearer {ABACUS_API_KEY}",
        "Content-Type": "application/json",
    }

    target_model = _to_abacus_model_id(model)

    async with httpx.AsyncClient(timeout=timeout) as client:
        # Primary attempt: requested model
        try:
            response = await client.post(
                ABACUS_API_URL,
                headers=headers,
                json={"model": target_model, "messages": messages},
            )
            response.raise_for_status()
            data = response.json()
            message = data["choices"][0]["message"]
            return {"content": message.get("content")}
        except httpx.HTTPStatusError as http_err:
            status = http_err.response.status_code if http_err.response is not None else "unknown"
            body = http_err.response.text if http_err.response is not None else ""
            print(f"Error querying Abacus model {model} (resolved as '{target_model}') - status {status}: {body}")

            # If this specific model isn't allowed/valid for the account, fall back to route-llm
            if status == 400 and target_model != "route-llm":
                try:
                    print(f"Falling back to Abacus model 'route-llm' for logical model {model}...")
                    fallback_resp = await client.post(
                        ABACUS_API_URL,
                        headers=headers,
                        json={"model": "route-llm", "messages": messages},
                    )
                    fallback_resp.raise_for_status()
                    data = fallback_resp.json()
                    message = data["choices"][0]["message"]
                    return {"content": message.get("content")}
                except Exception as fallback_err:
                    print(f"Fallback to 'route-llm' also failed for {model}: {fallback_err}")

            return None
        except Exception as e:
            print(f"Error querying Abacus model {model}: {e}")
            return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Query multiple models in parallel via Abacus RouteLLM."""
    import asyncio

    tasks = [query_model(model, messages) for model in models]
    responses = await asyncio.gather(*tasks)
    return {model: response for model, response in zip(models, responses)}

