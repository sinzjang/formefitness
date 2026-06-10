#!/usr/bin/env python3
"""
Formé Fitness — Motivation Image Generator
OpenAI GPT Image 2로 티어별 모티베이션 이미지 30장 생성
"""

import openai
import base64
import os
import time
import urllib.request
from pathlib import Path

def load_openai_api_key() -> str:
    """환경변수 또는 프로젝트 .env에서 API 키 로드"""
    for name in ("OPENAI_API_KEY", "EXPO_PUBLIC_OPENAI_API_KEY"):
        val = os.environ.get(name, "").strip()
        if val:
            return val

    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() in ("OPENAI_API_KEY", "EXPO_PUBLIC_OPENAI_API_KEY"):
                return value.strip().strip('"').strip("'")
    return ""

# ── 설정 ──────────────────────────────────────────
OPENAI_API_KEY = load_openai_api_key()
OUTPUT_DIR     = "./motivation_images"
SIZE           = "1024x1536"   # 세로 2:3 (gpt-image는 가로·세로 16의 배수 필요)
QUALITY        = "low"      # $0.041/장
SLEEP          = 1             # API 호출 간격 (초)

# ── 프롬프트 ──────────────────────────────────────
PROMPTS = [

    # ── Tier 1 — Lean & Clean ─────────────────────
    ("tier1_01",
     "A fit Asian male in his late 20s, lean physique with low body fat, "
     "slim but defined silhouette, light muscle tone visible through skin, "
     "wearing fitted athletic shorts, standing front pose, "
     "natural studio lighting, white background, "
     "photorealistic, fitness lifestyle photography"),

    ("tier1_02",
     "A fit Caucasian male in his early 30s, lean runner physique, "
     "flat stomach, minimal body fat, light shoulder definition, "
     "wearing compression shorts, side profile pose showing clean lines, "
     "soft natural lighting, light gray background, "
     "photorealistic, health magazine style"),

    ("tier1_03",
     "A lean male in his late 20s, athletic swimmer build, "
     "visible but subtle muscle tone, low body fat percentage, "
     "wearing athletic shorts, relaxed standing pose arms slightly raised, "
     "bright studio lighting, white background, "
     "photorealistic, clean fitness aesthetic"),

    ("tier1_04",
     "A fit male in his 30s, lean physique, "
     "light chest and shoulder muscle tone, flat midsection, "
     "wearing fitted tank top and shorts, casual athletic pose, "
     "warm natural lighting, minimal background, "
     "photorealistic, lifestyle fitness photography"),

    ("tier1_05",
     "A lean athletic male, low body fat, visible light ab definition, "
     "toned arms and shoulders, clean proportioned physique, "
     "wearing athletic shorts, three-quarter turn pose, "
     "professional studio lighting, white background, "
     "photorealistic, aspirational fitness imagery"),

    # ── Tier 2 — Everyday Fit ─────────────────────
    ("tier2_01",
     "A healthy fit male in his late 20s, moderate muscle tone, "
     "slightly defined chest and shoulders, visible arm muscles, "
     "flat stomach with slight ab outline, energetic appearance, "
     "wearing athletic shorts and fitted tee, front relaxed pose, "
     "natural studio lighting, white background, "
     "photorealistic, everyday fitness lifestyle"),

    ("tier2_02",
     "A fit male in his early 30s, balanced physique, "
     "moderate muscle definition across upper body, "
     "healthy skin tone, athletic but approachable build, "
     "wearing gym shorts, relaxed confident pose, "
     "soft studio lighting, light gray background, "
     "photorealistic, health and wellness photography"),

    ("tier2_03",
     "A healthy athletic male, good muscle tone without being bulky, "
     "defined shoulders and arms, slight chest definition, "
     "visible but not prominent abdominal muscles, "
     "wearing fitted athletic wear, slightly dynamic pose, "
     "bright natural lighting, white background, "
     "photorealistic, active lifestyle photography"),

    ("tier2_04",
     "A fit male in his 30s, solid everyday athletic build, "
     "toned upper body, healthy proportions, "
     "slight muscle definition throughout, vibrant healthy appearance, "
     "wearing compression shorts, arms crossed confident pose, "
     "professional lighting, neutral background, "
     "photorealistic, fitness motivation imagery"),

    ("tier2_05",
     "A healthy fit male, moderate athletic physique, "
     "defined but natural muscle tone, flat midsection, "
     "proportionate build, wearing minimal athletic clothing, "
     "three-quarter view, clean studio lighting, white background, "
     "photorealistic, wellness lifestyle photography"),

    # ── Tier 3 — Toned Up ─────────────────────────
    ("tier3_01",
     "A toned athletic male in his late 20s, visible muscle definition, "
     "clear six-pack abs, defined chest with visible striations, "
     "prominent shoulder caps, lean and cut physique, "
     "wearing athletic shorts only, front double bicep pose, "
     "dramatic studio lighting with shadows, white background, "
     "photorealistic, fitness model photography"),

    ("tier3_02",
     "A muscular toned male in his 30s, clearly defined muscles, "
     "visible abs and obliques, strong shoulder and arm definition, "
     "athletic V-taper silhouette, low body fat, "
     "wearing gym shorts, side chest pose, "
     "professional fitness photography lighting, gray background, "
     "photorealistic, mens fitness magazine style"),

    ("tier3_03",
     "A fit toned male, well-defined upper body muscles, "
     "visible chest separation, capped delts, defined biceps, "
     "clear ab definition, athletic waist, "
     "wearing athletic shorts, relaxed flex pose, "
     "bright professional lighting, white background, "
     "photorealistic, inspirational fitness imagery"),

    ("tier3_04",
     "A toned athletic male, defined physique with visible muscle tone, "
     "strong back muscles visible in three-quarter back pose, "
     "defined lats and rhomboids, muscular shoulders, "
     "wearing gym shorts, looking over shoulder, "
     "dramatic directional lighting, dark neutral background, "
     "photorealistic, fitness transformation photography"),

    ("tier3_05",
     "A lean muscular male in his late 20s, competition-adjacent toning, "
     "razor-sharp ab definition, defined serratus, capped shoulders, "
     "visible muscle separations throughout upper body, "
     "wearing fitted shorts, arms relaxed at sides front pose, "
     "clean professional studio lighting, white background, "
     "photorealistic, fitness model standard"),

    # ── Tier 4 — Athletic ─────────────────────────
    ("tier4_01",
     "A muscular athletic male in his early 30s, impressive physique, "
     "thick chest with clear definition, boulder shoulders, "
     "strong muscular arms, visible six-pack, athletic V-taper, "
     "wearing athletic shorts, confident front pose, "
     "dramatic professional lighting, white background, "
     "photorealistic, elite fitness photography"),

    ("tier4_02",
     "A powerful athletic male, well-developed muscle mass, "
     "broad shoulders, thick muscular chest, strong arms, "
     "visible abs and obliques, athletic and functional build, "
     "wearing gym shorts, side triceps pose, "
     "professional studio lighting with strong shadows, "
     "neutral background, photorealistic, sports performance imagery"),

    ("tier4_03",
     "A highly athletic male, impressive upper body development, "
     "thick back muscles, wide lats, strong trapezius, "
     "muscular arms, athletic waistline, "
     "wearing athletic shorts, rear lat spread pose, "
     "dramatic lighting, dark background, "
     "photorealistic, performance athlete photography"),

    ("tier4_04",
     "An athletic muscular male in his 30s, powerful physique, "
     "well-rounded muscle development, strong and defined throughout, "
     "thick chest, powerful shoulders, muscular arms, "
     "visible core definition, wearing gym shorts, "
     "three-quarter pose showing full physique, "
     "professional fitness lighting, white background, "
     "photorealistic, athletic inspiration photography"),

    ("tier4_05",
     "A highly conditioned athletic male, peak performance physique, "
     "impressive muscle mass with visible definition, "
     "strong jawline, athletic proportions, powerful stance, "
     "wearing minimal athletic clothing, most muscular pose, "
     "dramatic studio lighting, white background, "
     "photorealistic, high-end fitness magazine cover quality"),

    # ── Tier 5 — Sculpted ─────────────────────────
    ("tier5_01",
     "A fitness model male in his late 20s, sculpted physique, "
     "extremely defined muscles throughout, razor-sharp abs, "
     "full chest with deep striations, capped 3D shoulders, "
     "thick muscular arms, very low body fat, "
     "wearing competition shorts, front relaxed pose, "
     "professional high-contrast lighting, white background, "
     "photorealistic, fitness model competition standard"),

    ("tier5_02",
     "A sculpted male physique, competition-level muscle definition, "
     "deeply striated chest, fully separated muscle groups, "
     "dramatic V-taper, thick muscular back, tiny waist, "
     "wearing minimal shorts, side chest pose, "
     "dramatic low-key studio lighting, dark background, "
     "photorealistic, bodybuilding aesthetics photography"),

    ("tier5_03",
     "A highly sculpted male fitness model, exceptional definition, "
     "visible muscle bellies and separations everywhere, "
     "3D shoulder development, peaked biceps, defined forearms, "
     "razor abs, athletic but aesthetic proportions, "
     "wearing athletic shorts, arms raised overhead pose, "
     "bright professional studio lighting, white background, "
     "photorealistic, elite fitness model photography"),

    ("tier5_04",
     "A sculpted male physique, fitness model caliber, "
     "extremely detailed muscle definition, full development, "
     "wide back, thick traps, full chest, capped delts, "
     "visible serratus and obliques, competition-ready leanness, "
     "wearing minimal athletic shorts, rear double bicep pose, "
     "dramatic lighting with shadows, neutral background, "
     "photorealistic, professional physique photography"),

    ("tier5_05",
     "A fitness model male, stage-ready sculpted physique, "
     "exceptional muscle separation and definition, "
     "proportionate but impressive size with extreme leanness, "
     "full rounded muscle bellies throughout body, "
     "wearing competition shorts, quarter turn pose, "
     "professional competition-style photography lighting, "
     "white background, photorealistic, high-end fitness imagery"),

    # ── Tier 6 — Elite ────────────────────────────
    ("tier6_01",
     "An elite male bodybuilder, massive muscle development, "
     "extremely thick and full muscle bellies everywhere, "
     "huge chest, massive shoulders, enormous arms, "
     "deeply striated and separated muscles, very low body fat, "
     "wearing competition posing trunks, front double bicep pose, "
     "professional bodybuilding competition lighting, white background, "
     "photorealistic, professional bodybuilding photography"),

    ("tier6_02",
     "A competitive male bodybuilder, elite physique, "
     "massive overall muscle mass, extreme definition, "
     "thick slabs of muscle with deep separations, "
     "huge traps, massive back, powerful legs, "
     "wearing posing trunks, side chest pose, "
     "dramatic stage lighting simulation, dark background, "
     "photorealistic, bodybuilding competition photography"),

    ("tier6_03",
     "An elite male bodybuilder, competition-ready condition, "
     "extraordinary muscle mass and definition combined, "
     "full and round muscle bellies, paper-thin skin, "
     "massive arms, huge chest, wide back, "
     "wearing minimal posing shorts, most muscular pose, "
     "professional bodybuilding photography lighting, white background, "
     "photorealistic, elite bodybuilding imagery"),

    ("tier6_04",
     "A massive elite male bodybuilder, enormous muscle mass throughout, "
     "wide as a doorframe, thick everywhere, "
     "impressive size and proportions, "
     "wearing athletic shorts, relaxed confident pose, "
     "natural lighting, white background, "
     "photorealistic, size and mass bodybuilding photography"),

    ("tier6_05",
     "An elite competitive male bodybuilder, peak condition, "
     "ultimate muscle development and definition, "
     "massive arms, huge chest, incredible back thickness, "
     "wearing competition trunks, rear lat spread, "
     "professional stage lighting, neutral background, "
     "photorealistic, championship bodybuilding photography"),
]

