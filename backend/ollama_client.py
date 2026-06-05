"""Thin async wrapper around the local Ollama HTTP API.

Only the two calls OmniSight needs are exposed: listing vision-capable
models and running a chat turn with an attached image.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass

import httpx

OLLAMA_BASE_URL = "http://localhost:11434"
REQUEST_TIMEOUT = 600.0  # vision models on cloud tiers can be slow


@dataclass(frozen=True)
class OllamaModel:
    name: str
    size: int
    supports_vision: bool


async def _show(client: httpx.AsyncClient, name: str) -> list[str]:
    """Return the capability list for a model (e.g. ['completion', 'vision'])."""
    try:
        resp = await client.post("/api/show", json={"model": name})
        resp.raise_for_status()
        return resp.json().get("capabilities", []) or []
    except (httpx.HTTPError, ValueError):
        return []


async def list_models() -> list[OllamaModel]:
    """List installed models, flagging which ones accept image input."""
    async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=REQUEST_TIMEOUT) as client:
        resp = await client.get("/api/tags")
        resp.raise_for_status()
        raw = resp.json().get("models", [])

        models: list[OllamaModel] = []
        for entry in raw:
            name = entry.get("name", "")
            if not name:
                continue
            caps = await _show(client, name)
            models.append(
                OllamaModel(
                    name=name,
                    size=int(entry.get("size", 0) or 0),
                    supports_vision="vision" in caps,
                )
            )
        return models


async def chat_with_image(
    *,
    model: str,
    system_prompt: str,
    history: list[dict],
    user_text: str,
    image_bytes: bytes,
) -> str:
    """Send one chat turn with an image and return the raw assistant text.

    ``history`` is a list of prior {"role", "content"} messages (text only);
    the current image is attached to the new user message.
    """
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text, "images": [image_b64]})

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0.2},
    }

    async with httpx.AsyncClient(base_url=OLLAMA_BASE_URL, timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post("/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return (data.get("message") or {}).get("content", "") or ""
