#!/usr/bin/env python3
"""
Formé Fitness — Motivation Image Generator (Set 3)
커플/소셜/파티 컨셉 30장
v1 오류 전부 수정 반영
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


def image_bytes_from_response(image_data) -> bytes:
    """gpt-image-2 응답 → JPEG bytes (b64_json 또는 url)"""
    if getattr(image_data, "b64_json", None):
        return base64.b64decode(image_data.b64_json)
    if getattr(image_data, "url", None):
        with urllib.request.urlopen(image_data.url, timeout=120) as resp:
            return resp.read()
    raise ValueError("응답에 b64_json/url 이미지 데이터가 없습니다")


def validate_config() -> list[str]:
    """실행 전 무결성 검사"""
    issues: list[str] = []
    if not OPENAI_API_KEY:
        issues.append("API 키 없음 — .env에 EXPO_PUBLIC_OPENAI_API_KEY 설정 필요")
    elif OPENAI_API_KEY == "YOUR_API_KEY_HERE":
        issues.append("플레이스홀더 API 키 — 실제 키로 교체 필요")

    try:
        w, h = (int(x) for x in SIZE.split("x"))
        if w % 16 != 0 or h % 16 != 0:
            issues.append(f"SIZE {SIZE} — 가로·세로가 16의 배수여야 함")
    except ValueError:
        issues.append(f"SIZE 형식 오류: {SIZE}")

    if len(PROMPTS) != 30:
        issues.append(f"PROMPTS 개수 {len(PROMPTS)} — 예상 30개")

    ids = [p[0] for p in PROMPTS]
    if len(ids) != len(set(ids)):
        issues.append("PROMPTS 파일명 중복")

    return issues


OPENAI_API_KEY = load_openai_api_key()
OUTPUT_DIR     = "./motivation_images_3"
SIZE           = "1024x1536"   # 2:3 세로, 16의 배수
QUALITY        = "low"         # 1차 배치 — 선별 후 medium 재생성 가능
SLEEP          = 1

COST_PER_IMAGE = {"low": 0.005, "medium": 0.041, "high": 0.165}

# ── 프롬프트 ──────────────────────────────────────
PROMPTS = [

    # ── 함께 운동하는 커플 ─────────────────────────
    ("couple_01",
     "A fit athletic couple working out together in a modern gym, "
     "man spotting woman on bench press, both smiling and focused, "
     "matching athletic wear, warm gym lighting, "
     "genuine connection and teamwork visible, "
     "photorealistic, fitness couple lifestyle photography"),

    ("couple_02",
     "A fit man and woman doing partner stretching on yoga mats, "
     "he is gently pressing her back in a stretch, "
     "both in athletic wear, soft natural morning light, "
     "intimate helpful moment, calm and connected atmosphere, "
     "photorealistic, wellness couple photography"),

    ("couple_03",
     "A muscular man and toned woman doing synchronized pull-ups "
     "on side-by-side bars outdoors, both at top position, "
     "laughing and competing playfully, "
     "urban park setting, golden hour light, "
     "photorealistic, active couple lifestyle photography"),

    ("couple_04",
     "A fit couple finishing a run together at sunrise, "
     "he has his arm around her shoulders, both breathing hard, "
     "sweaty and glowing, satisfied smiles, "
     "empty road with beautiful sunrise behind them, "
     "photorealistic, romantic active lifestyle photography"),

    ("couple_05",
     "A toned woman doing dumbbell curls while her athletic boyfriend "
     "watches with admiration and encouragement, "
     "she is focused and determined, he is proud, "
     "modern gym setting, warm lighting, "
     "photorealistic, supportive couple fitness photography"),

    # ── 몸 체크 / 셀프 체크 ────────────────────────
    ("check_01",
     "A fit male in his late 20s checking his abs in a mirror "
     "after a workout, touching his defined stomach, "
     "surprised and pleased expression, "
     "modern bathroom with good lighting, "
     "intimate personal moment, "
     "photorealistic, fitness transformation photography"),

    ("check_02",
     "A toned woman measuring her waist with a tape measure, "
     "proud smile looking at the number, "
     "wearing athletic crop top and leggings, "
     "bright modern bedroom, motivational posters on wall, "
     "photorealistic, fitness progress lifestyle photography"),

    ("check_03",
     "A muscular male flexing in a gym mirror, "
     "his girlfriend standing beside him, "
     "she is touching his bicep with impressed expression, "
     "he is smiling confidently, "
     "gym locker room setting, warm lighting, "
     "photorealistic, relationship fitness photography"),

    ("check_04",
     "A fit couple standing side by side in front of a mirror, "
     "both flexing and laughing, comparing progress, "
     "matching gym outfits, playful competitive energy, "
     "modern gym background, "
     "photorealistic, fun couple fitness photography"),

    ("check_05",
     "A toned female athlete examining her shoulder muscle definition "
     "in a mirror post-workout, focused analytical expression, "
     "athletic crop top, sweat still on skin, "
     "clean gym lighting, "
     "photorealistic, self-improvement fitness photography"),

    # ── 파티 / 소셜 / 인기남 인기녀 ───────────────
    ("party_01",
     "A highly fit attractive male at an upscale rooftop party, "
     "wearing fitted white shirt that shows his physique, "
     "surrounded by people, center of attention, "
     "confident relaxed smile, city lights behind at night, "
     "photorealistic, social lifestyle aspirational photography"),

    ("party_02",
     "A beautifully toned woman at a beach party, "
     "wearing stylish swimwear showing her fit figure, "
     "laughing with group of friends, "
     "everyone around her engaged and attracted, "
     "golden sunset beach setting, "
     "photorealistic, aspirational social lifestyle photography"),

    ("party_03",
     "A fit muscular male walking into a rooftop bar, "
     "people turning to look, he is confident and smiling, "
     "wearing casual fitted clothing that shows his build, "
     "city skyline at night, warm ambient lighting, "
     "photorealistic, aspirational social confidence photography"),

    ("party_04",
     "A fit attractive couple arriving at an upscale party together, "
     "both dressed stylishly, his physique visible in fitted suit jacket, "
     "her toned figure in elegant dress, "
     "people admiring them as they enter, "
     "photorealistic, power couple lifestyle photography"),

    ("party_05",
     "A fit male dancing confidently at a social event, "
     "wearing a fitted open-collar shirt, "
     "friendly group of people nearby enjoying the music, "
     "warm ambient lighting, positive social energy, "
     "photorealistic, social confidence fitness lifestyle"),

    # ── 감성 / 친밀감 ──────────────────────────────
    ("intimate_01",
     "A fit athletic couple sitting on a beach at sunset, "
     "his arm around her, her head on his shoulder, "
     "both in casual summer athletic wear, "
     "warm golden hour light, peaceful intimate atmosphere, "
     "photorealistic, romantic fitness lifestyle photography"),

    ("intimate_02",
     "A muscular man gently placing his hands on his girlfriend's waist "
     "as she shows him her progress in the mirror, "
     "she is proud, he is supportive and affectionate, "
     "natural home setting with soft lighting, "
     "photorealistic, loving couple fitness journey photography"),

    ("intimate_03",
     "A fit couple cooking a healthy meal together in a modern kitchen, "
     "he is shirtless showing his physique, she is in athletic wear, "
     "laughing and enjoying each other's company, "
     "warm kitchen lighting, "
     "photorealistic, healthy lifestyle couple photography"),

    ("intimate_04",
     "A fit couple sitting together on a gym floor after a workout, "
     "leaning shoulder to shoulder, tired but happy smiles, "
     "both in athletic wear, sweat visible, soft gym lighting, "
     "photorealistic, authentic couple fitness photography"),

    ("intimate_05",
     "A fit couple on a morning jog, he reaches for her hand "
     "while they run, both smiling, "
     "beautiful sunrise park setting, "
     "motion and connection simultaneously captured, "
     "photorealistic, romantic active lifestyle photography"),

    # ── 변신 전후 / 자신감 ──────────────────────────
    ("confidence_01",
     "A fit male walking down a city street with total confidence, "
     "fitted clothes showing his athletic build, "
     "people noticing him, he is focused and purposeful, "
     "vibrant city setting, golden afternoon light, "
     "photorealistic, aspirational lifestyle photography"),

    ("confidence_02",
     "A toned fit woman walking into a gym, "
     "head held high, determined expression, "
     "other gym-goers noticing her presence, "
     "she owns the room, athletic wear, "
     "photorealistic, female empowerment fitness photography"),

    ("confidence_03",
     "A muscular male at a pool party, shirtless and confident, "
     "people gravitating toward him naturally, "
     "relaxed smile, effortless social magnetism, "
     "sunny pool setting, summer vibes, "
     "photorealistic, aspirational social lifestyle photography"),

    ("confidence_04",
     "A fit attractive woman in a summer dress at an outdoor café, "
     "her toned arms and physique visible, "
     "men at nearby tables noticing her, "
     "she is relaxed reading a book, unbothered and confident, "
     "photorealistic, elegant lifestyle fitness photography"),

    ("confidence_05",
     "A fit male receiving a compliment from an attractive woman "
     "at a social event, he is humbly smiling, "
     "his physique visible in well-fitted casual clothes, "
     "warm social atmosphere, "
     "photorealistic, social reward fitness lifestyle photography"),

    # ── 함께하는 목표 / 동기부여 ───────────────────
    ("goal_01",
     "A fit couple high-fiving after completing a hard workout together, "
     "both exhausted but victorious, big smiles, "
     "empty gym at night, dramatic lighting, "
     "pure joy and shared achievement, "
     "photorealistic, couple fitness goal photography"),

    ("goal_02",
     "A group of fit friends celebrating after a race, "
     "arms around each other, medals around necks, "
     "fit bodies in athletic gear, pure happiness, "
     "finish line setting, "
     "photorealistic, community fitness lifestyle photography"),

    ("goal_03",
     "A fit male and female personal trainer moment, "
     "she is completing a difficult rep, he is coaching intensely, "
     "genuine hard work and connection between them, "
     "gym setting, dramatic lighting, "
     "photorealistic, fitness mentorship photography"),

    ("goal_04",
     "A toned woman showing her fit boyfriend her progress photo "
     "on her phone, he is amazed and proud, "
     "sitting together on couch in athletic wear, "
     "warm home atmosphere, "
     "photorealistic, relationship fitness journey photography"),

    ("goal_05",
     "A fit couple taking a selfie at the gym after a workout, "
     "both flexing and laughing, sweaty and happy, "
     "genuine fun moment between two people who work hard together, "
     "gym mirror reflection shot, "
     "photorealistic, authentic couple fitness photography"),
]

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
    print(f"  - QUALITY: {QUALITY}")
    print(f"  - OUTPUT: {OUTPUT_DIR}/")
    print(f"  - PROMPTS: {len(PROMPTS)}장")

    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    Path(OUTPUT_DIR).mkdir(exist_ok=True)

    total   = len(PROMPTS)
    success = 0
    failed  = []
    unit_cost = COST_PER_IMAGE.get(QUALITY, 0.041)

    print(f"\n{'='*55}")
    print(f"Formé Fitness — Motivation Images Set 3")
    print(f"커플 / 소셜 / 파티 / 감성 컨셉 {total}장")
    print(f"SIZE {SIZE} | QUALITY {QUALITY}")
    print(f"예상 비용: ${total * unit_cost:.2f}")
    print(f"{'='*55}\n")

    for i, (filename, prompt) in enumerate(PROMPTS, 1):
        category = filename.split('_')[0]
        print(f"[{i:02d}/{total}] {category} — {filename}...", end=" ", flush=True)

        for attempt in range(3):
            try:
                response = client.images.generate(
                    model="gpt-image-2",
                    prompt=prompt,
                    size=SIZE,
                    quality=QUALITY,
                    n=1,
                )

                img_bytes = image_bytes_from_response(response.data[0])
                filepath  = f"{OUTPUT_DIR}/{filename}.jpg"

                with open(filepath, "wb") as f:
                    f.write(img_bytes)

                size_kb = len(img_bytes) // 1024
                print(f"✅ ({size_kb}KB)")
                success += 1
                break

            except Exception as e:
                if attempt == 2:
                    print(f"❌ {e}")
                    failed.append(filename)
                else:
                    print(f"재시도 {attempt+2}/3...", end=" ", flush=True)
                    time.sleep(3)

        time.sleep(SLEEP)

    print(f"\n{'='*55}")
    print(f"완료: {success}/{total}장")
    print(f"저장: {OUTPUT_DIR}/")
    if failed:
        print(f"실패 ({len(failed)}개): {failed}")
    print(f"실제 비용: ~${success * unit_cost:.2f}")
    print(f"{'='*55}")


if __name__ == "__main__":
    main()
