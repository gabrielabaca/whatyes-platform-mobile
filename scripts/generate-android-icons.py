#!/usr/bin/env python3
"""Genera mipmaps Android desde el App Icon de iOS (1024)."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ios/PulpoLive/Images.xcassets/AppIcon.appiconset/icon-1024.png"
RES = ROOT / "android/app/src/main/res"

# #685CF0 — ic_launcher_background en colors.xml
BG_RGB = (104, 92, 240)
BG_TOLERANCE = 55
SAFE_ZONE_RATIO = 0.66

DENSITIES: dict[str, tuple[int, int]] = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}


def dist_rgb(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def extract_foreground(source: Image.Image) -> Image.Image:
    rgba = source.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if dist_rgb((r, g, b), BG_RGB) <= BG_TOLERANCE:
                px[x, y] = (r, g, b, 0)
    return rgba


def fit_in_safe_zone(foreground: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    target = max(1, int(size * SAFE_ZONE_RATIO))
    fitted = foreground.copy()
    fitted.thumbnail((target, target), Image.Resampling.LANCZOS)
    ox = (size - fitted.width) // 2
    oy = (size - fitted.height) // 2
    canvas.paste(fitted, (ox, oy), fitted)
    return canvas


def make_round_launcher(square: Image.Image) -> Image.Image:
    size = square.width
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(square.convert("RGBA"), (0, 0), mask)
    return out


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Missing source icon: {SOURCE}")

    source = Image.open(SOURCE).convert("RGBA")
    foreground_src = extract_foreground(source)

    for folder, (launcher_px, foreground_px) in DENSITIES.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)

        launcher = source.resize((launcher_px, launcher_px), Image.Resampling.LANCZOS)
        launcher.save(out_dir / "ic_launcher.png", optimize=True)

        round_icon = make_round_launcher(launcher)
        round_icon.save(out_dir / "ic_launcher_round.png", optimize=True)

        fg = fit_in_safe_zone(foreground_src, foreground_px)
        fg.save(out_dir / "ic_launcher_foreground.png", optimize=True)
        print(f"Wrote {folder} ({launcher_px}px / {foreground_px}px fg)")


if __name__ == "__main__":
    main()
