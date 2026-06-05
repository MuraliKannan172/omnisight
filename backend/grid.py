"""Overlay a 0-100 coordinate grid on an image for spatial grounding.

The grid gives the vision model a shared reference frame so it can place
annotation primitives at meaningful coordinates. Coordinates run 0-100 on
both axes (percentage of width / height), origin at the top-left.
"""
from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

GRID_STEP = 10  # draw a line every 10 percent
LINE_COLOR = (255, 255, 255, 90)
MAJOR_LINE_COLOR = (255, 255, 255, 140)
LABEL_COLOR = (255, 255, 255, 230)
LABEL_SHADOW = (0, 0, 0, 160)
MAX_DIMENSION = 1024  # downscale large uploads before sending to the model


def _load_font(size: int) -> ImageFont.ImageFont:
    for candidate in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _fit(image: Image.Image) -> Image.Image:
    width, height = image.size
    longest = max(width, height)
    if longest <= MAX_DIMENSION:
        return image
    scale = MAX_DIMENSION / longest
    return image.resize((int(width * scale), int(height * scale)), Image.LANCZOS)


def add_grid(image_bytes: bytes) -> bytes:
    """Return PNG bytes of the image with a labelled coordinate grid drawn on it."""
    base = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    base = _fit(base)
    width, height = base.size

    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = _load_font(max(11, width // 70))

    for pct in range(0, 101, GRID_STEP):
        x = round(width * pct / 100)
        y = round(height * pct / 100)
        is_major = pct % 50 == 0
        color = MAJOR_LINE_COLOR if is_major else LINE_COLOR
        draw.line([(x, 0), (x, height)], fill=color, width=1)
        draw.line([(0, y), (width, y)], fill=color, width=1)

        if pct == 0 or pct == 100:
            continue
        _label(draw, font, str(pct), (x + 2, 2))
        _label(draw, font, str(pct), (2, y + 2))

    combined = Image.alpha_composite(base, overlay).convert("RGB")
    out = io.BytesIO()
    combined.save(out, format="PNG")
    return out.getvalue()


def _label(draw: ImageDraw.ImageDraw, font, text: str, pos: tuple[int, int]) -> None:
    x, y = pos
    draw.text((x + 1, y + 1), text, font=font, fill=LABEL_SHADOW)
    draw.text((x, y), text, font=font, fill=LABEL_COLOR)
