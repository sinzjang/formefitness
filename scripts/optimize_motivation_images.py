#!/usr/bin/env python3
"""
모티베이션 이미지 — 모바일용 최적화
- 해상도 50% (예: 1024×1536 → 512×768)
- JPEG quality 60 (슬라이더 6/10 수준)
원본은 별도 백업 후 이 스크립트로 덮어씁니다.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

# 프로젝트 루트 기준 폴더
ROOT = Path(__file__).resolve().parent.parent
FOLDERS = [
    ROOT / "motivation_images",
    ROOT / "motivation_images_2",
    ROOT / "motivation_images_3",
]

SCALE = 0.5
JPEG_QUALITY = 60  # JPG 품질 6/10 ≈ 60
JPEG_SUBSAMPLING = 2  # 4:2:0 — 모바일 용량 절감


def optimize_file(path: Path) -> tuple[int, int, int]:
    """이미지 리사이즈 + JPEG 저장. (원본KB, 결과KB, (w,h)) 반환"""
    with Image.open(path) as img:
        src_w, src_h = img.size
        dst_w = max(1, round(src_w * SCALE))
        dst_h = max(1, round(src_h * SCALE))
        rgb = img.convert("RGB")
        resized = rgb.resize((dst_w, dst_h), Image.Resampling.LANCZOS)

        src_bytes = path.stat().st_size
        resized.save(
            path,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
            progressive=True,
            subsampling=JPEG_SUBSAMPLING,
        )
        dst_bytes = path.stat().st_size
        return src_bytes, dst_bytes, (dst_w, dst_h)


def main() -> None:
    total = 0
    saved = 0

    print(f"모바일 최적화 — scale {SCALE:.0%}, JPEG quality {JPEG_QUALITY}\n")

    for folder in FOLDERS:
        if not folder.is_dir():
            print(f"⏭  {folder.name}/ — 폴더 없음")
            continue

        files = sorted(folder.glob("*.jpg")) + sorted(folder.glob("*.jpeg"))
        if not files:
            print(f"⏭  {folder.name}/ — 이미지 없음")
            continue

        print(f"📁 {folder.name}/ ({len(files)}장)")
        folder_before = 0
        folder_after = 0

        for path in files:
            try:
                before, after, (w, h) = optimize_file(path)
                folder_before += before
                folder_after += after
                total += 1
                print(f"  ✅ {path.name} → {w}×{h} ({before // 1024}KB → {after // 1024}KB)")
            except Exception as e:
                print(f"  ❌ {path.name}: {e}", file=sys.stderr)

        saved += folder_before - folder_after
        if folder_before:
            pct = (1 - folder_after / folder_before) * 100
            print(f"  소계: {folder_before // 1024}KB → {folder_after // 1024}KB (−{pct:.0f}%)\n")

    print(f"{'='*50}")
    print(f"완료: {total}장 처리")
    if saved > 0:
        print(f"총 용량 절감: {saved // 1024}KB ({saved / 1024 / 1024:.1f}MB)")


if __name__ == "__main__":
    main()
