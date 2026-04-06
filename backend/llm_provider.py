"""Provider-agnostic LLM client wrapper."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .config import DEFAULT_LLM_PROVIDER


def _get_provider_module(provider_name: str | None = None):
    p_name = provider_name or DEFAULT_LLM_PROVIDER
    if p_name == "openrouter":
        from . import openrouter as provider  # type: ignore
        return provider
    if p_name == "abacus":
        from . import abacus as provider  # type: ignore
        return provider
    raise ValueError(f"Unknown provider={p_name!r} (expected 'openrouter' or 'abacus')")


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0,
    provider: str | None = None,
) -> Optional[Dict[str, Any]]:
    prov_mod = _get_provider_module(provider)
    return await prov_mod.query_model(model=model, messages=messages, timeout=timeout)


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
    provider: str | None = None,
) -> Dict[str, Optional[Dict[str, Any]]]:
    prov_mod = _get_provider_module(provider)
    return await prov_mod.query_models_parallel(models=models, messages=messages)


async def list_models(provider: str | None = None) -> List[str]:
    """List all available models for a given provider."""
    prov_mod = _get_provider_module(provider)
    if hasattr(prov_mod, 'list_models'):
        return await prov_mod.list_models()
    return []


async def get_credits() -> Dict[str, Any]:
    """Fetch OpenRouter credits."""
    from . import openrouter
    return await openrouter.get_credits()


async def get_quota() -> Dict[str, Any]:
    """Fetch Abacus quota."""
    from . import abacus
    return await abacus.get_quota()

