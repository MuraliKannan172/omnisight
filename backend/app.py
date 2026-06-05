"""OmniSight backend: serves model list and runs annotation turns via Ollama."""
from __future__ import annotations

import base64
import binascii

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from annotations import SYSTEM_PROMPT, build_user_text, parse_response
from grid import add_grid
from ollama_client import chat_with_image, list_models

app = FastAPI(title="OmniSight (Ollama)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_IMAGE_BYTES = 12 * 1024 * 1024  # 12 MB upload ceiling


class Turn(BaseModel):
    role: str
    content: str


class SketchRequest(BaseModel):
    model: str = Field(min_length=1)
    question: str = Field(min_length=1, max_length=2000)
    image: str = Field(min_length=1, description="base64-encoded image (data URL or raw)")
    history: list[Turn] = Field(default_factory=list)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/api/models")
async def models() -> dict:
    try:
        found = await list_models()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail="Cannot reach Ollama at localhost:11434. Is `ollama serve` running?",
        ) from exc

    return {
        "models": [
            {"name": m.name, "size": m.size, "supports_vision": m.supports_vision}
            for m in found
        ]
    }


def _decode_image(raw: str) -> bytes:
    if raw.startswith("data:"):
        _, _, raw = raw.partition(",")
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.") from exc
    if not data:
        raise HTTPException(status_code=400, detail="Empty image.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 12 MB limit.")
    return data


@app.post("/api/sketch")
async def sketch(req: SketchRequest) -> dict:
    image_bytes = _decode_image(req.image)

    try:
        gridded = add_grid(image_bytes)
    except Exception as exc:  # noqa: BLE001 - surface decode/format errors to the user
        raise HTTPException(status_code=400, detail=f"Could not read image: {exc}") from exc

    turn = sum(1 for t in req.history if t.role == "user") + 1
    history = [{"role": t.role, "content": t.content} for t in req.history]

    try:
        raw = await chat_with_image(
            model=req.model,
            system_prompt=SYSTEM_PROMPT,
            history=history,
            user_text=build_user_text(req.question, turn),
            image_bytes=gridded,
        )
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:300] if exc.response is not None else str(exc)
        raise HTTPException(status_code=502, detail=f"Ollama error: {detail}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {exc}") from exc

    parsed = parse_response(raw)
    return {
        "answer": parsed["answer"],
        "annotations": parsed["annotations"],
        "raw": parsed["raw"],
        "gridded_image": "data:image/png;base64," + base64.b64encode(gridded).decode("ascii"),
        "turn": turn,
    }
