"""Commandized R67 image, contrast, crop, alpha and memory gates."""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "evidence" / "R67"
MANIFEST_PATH = EVIDENCE / "source-manifest.json"
OUT_PATH = EVIDENCE / "gates" / "visual-assets.json"
VIEWPORTS = [(1366, 768), (390, 844), (844, 390)]


def pixels(image: Image.Image):
    """Pillow 14-compatible flattened pixel iterator."""
    return image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def srgb_luminance(rgb: tuple[float, float, float]) -> float:
    values = []
    for value in rgb:
        channel = value / 255
        values.append(channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4)
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]


def contrast(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    one, two = sorted((srgb_luminance(a), srgb_luminance(b)), reverse=True)
    return (one + 0.05) / (two + 0.05)


def composite(backdrop: tuple[int, int, int], overlay: tuple[int, int, int], alpha: float) -> tuple[float, float, float]:
    return tuple(overlay[i] * alpha + backdrop[i] * (1 - alpha) for i in range(3))


def rms(image: Image.Image) -> float:
    stat = ImageStat.Stat(image)
    return math.sqrt(sum(value * value for value in stat.rms) / max(1, len(stat.rms)))


def cover_crop_check(width: int, height: int, viewport: tuple[int, int]) -> dict:
    vw, vh = viewport
    scale = max(vw / width, vh / height)
    visible_w, visible_h = vw / scale, vh / scale
    left, top = (width - visible_w) / 2, (height - visible_h) / 2
    margin_x, margin_y = visible_w * 0.05, visible_h * 0.05
    safe = (left + margin_x, top + margin_y, left + visible_w - margin_x, top + visible_h - margin_y)
    focal = (width * 0.46, height * 0.46, width * 0.54, height * 0.54)
    passed = focal[0] >= safe[0] and focal[1] >= safe[1] and focal[2] <= safe[2] and focal[3] <= safe[3]
    return {"viewport": [vw, vh], "safeBox": [round(value, 2) for value in safe], "focalBox": [round(value, 2) for value in focal], "pass": passed}


def connected_components(mask: Image.Image) -> int:
    pixels = mask.load()
    width, height = mask.size
    seen = set()
    components = 0
    for y in range(height):
        for x in range(width):
            if not pixels[x, y] or (x, y) in seen:
                continue
            components += 1
            stack = [(x, y)]
            seen.add((x, y))
            while stack:
                cx, cy = stack.pop()
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
    return components


def battlefield_gate(asset: dict) -> dict:
    result = {"id": asset["id"], "tiers": [], "safeCrop": [], "pass": True}
    runtime_by_tier = {item["tier"]: item for item in asset["runtime"]}
    images = {}
    for tier in ("high", "med", "low"):
        item = runtime_by_tier[tier]
        path = ROOT / item["path"]
        with Image.open(path) as opened:
            image = opened.convert("RGB")
        images[tier] = image
        w, h = image.size
        central = image.crop((int(w * 0.2), int(h * 0.2), int(w * 0.8), int(h * 0.8)))
        gray = central.convert("L")
        high_frequency = ImageChops.difference(gray, gray.filter(ImageFilter.GaussianBlur(2)))
        noise_rms = ImageStat.Stat(high_frequency).rms[0]
        luminance_stddev = ImageStat.Stat(gray).stddev[0]
        samples = central.resize((64, 64), Image.Resampling.BOX)
        ui_contrasts = []
        card_contrasts = []
        for r, g, b in pixels(samples):
            ui_backdrop = composite((r, g, b), (8, 12, 18), 0.88)
            card_backdrop = composite((r, g, b), (20, 28, 40), 0.96)
            ui_contrasts.append(contrast((230, 237, 243), ui_backdrop))
            card_contrasts.append(contrast((185, 196, 205), card_backdrop))
        minimum_contrast = min(ui_contrasts + card_contrasts)
        tier_pass = (
            image.size == tuple((item["width"], item["height"]))
            and sha256(path) == item["sha256"]
            and item["contentHashQuery"] == f"?v={item['sha256'][:8]}"
            and noise_rms <= 18
            and luminance_stddev <= 32
            and minimum_contrast >= 4.5
        )
        result["tiers"].append(
            {
                "tier": tier,
                "size": list(image.size),
                "noiseRms": round(noise_rms, 3),
                "noiseLimit": 18,
                "luminanceStddev": round(luminance_stddev, 3),
                "luminanceStddevLimit": 32,
                "minimumOverlayContrast": round(minimum_contrast, 3),
                "contrastLimit": 4.5,
                "sha256": item["sha256"],
                "contentHashQuery": item["contentHashQuery"],
                "pass": tier_pass,
            }
        )
        result["pass"] = result["pass"] and tier_pass
    high = images["high"]
    for tier in ("med", "low"):
        reference = high.resize(images[tier].size, Image.Resampling.LANCZOS)
        consistency_rms = rms(ImageChops.difference(reference, images[tier]))
        consistency_pass = consistency_rms <= 8
        result.setdefault("qualityConsistency", []).append({"tier": tier, "rms": round(consistency_rms, 3), "limit": 8, "pass": consistency_pass})
        result["pass"] = result["pass"] and consistency_pass
    for viewport in VIEWPORTS:
        check = cover_crop_check(high.width, high.height, viewport)
        result["safeCrop"].append(check)
        result["pass"] = result["pass"] and check["pass"]
    return result


def emblem_gate(asset: dict) -> dict:
    item = asset["runtime"][0]
    path = ROOT / item["path"]
    with Image.open(path) as opened:
        image = opened.convert("RGBA")
    thumb = image.resize((64, 64), Image.Resampling.LANCZOS)
    alpha = thumb.getchannel("A")
    mask = alpha.point(lambda value: 1 if value >= 64 else 0)
    opaque = sum(pixels(mask))
    occupancy = opaque / (64 * 64)
    bbox = mask.getbbox() or (0, 0, 0, 0)
    bbox_size = [bbox[2] - bbox[0], bbox[3] - bbox[1]]
    components = connected_components(mask)
    green_fringe = 0
    subject_pixels = 0
    for r, g, b, a in pixels(thumb):
        if a < 32:
            continue
        subject_pixels += 1
        if g > 150 and g > r * 1.35 and g > b * 1.35:
            green_fringe += 1
    fringe_ratio = green_fringe / max(1, subject_pixels)
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((63, 0)), alpha.getpixel((0, 63)), alpha.getpixel((63, 63))]
    passed = (
        image.size == (256, 256)
        and sha256(path) == item["sha256"]
        and item["contentHashQuery"] == f"?v={item['sha256'][:8]}"
        and max(corners) <= 8
        and 0.18 <= occupancy <= 0.78
        and min(bbox_size) >= 44
        and opaque >= 650
        and components <= 3
        and fringe_ratio <= 0.002
    )
    return {
        "id": asset["id"],
        "size": list(image.size),
        "thumbnailSize": [64, 64],
        "transparentCorners": corners,
        "occupancy": round(occupancy, 4),
        "occupancyRange": [0.18, 0.78],
        "subjectBbox64": list(bbox),
        "subjectBboxSize64": bbox_size,
        "opaquePixels64": opaque,
        "components64": components,
        "greenFringeRatio": round(fringe_ratio, 6),
        "sha256": item["sha256"],
        "contentHashQuery": item["contentHashQuery"],
        "pass": passed,
    }


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    battlefields = [battlefield_gate(asset) for asset in manifest["assets"] if asset["kind"] == "battlefield"]
    emblems = [emblem_gate(asset) for asset in manifest["assets"] if asset["kind"] == "faction-emblem"]
    c2pa_pass = all(asset["c2pa"]["pass"] and asset["modelSlug"] == "gpt-image-2" for asset in manifest["assets"])
    budgets = manifest["budgets"]
    memory_pass = (
        budgets["desktopAllRuntimeDecodedBytes"] <= budgets["desktopLimitBytes"]
        and budgets["mobileLowPlusEmblemsDecodedBytes"] <= budgets["mobileLimitBytes"]
    )
    result = {
        "release": manifest["release"],
        "thresholds": {"contrast": 4.5, "centralNoiseRms": 18, "centralLuminanceStddev": 32, "desktopDecodedMiB": 64, "mobileDecodedMiB": 32},
        "c2pa": {"count": len(manifest["assets"]), "pass": c2pa_pass},
        "memory": {**budgets, "pass": memory_pass},
        "battlefields": battlefields,
        "emblems": emblems,
    }
    result["pass"] = c2pa_pass and memory_pass and all(item["pass"] for item in battlefields + emblems)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["pass"] else 1)


if __name__ == "__main__":
    main()
