"""Import the ten-series portrait archive into the public image gallery."""

import argparse
import json
import re
import shutil
import subprocess
from pathlib import Path


SERIES = {
    "01": ("镰仓海街", "镰仓与海街日记"),
    "02": ("首尔时尚", "首尔时尚画报"),
    "03": ("京都和风", "京都四季"),
    "04": ("东京霓虹", "东京霓虹雨夜"),
    "05": ("北海道冬日", "北海道初雪"),
    "06": ("光影美术馆", "光影美术馆"),
    "07": ("济州岛春日", "济州岛春日"),
    "08": ("极简黑白", "黑白影棚肖像"),
    "09": ("梦幻花艺", "梦幻花艺"),
    "10": ("都市生活", "都市生活美学"),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Folder containing the 97 JPEG portraits")
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    files = sorted(source.rglob("*.jpg"))
    if len(files) != 97 or len({file.name for file in files}) != 97:
        raise SystemExit("Expected 97 JPEG files with unique names")
    converter = shutil.which("cwebp")
    if not converter:
        raise SystemExit("cwebp is required to create web-ready copies")

    site_root = Path(__file__).resolve().parents[1]
    gallery_root = site_root / "portfolio" / "text-to-image" / "assets"
    destination = gallery_root / "portraits"
    destination.mkdir(parents=True, exist_ok=True)
    entries = []
    for file in files:
        match = re.fullmatch(r"jk_s(\d{2})_(\d{2})_[A-Za-z0-9_]+\.jpg", file.name)
        if not match or match.group(1) not in SERIES:
            raise SystemExit(f"Unexpected portrait filename: {file.name}")
        series, number = match.groups()
        category, title = SERIES[series]
        webp_name = file.with_suffix(".webp").name
        subprocess.run([converter, "-q", "90", "-quiet", str(file), "-o",
                        str(destination / webp_name)], check=True)
        public_path = f"assets/portraits/{webp_name}"
        entries.append({
            "id": f"jk-{series}-{number}",
            "type": "image",
            "title": f"{title} · {int(number):02d}",
            "category": category,
            "src": public_path,
            "previewSrc": public_path,
            "poster": "",
            "duration": 0,
            "width": 896,
            "height": 1200,
            "featured": False,
        })

    output = gallery_root / "js" / "portrait-media.js"
    output.write_text(
        "globalThis.PORTFOLIO_MEDIA.unshift(..." +
        json.dumps(entries, ensure_ascii=False, indent=2) + ");\n",
        encoding="utf-8",
    )
    print(f"Imported {len(entries)} portraits across {len(SERIES)} series")


if __name__ == "__main__":
    main()
