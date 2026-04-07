"""OpenRouter API client for making LLM requests."""

import httpx
from typing import List, Dict, Any, Optional
from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL, APP_DOMAIN


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Returns:
        Response dict with 'content', 'usage', and optional 'reasoning_details', or None if failed.
        usage: {prompt_tokens: int, completion_tokens: int, total_tokens: int}
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data['choices'][0]['message']
            usage = data.get('usage', {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0
            })

            return {
                'content': message.get('content'),
                'reasoning_details': message.get('reasoning_details'),
                'usage': usage
            }

    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio

    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}


async def list_models() -> List[str]:
    """
    List all available text-generation models from OpenRouter.

    Returns:
        List of model identifiers
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get("https://openrouter.ai/api/v1/models", headers=headers)
            response.raise_for_status()
            data = response.json()
            
            models = []
            for model_info in data.get('data', []):
                # Filter for text models if possible, or just include all
                model_id = model_info.get('id')
                if model_id:
                    models.append(model_id)
            
            return sorted(models)

    except Exception as e:
        print(f"Error listing OpenRouter models: {e}")
        return []


async def get_credits() -> Dict[str, Any]:
    """
    Fetch the account credit balance from OpenRouter.

    Returns:
        Dict with 'balance' or empty if failed.
    """
    if not OPENROUTER_API_KEY:
        print("OpenRouter Credits: [DEBUG] OPENROUTER_API_KEY is MISSING in backend environment.")
        return {"balance": 0.0}

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try primary /credits endpoint first (requires Management API Key)
            response = await client.get("https://openrouter.ai/api/v1/credits", headers=headers)
            
            if response.status_code == 200:
                resp_json = response.json()
                data = resp_json.get('data', {})
                tc = data.get('total_credits', 0.0)
                tu = data.get('total_usage', 0.0)
                remaining = float(tc) - float(tu)
                return {"balance": round(max(0, remaining), 4)}
            
            # Fallback for standard keys (sk-or-v1-...) - use /auth/key endpoint
            print(f"OpenRouter Credits: Primary endpoint failed ({response.status_code}), trying /auth/key fallback...")
            fallback_resp = await client.get("https://openrouter.ai/api/v1/auth/key", headers=headers)
            
            if fallback_resp.status_code == 200:
                fb_json = fallback_resp.json()
                data = fb_json.get('data', {})
                # For standard keys, we often get limit and usage directly
                limit = data.get('limit', 0.0)
                usage = data.get('usage', 0.0)
                if limit is not None:
                    remaining = float(limit) - float(usage)
                    return {"balance": round(max(0, remaining), 4)}
            
            print(f"OpenRouter Credits: Both endpoints failed. Fallback status: {fallback_resp.status_code}")
            return {"balance": 0.0}
            
    except Exception as e:
        print(f"OpenRouter Credits: [DEBUG] Unexpected Exception: {e}")
        import traceback
        traceback.print_exc()
        return {"balance": 0.0}
