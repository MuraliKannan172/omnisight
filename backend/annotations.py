"""System prompt and parser for the model's visual annotation output.

The model is asked to answer in prose AND emit a JSON block of annotation
primitives positioned on the 0-100 coordinate grid. The frontend renders
those primitives as a non-destructive SVG overlay on the original image.
"""
from __future__ import annotations

import json
import re

ALLOWED_TYPES = {"circle", "rect", "arrow", "line", "text", "dot"}

SYSTEM_PROMPT = """You are OmniSight, a vision assistant that explains its visual reasoning by \
drawing on the image instead of only describing it in words.

The image you receive has a coordinate grid overlaid on it. Both axes run from 0 to 100, \
where (0,0) is the TOP-LEFT corner and (100,100) is the BOTTOM-RIGHT corner. Use these \
coordinates to place your annotations precisely.

The user may have drawn their own marks on the image (hand-drawn circles, boxes, or \
freehand scribbles) to point at something specific. Treat any such marks as part of the \
question: focus on what they highlight, and refer to them in your answer when relevant.

For every question:
1. Look carefully at the image and reason about the answer.
2. Mark the relevant regions with annotation primitives so a human can SEE what you mean.
3. Reply with a short natural-language answer, then a single fenced ```json block.

The JSON must be an object with this exact shape:
{
  "answer": "<one or two sentence answer>",
  "annotations": [
    {"type": "circle", "cx": 50, "cy": 40, "r": 12, "color": "#ff4d6d", "label": "cat's face"},
    {"type": "arrow", "x1": 20, "y1": 80, "x2": 45, "y2": 55, "color": "#22d3ee", "label": "path"},
    {"type": "rect", "x": 10, "y": 10, "w": 30, "h": 20, "color": "#a78bfa", "label": "sign"},
    {"type": "line", "points": [[10,10],[40,30],[70,20]], "color": "#34d399"},
    {"type": "dot", "cx": 60, "cy": 60, "color": "#fbbf24", "label": "corner"},
    {"type": "text", "x": 50, "y": 90, "text": "exit", "color": "#ffffff"}
  ]
}

Rules:
- ALL coordinates are numbers from 0 to 100 (percentages), never pixels.
- Use vivid, high-contrast colors as hex strings.
- Keep labels short (a few words). Omit "label" if not useful.
- Include at least one annotation when the question is about locations, objects, paths, \
counts, or comparisons. Use an empty list only for purely abstract questions.
- Output ONLY the prose answer followed by the json block. No extra commentary."""


def build_user_text(question: str, turn: int) -> str:
    if turn > 1:
        return (
            f"Follow-up (turn {turn}). Refine or add to your previous sketch as needed.\n"
            f"Question: {question.strip()}"
        )
    return f"Question: {question.strip()}"


def parse_response(raw: str) -> dict:
    """Extract {answer, annotations, raw} from the model's text.

    Tolerant of models that wrap JSON in code fences, add prose, or omit the
    fence entirely. Invalid annotations are dropped rather than failing the turn.
    """
    payload = _extract_json(raw)
    answer = ""
    annotations: list[dict] = []

    if isinstance(payload, dict):
        answer = str(payload.get("answer", "")).strip()
        annotations = _clean_annotations(payload.get("annotations", []))

    if not answer:
        answer = _strip_json_block(raw).strip() or raw.strip()

    return {"answer": answer, "annotations": annotations, "raw": raw}


def _extract_json(raw: str) -> dict | None:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    candidates = []
    if fenced:
        candidates.append(fenced.group(1))
    # Fallback: the largest brace-balanced object in the text.
    brace = re.search(r"\{.*\}", raw, re.DOTALL)
    if brace:
        candidates.append(brace.group(0))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    return None


def _strip_json_block(raw: str) -> str:
    return re.sub(r"```(?:json)?\s*\{.*?\}\s*```", "", raw, flags=re.DOTALL)


def _num(value) -> float | None:
    try:
        return max(0.0, min(100.0, float(value)))
    except (TypeError, ValueError):
        return None


def _clean_annotations(items) -> list[dict]:
    if not isinstance(items, list):
        return []
    cleaned: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        kind = str(item.get("type", "")).lower()
        if kind not in ALLOWED_TYPES:
            continue
        normalized = _normalize(kind, item)
        if normalized:
            cleaned.append(normalized)
    return cleaned


def _normalize(kind: str, item: dict) -> dict | None:
    color = str(item.get("color", "#ff4d6d"))
    label = str(item.get("label", "")).strip()
    base = {"type": kind, "color": color, "label": label}

    if kind in ("circle", "dot"):
        cx, cy = _num(item.get("cx")), _num(item.get("cy"))
        if cx is None or cy is None:
            return None
        r = _num(item.get("r")) if kind == "circle" else 1.5
        return {**base, "cx": cx, "cy": cy, "r": r or 8.0}

    if kind == "rect":
        x, y = _num(item.get("x")), _num(item.get("y"))
        w, h = _num(item.get("w")), _num(item.get("h"))
        if None in (x, y, w, h):
            return None
        return {**base, "x": x, "y": y, "w": w, "h": h}

    if kind == "arrow":
        x1, y1 = _num(item.get("x1")), _num(item.get("y1"))
        x2, y2 = _num(item.get("x2")), _num(item.get("y2"))
        if None in (x1, y1, x2, y2):
            return None
        return {**base, "x1": x1, "y1": y1, "x2": x2, "y2": y2}

    if kind == "line":
        points = item.get("points", [])
        coords = []
        if isinstance(points, list):
            for pt in points:
                if isinstance(pt, (list, tuple)) and len(pt) == 2:
                    px, py = _num(pt[0]), _num(pt[1])
                    if px is not None and py is not None:
                        coords.append([px, py])
        if len(coords) < 2:
            return None
        return {**base, "points": coords}

    if kind == "text":
        x, y = _num(item.get("x")), _num(item.get("y"))
        text = str(item.get("text", "")).strip()
        if x is None or y is None or not text:
            return None
        return {**base, "x": x, "y": y, "text": text}

    return None
