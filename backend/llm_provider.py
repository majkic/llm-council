"""Provider-agnostic LLM client wrapper."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .config import LLM_PROVIDER


def _get_provider_module():
    if LLM_PROVIDER == "openrouter":
        from . import openrouter as provider  # type: ignore
        return provider
    if LLM_PROVIDER == "abacus":
        from . import abacus as provider  # type: ignore
        return provider
    raise ValueError(f"Unknown LLM_PROVIDER={LLM_PROVIDER!r} (expected 'openrouter' or 'abacus')")


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 120.0,
) -> Optional[Dict[str, Any]]:
    provider = _get_provider_module()
    return await provider.query_model(model=model, messages=messages, timeout=timeout)


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]],
) -> Dict[str, Optional[Dict[str, Any]]]:
    provider = _get_provider_module()
    return await provider.query_models_parallel(models=models, messages=messages)