def image_bytes_from_response(response) -> bytes:
    """gpt-image-2 응답 → JPEG bytes (b64_json 또는 url)"""
    item = response.data[0]
    if getattr(item, "b64_json", None):
        return base64.b64decode(item.b64_json)
    if getattr(item, "url", None):
        with urllib.request.urlopen(item.url, timeout=120) as resp:
            return resp.read()
    raise ValueError("응답에 b64_json/url 이미지 데이터가 없습니다")

# ── 메인 ──────────────────────────────────────────
def main():
    if not OPENAI_API_KEY:
        raise SystemExit(
            "OPENAI_API_KEY가 없습니다. .env에 EXPO_PUBLIC_OPENAI_API_KEY를 설정하거나 "
            "`.venv/bin/python generate_motivation_images.py` 로 실행하세요."
        )
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    Path(OUTPUT_DIR).mkdir(exist_ok=True)

    total   = len(PROMPTS)
    success = 0
    failed  = []

    print(f"{'='*50}")
    print(f"Formé Fitness — Motivation Image Generator")
    print(f"총 {total}장 | 사이즈 {SIZE} | 품질 {QUALITY}")
    print(f"예상 비용: ${total * 0.041:.2f}")
    print(f"{'='*50}\n")

    for i, (filename, prompt) in enumerate(PROMPTS, 1):
        tier = filename.split('_')[0].upper()
        print(f"[{i:02d}/{total}] {tier} — {filename}...", end=" ", flush=True)

        try:
            response = client.images.generate(
                model="gpt-image-2",
                prompt=prompt,
                size=SIZE,
                quality=QUALITY,
                n=1,
            )

            img_data = image_bytes_from_response(response)
            filepath  = f"{OUTPUT_DIR}/{filename}.jpg"

            with open(filepath, "wb") as f:
                f.write(img_data)

            size_kb = len(img_data) // 1024
            print(f"✅ ({size_kb}KB)")
            success += 1

        except Exception as e:
            print(f"❌ {e}")
            failed.append(filename)

        if i < total:
            time.sleep(SLEEP)

    print(f"\n{'='*50}")
    print(f"완료: {success}/{total}장")
    print(f"저장 위치: {OUTPUT_DIR}/")
    if failed:
        print(f"실패: {failed}")
    print(f"실제 비용: ~${success * 0.041:.2f}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
