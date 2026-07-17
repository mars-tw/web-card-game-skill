"""Deterministic R67 runtime asset pipeline. Masters remain untouched."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "evidence" / "R67"
MASTERS = EVIDENCE / "masters"
ALPHA_SOURCES = EVIDENCE / "alpha_sources"
BATTLE_OUT = ROOT / "assets" / "battlefields"
EMBLEM_OUT = ROOT / "assets" / "factions"
QUALITY_OUT = EVIDENCE / "quality"

SCENES = {
    "white-tide-citadel": "wardens",
    "astral-conclave": "conclave",
    "thunderwild-pass": "wild",
    "longnight-necropolis": "wintershadow",
    "tidebreak-confluence": "neutral",
}
FACTIONS = ["wardens", "conclave", "wild", "wintershadow", "neutral"]
TIERS = {
    "high": ((1536, 1024), 82),
    "med": ((1152, 768), 78),
    "low": ((768, 512), 74),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def c2pa_summary(path: Path) -> dict:
    data = path.read_bytes()
    offset = data.find(b"softwareAgent")
    region = data[offset : offset + 512] if offset >= 0 else b""
    match = re.search(br"dnamei(gpt-image)gversionc(2\.[0-9]+)", region)
    result = {
        "file": rel(path),
        "sha256": sha256(path),
        "caBX": b"caBX" in data,
        "softwareAgent": match.group(1).decode() if match else None,
        "version": match.group(2).decode() if match else None,
        "trainedAlgorithmicMedia": b"trainedAlgorithmicMedia" in data,
    }
    result["pass"] = bool(
        result["caBX"]
        and result["softwareAgent"] == "gpt-image"
        and re.fullmatch(r"2\.\d+", result["version"] or "")
        and result["trainedAlgorithmicMedia"]
    )
    return result


def quiet_center(image: Image.Image) -> Image.Image:
    base = image.convert("RGB")
    softened = base.filter(ImageFilter.GaussianBlur(2.2))
    softened = ImageEnhance.Contrast(softened).enhance(0.76)
    softened = ImageEnhance.Brightness(softened).enhance(0.78)
    mask = Image.new("L", base.size, 0)
    draw = ImageDraw.Draw(mask)
    w, h = base.size
    draw.rounded_rectangle((w * 0.17, h * 0.16, w * 0.83, h * 0.84), radius=int(h * 0.15), fill=220)
    mask = mask.filter(ImageFilter.GaussianBlur(int(min(w, h) * 0.055)))
    return Image.composite(softened, base, mask)


def process_battlefields() -> list[dict]:
    assets = []
    BATTLE_OUT.mkdir(parents=True, exist_ok=True)
    QUALITY_OUT.mkdir(parents=True, exist_ok=True)
    for scene, faction in SCENES.items():
        master = MASTERS / f"battlefield-{scene}.png"
        with Image.open(master) as source:
            if source.size != (1536, 1024):
                raise ValueError(f"{master.name}: expected 1536x1024, got {source.size}")
            processed = quiet_center(source)
        runtimes = []
        previews = {}
        for tier, (size, quality) in TIERS.items():
            output = BATTLE_OUT / f"{scene}-{tier}.webp"
            runtime = processed.resize(size, Image.Resampling.LANCZOS)
            runtime.save(output, "WEBP", quality=quality, method=6, exact=True)
            digest = sha256(output)
            runtimes.append(
                {
                    "tier": tier,
                    "path": rel(output),
                    "width": size[0],
                    "height": size[1],
                    "decodedBytes": size[0] * size[1] * 4,
                    "fileBytes": output.stat().st_size,
                    "sha256": digest,
                    "contentHashQuery": f"?v={digest[:8]}",
                }
            )
            preview = runtime.resize((384, 256), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (400, 290), "#07131b")
            canvas.paste(preview, (8, 8))
            ImageDraw.Draw(canvas).text((12, 269), tier.upper(), fill="#e6edf3")
            previews[tier] = canvas
        strip = Image.new("RGB", (1200, 290), "#07131b")
        for index, tier in enumerate(("low", "med", "high")):
            strip.paste(previews[tier], (index * 400, 0))
        strip.save(QUALITY_OUT / f"{scene}-low-med-high.jpg", "JPEG", quality=88, optimize=True)
        assets.append(
            {
                "id": scene,
                "kind": "battlefield",
                "faction": faction,
                "modelSlug": "gpt-image-2",
                "master": rel(master),
                "masterSha256": sha256(master),
                "c2pa": c2pa_summary(master),
                "postprocess": {
                    "pipeline": "Pillow deterministic center quieting then Lanczos tier resample and WebP encode",
                    "centerRegion": "rounded central 66% box, feathered 5.5% of short edge",
                    "centerGaussianBlurRadius": 2.2,
                    "centerContrast": 0.76,
                    "centerBrightness": 0.78,
                    "tiers": {tier: {"size": list(size), "quality": quality, "method": 6} for tier, (size, quality) in TIERS.items()},
                },
                "runtime": runtimes,
            }
        )
    return assets


def process_emblems() -> list[dict]:
    assets = []
    EMBLEM_OUT.mkdir(parents=True, exist_ok=True)
    contact = Image.new("RGBA", (5 * 96, 112), (7, 19, 27, 255))
    draw = ImageDraw.Draw(contact)
    for index, faction in enumerate(FACTIONS):
        master = MASTERS / f"emblem-{faction}-chroma.png"
        alpha_source = ALPHA_SOURCES / f"emblem-{faction}-alpha.png"
        with Image.open(alpha_source) as opened:
            image = opened.convert("RGBA")
        alpha = image.getchannel("A")
        bbox = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
        if not bbox:
            raise ValueError(f"{alpha_source.name}: empty alpha subject")
        cropped = image.crop(bbox)
        # Keep the silhouette large enough to remain distinct at the protocol's
        # 64 px thumbnail gate while retaining a 12 px transparent safety pad.
        max_subject = 232
        cropped.thumbnail((max_subject, max_subject), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        x = (256 - cropped.width) // 2
        y = (256 - cropped.height) // 2
        canvas.alpha_composite(cropped, (x, y))
        output = EMBLEM_OUT / f"{faction}.png"
        canvas.save(output, "PNG", optimize=True)
        digest = sha256(output)
        thumb = canvas.resize((64, 64), Image.Resampling.LANCZOS)
        contact.alpha_composite(thumb, (index * 96 + 16, 8))
        draw.text((index * 96 + 8, 80), faction[:12], fill="#e6edf3")
        assets.append(
            {
                "id": faction,
                "kind": "faction-emblem",
                "modelSlug": "gpt-image-2",
                "master": rel(master),
                "masterSha256": sha256(master),
                "c2pa": c2pa_summary(master),
                "postprocess": {
                    "pipeline": "installed remove_chroma_key.py then alpha bbox crop and Lanczos fit",
                    "removeChromaKeyArgs": "--auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill",
                    "alphaThresholdForBbox": 16,
                    "canvas": [256, 256],
                    "maxSubject": [max_subject, max_subject],
                },
                "runtime": [
                    {
                        "tier": "all",
                        "path": rel(output),
                        "width": 256,
                        "height": 256,
                        "decodedBytes": 256 * 256 * 4,
                        "fileBytes": output.stat().st_size,
                        "sha256": digest,
                        "contentHashQuery": f"?v={digest[:8]}",
                    }
                ],
            }
        )
    contact.convert("RGB").save(QUALITY_OUT / "emblems-64px-contact-sheet.jpg", "JPEG", quality=92)
    return assets


def main() -> None:
    masters = sorted(MASTERS.glob("*.png"))
    c2pa = [c2pa_summary(path) for path in masters]
    if len(c2pa) != 10 or not all(item["pass"] for item in c2pa):
        raise SystemExit("C2PA gate failed; no runtime assets were written")
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / "c2pa-verification.json").write_text(
        json.dumps({"count": len(c2pa), "passed": sum(item["pass"] for item in c2pa), "assets": c2pa}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    assets = process_battlefields() + process_emblems()
    prompt_file = EVIDENCE / "R67_STYLE_BOARD_AND_PROMPTS.md"
    desktop_decoded = sum(item["decodedBytes"] for asset in assets for item in asset["runtime"])
    mobile_decoded = sum(
        item["decodedBytes"]
        for asset in assets
        for item in asset["runtime"]
        if asset["kind"] == "faction-emblem" or item["tier"] == "low"
    )
    manifest = {
        "release": "card R67",
        "generatedAt": str(date.today()),
        "modelSlug": "gpt-image-2",
        "generationInterface": "Codex built-in image_gen",
        "promptFile": rel(prompt_file),
        "promptFileSha256": sha256(prompt_file),
        "masterPolicy": "C2PA masters are immutable and separate from runtime assets",
        "budgets": {
            "desktopAllRuntimeDecodedBytes": desktop_decoded,
            "desktopLimitBytes": 64 * 1024 * 1024,
            "mobileLowPlusEmblemsDecodedBytes": mobile_decoded,
            "mobileLimitBytes": 32 * 1024 * 1024,
        },
        "assets": assets,
    }
    (EVIDENCE / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"c2paPassed": len(c2pa), "assets": len(assets), "budgets": manifest["budgets"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
