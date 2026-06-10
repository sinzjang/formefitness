#!/usr/bin/env python3
"""
Formé Fitness — Motivation Image Generator (Set 2)
동적/감성 컨셉 30장
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


OPENAI_API_KEY = load_openai_api_key()
OUTPUT_DIR     = "./motivation_images_2"
SIZE           = "1024x1536"   # gpt-image: 가로·세로 16의 배수 (1024x1365는 오류)
QUALITY        = "low"        # 1차 배치 — 선별 후 medium 재생성 가능
SLEEP          = 1

# 품질별 장당 예상 비용 (1024x1536 portrait)
COST_PER_IMAGE = {"low": 0.005, "medium": 0.041, "high": 0.165}

PROMPTS = [

    # ── Tier 1 — Lean & Clean ─────────────────────
    ("tier1_m01",
     "A lean athletic male running at full speed on an empty road at sunrise, "
     "motion blur on legs, determined expression, sweat on skin, "
     "wearing minimal running gear, golden morning light from behind, "
     "cinematic wide shot, dramatic sky, "
     "photorealistic, motivational sports photography"),

    ("tier1_m02",
     "A lean fit male doing a jump rope workout outdoors, "
     "caught mid-jump, ropes blurred in motion, intense focused face, "
     "wearing fitted athletic shorts and tank, "
     "urban rooftop setting, bright daylight, "
     "dynamic action shot from low angle, "
     "photorealistic, energetic fitness photography"),

    ("tier1_m03",
     "A lean male looking at his reflection in a gym mirror, "
     "touching his abs with one hand, satisfied but hungry expression, "
     "early morning empty gym, dim warm lighting, "
     "emotional intimate moment, "
     "photorealistic, introspective fitness photography"),

    ("tier1_m04",
     "A lean fit male standing on a mountain peak after a hike, "
     "arms spread wide, victorious pose, looking at vast landscape below, "
     "wearing athletic outdoor gear, wind in hair, "
     "dramatic wide angle shot, golden hour light, "
     "photorealistic, achievement lifestyle photography"),

    ("tier1_m05",
     "A lean male doing a handstand against a white wall, "
     "perfect balance, calm focused expression, "
     "wearing athletic shorts, minimal background, "
     "shot from side showing full body line, "
     "clean editorial lighting, "
     "photorealistic, yoga fitness lifestyle photography"),

    # ── Tier 2 — Everyday Fit ─────────────────────
    ("tier2_m01",
     "A healthy fit male finishing a workout, hands on knees, "
     "breathing hard, sweat dripping, satisfied smile, "
     "empty gym background slightly blurred, "
     "dramatic side lighting highlighting sweat and effort, "
     "photorealistic, raw authentic fitness photography"),

    ("tier2_m02",
     "A fit male walking out of a gym at dawn, "
     "gym bag over shoulder, steam rising from skin in cold air, "
     "streetlights still on, early morning atmosphere, "
     "rear three-quarter shot, cinematic mood, "
     "photorealistic, lifestyle fitness motivation"),

    ("tier2_m03",
     "A healthy fit male doing pull-ups outdoors on a bar in a park, "
     "caught at top position, flexed lats and arms, "
     "trees and morning light in background, "
     "low angle upward shot emphasizing effort and height, "
     "photorealistic, outdoor fitness photography"),

    ("tier2_m04",
     "A fit male writing in a fitness journal after workout, "
     "sitting on gym bench, protein shake beside him, "
     "thoughtful focused expression, planning next session, "
     "warm gym lighting, shallow depth of field, "
     "photorealistic, disciplined lifestyle photography"),

    ("tier2_m05",
     "A fit male doing a cold ice bath recovery, "
     "intense expression managing discomfort, mental toughness visible, "
     "steam rising from contrast of hot body and cold water, "
     "dramatic close-up from shoulders up, "
     "photorealistic, warrior mindset fitness photography"),

    # ── Tier 3 — Toned Up ─────────────────────────
    ("tier3_m01",
     "A toned athletic male doing explosive box jumps in a gym, "
     "caught mid-air at peak height, fully extended body, "
     "intense focused face, sweat flying off body, "
     "dark gym background with dramatic spotlighting, "
     "low angle action shot, "
     "photorealistic, high intensity training photography"),

    ("tier3_m02",
     "A toned male shadow boxing in an empty boxing gym, "
     "caught mid-punch, muscles flexed and visible, "
     "motion blur on fists, intense expression, "
     "dramatic side lighting, dust particles in air, "
     "cinematic sports photography, photorealistic"),

    ("tier3_m03",
     "A toned fit male doing weighted push-ups at 3am in home gym, "
     "only light is a single lamp, shadows dramatic, "
     "mid-rep position showing muscle engagement, "
     "sweat on floor beneath him, "
     "photorealistic, gritty dedication fitness photography"),

    ("tier3_m04",
     "A toned athletic male finishing a set of barbell curls, "
     "veins visible on forearms, peak contraction, "
     "grimacing with effort, looking in mirror, "
     "intense gym lighting with shadows, "
     "close-up on arms and expression, "
     "photorealistic, raw gym photography"),

    ("tier3_m05",
     "A toned male doing muscle-ups on outdoor bars at sunset, "
     "caught at top of movement, city skyline silhouette behind, "
     "golden orange sky, silhouette partially backlit, "
     "powerful dynamic composition, "
     "photorealistic, urban calisthenics photography"),

    # ── Tier 4 — Athletic ─────────────────────────
    ("tier4_m01",
     "A muscular athletic male doing heavy deadlift, "
     "caught at peak lift, bar bending with weight, "
     "face roaring with effort, chalk dust in air, "
     "veins popping in arms and neck, "
     "dramatic low angle shot, dark gym atmosphere, "
     "photorealistic, powerlifting photography"),

    ("tier4_m02",
     "A powerful athletic male training alone in empty warehouse gym, "
     "silhouette against large windows with stormy sky outside, "
     "holding heavy dumbbells, contemplative powerful stance, "
     "dramatic light and shadow, "
     "cinematic mood, photorealistic, elite training photography"),

    ("tier4_m03",
     "A highly athletic male sprinting on a track at night, "
     "stadium lights above creating dramatic shadows, "
     "full speed blur on legs, arms pumping, "
     "intense competitive expression, "
     "low angle action shot, "
     "photorealistic, elite athlete photography"),

    ("tier4_m04",
     "A muscular athletic male doing ring muscle-ups in a CrossFit gym, "
     "caught at peak, fully extended above rings, "
     "massive back and shoulder engagement visible, "
     "chalk dust, dramatic overhead lighting, "
     "shot from below showing full power, "
     "photorealistic, functional fitness photography"),

    ("tier4_m05",
     "An athletic male staring down heavy loaded barbell before a squat, "
     "psychological preparation moment, intense concentrated expression, "
     "teammates blurred in background, "
     "sweat and chalk everywhere, dramatic gym lighting, "
     "close-up on face and upper body with bar on shoulders, "
     "photorealistic, competitive lifting photography"),

    # ── Tier 5 — Sculpted ─────────────────────────
    ("tier5_m01",
     "A sculpted fitness model male posing dramatically in harsh rain, "
     "water streaming over defined muscles, "
     "standing shirtless in storm, looking up at sky, "
     "cinematic dramatic lighting with lightning in background, "
     "full body power shot, "
     "photorealistic, editorial fitness photography"),

    ("tier5_m02",
     "A sculpted male doing a one-arm pull-up on a cliff edge, "
     "ocean far below, extreme height visible, "
     "muscles maximally contracted and defined, "
     "fearless expression, golden sunrise behind, "
     "dramatic wide composition showing scale, "
     "photorealistic, extreme athlete photography"),

    ("tier5_m03",
     "A highly sculpted male waking up at 5am, "
     "alarm clock showing 5:00, getting out of bed motivated, "
     "physique visible in morning light, "
     "disciplined warrior expression, "
     "moody cinematic bedroom lighting, "
     "photorealistic, discipline over motivation photography"),

    ("tier5_m04",
     "A sculpted male flipping a massive tire in outdoor training, "
     "caught mid-flip, muscles fully engaged and defined, "
     "sweat and dirt, industrial outdoor setting, "
     "dramatic low angle shot showing raw power, "
     "overcast dramatic sky, "
     "photorealistic, warrior training photography"),

    ("tier5_m05",
     "A fitness model male training shirtless in heavy snow outdoors, "
     "snowflakes falling on defined muscles, "
     "doing push-ups in snow, mental toughness expression, "
     "dramatic winter atmosphere, breath steam visible, "
     "photorealistic, extreme dedication fitness photography"),

    # ── Tier 6 — Elite ────────────────────────────
    ("tier6_m01",
     "A massive elite bodybuilder walking onto competition stage, "
     "spotlight hitting oiled physique, crowd blurred behind, "
     "confident powerful entrance, "
     "dramatic stage lighting making muscles look three-dimensional, "
     "cinematic moment of arrival, "
     "photorealistic, bodybuilding competition photography"),

    ("tier6_m02",
     "An enormous elite bodybuilder training alone at midnight, "
     "empty gym, single hanging bulb light, "
     "doing brutal heavy sets, sweat pouring, "
     "dark shadows emphasizing massive muscle size, "
     "gritty underground gym aesthetic, "
     "photorealistic, hardcore bodybuilding photography"),

    ("tier6_m03",
     "A massive bodybuilder sitting quietly before competition, "
     "head down in meditation and focus, "
     "backstage moment of mental preparation, "
     "dramatic moody lighting, emotional intimate shot, "
     "photorealistic, behind the scenes competition photography"),

    ("tier6_m04",
     "An elite bodybuilder doing a victory pose after winning a trophy, "
     "arm raised holding trophy, euphoric expression, "
     "stage lights and confetti, crowd cheering behind, "
     "cinematic celebration moment, "
     "photorealistic, championship victory photography"),

    ("tier6_m05",
     "A massive elite bodybuilder training at sunrise on a beach, "
     "doing overhead press with heavy log, "
     "waves crashing behind, dawn light hitting physique, "
     "primal powerful atmosphere, "
     "dramatic wide shot showing man versus nature scale, "
     "photorealistic, legendary training photography"),
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


def validate_config() -> list[str]:
    """실행 전 무결성 검사 — 문제 목록 반환 (비어 있으면 OK)"""
    issues: list[str] = []
    if not OPENAI_API_KEY:
        issues.append("API 키 없음 — .env에 EXPO_PUBLIC_OPENAI_API_KEY 설정 필요")
    elif OPENAI_API_KEY == "YOUR_API_KEY_HERE":
        issues.append("플레이스홀더 API 키 — 실제 키로 교체 필요")

    try:
        w, h = (int(x) for x in SIZE.split("x"))
        if w % 16 != 0 or h % 16 != 0:
            issues.append(f"SIZE {SIZE} — 가로·세로가 16의 배수여야 함 (현재 w%16={w % 16}, h%16={h % 16})")
    except ValueError:
        issues.append(f"SIZE 형식 오류: {SIZE}")

    if len(PROMPTS) != 30:
        issues.append(f"PROMPTS 개수 {len(PROMPTS)} — 예상 30개")

    ids = [p[0] for p in PROMPTS]
    if len(ids) != len(set(ids)):
        issues.append("PROMPTS 파일명 중복")

    return issues


# ── 메인 ──────────────────────────────────────────
def main():
    issues = validate_config()
    if issues:
        print("❌ 무결성 검사 실패:")
        for issue in issues:
            print(f"  - {issue}")
        raise SystemExit(1)

    print("✅ 무결성 검사 통과")
    print(f"  - API 키: 로드됨 ({len(OPENAI_API_KEY)}자)")
    print(f"  - SIZE: {SIZE}")
    print(f"  - OUTPUT: {OUTPUT_DIR}/")
    print(f"  - PROMPTS: {len(PROMPTS)}장\n")

    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    Path(OUTPUT_DIR).mkdir(exist_ok=True)

    total   = len(PROMPTS)
    success = 0
    failed  = []

    print(f"{'='*55}")
    print(f"Formé Fitness — Motivation Images Set 2 (Dynamic)")
    unit_cost = COST_PER_IMAGE.get(QUALITY, 0.041)
    print(f"총 {total}장 | {SIZE} | {QUALITY} | 예상 비용 ${total * unit_cost:.2f}")
    print(f"{'='*55}\n")

    for i, (filename, prompt) in enumerate(PROMPTS, 1):
        tier = filename.split('_')[0].upper()
        print(f"[{i:02d}/{total}] {tier} — {filename}...", end=" ", flush=True)

        for attempt in range(3):
            try:
                response = client.images.generate(
                    model="gpt-image-2",
                    prompt=prompt,
                    size=SIZE,
                    quality=QUALITY,
                    n=1,
                )
                img_data = image_bytes_from_response(response)
                filepath = f"{OUTPUT_DIR}/{filename}.jpg"
                with open(filepath, "wb") as f:
                    f.write(img_data)
                size_kb = len(img_data) // 1024
                print(f"✅ ({size_kb}KB)")
                success += 1
                break
            except Exception as e:
                if attempt == 2:
                    print(f"❌ {e}")
                    failed.append(filename)
                else:
                    time.sleep(2)

        time.sleep(SLEEP)

    print(f"\n{'='*55}")
    print(f"완료: {success}/{total}장")
    print(f"저장: {OUTPUT_DIR}/")
    if failed:
        print(f"실패: {failed}")
    print(f"실제 비용: ~${success * unit_cost:.2f}")
    print(f"{'='*55}")


if __name__ == "__main__":
    main()
