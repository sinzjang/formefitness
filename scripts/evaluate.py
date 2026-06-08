#!/usr/bin/env python3
"""
Formé Fitness — Exercise Importance Evaluator
Step 1: 중요도 평가만 수행

실행:
  python scripts/evaluate.py              # 전체
  python scripts/evaluate.py --limit 100  # 드라이런
  python scripts/evaluate.py --resume     # 중단 지점부터 이어하기
"""

import argparse
import json
import sys
import time
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv

# ── 경로 / 환경변수 ───────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
ANTHROPIC_API_KEY = os.environ.get("EXPO_PUBLIC_ANTHROPIC_API_KEY")
MODEL = os.environ.get("EXPO_PUBLIC_ANTHROPIC_MODEL", "claude-sonnet-4-6")

# ── 설정 ──────────────────────────────────────────
INPUT_FILE = ROOT / "src/data/exercisedb_full.json"
OUTPUT_FILE = ROOT / "src/data/exercises_evaluated.json"
PARTIAL_DIR = ROOT / "src/data/eval_partials"
BATCH_SIZE = 25
MAX_TOKENS = 8192
RETRY_LIMIT = 3
SLEEP_BETWEEN_BATCHES = 1


def log(msg: str):
    print(msg, flush=True)

# ── 시스템 프롬프트 ────────────────────────────────
SYSTEM_PROMPT = """
<role>
  당신은 피트니스 앱을 위한 운동 데이터베이스 큐레이터입니다.
  타겟 유저는 헬스 1~3년차 일반인입니다.
  각 운동의 중요도를 평가해서 앱에 포함할지 결정합니다.
</role>

<task>
  입력된 운동 배열을 평가하고 JSON 배열만 반환하세요.
  다른 텍스트, 설명, 마크다운 코드블록은 절대 포함하지 마세요.
</task>

<output_fields>
  <field name="id">입력된 id 그대로</field>
  <field name="importance">1~5 정수</field>
  <field name="type">compound 또는 isolation</field>
  <field name="tier">beginner, intermediate, advanced 중 하나</field>
  <field name="include">true 또는 false</field>
  <field name="reason">선정 이유 한 문장 (영문)</field>
</output_fields>

<importance_criteria>
  <score value="5" label="Essential">
    Every gym-goer must know this exercise.
    <examples>
      Barbell Bench Press, Barbell Squat, Deadlift,
      Pull-up, Barbell Shoulder Press, Barbell Row,
      Dumbbell Curl, Tricep Pushdown, Plank
    </examples>
  </score>
  <score value="4" label="Common">
    Widely used, beginner to intermediate knows this.
    <examples>
      Incline Bench Press, Leg Press, Romanian Deadlift,
      Lat Pulldown, Dumbbell Fly, Cable Row, Leg Curl
    </examples>
  </score>
  <score value="3" label="Useful">
    Intermediate lifters add this to their routine.
    <examples>
      Face Pull, Preacher Curl, Hack Squat,
      Cable Crossover, Reverse Fly, Goblet Squat
    </examples>
  </score>
  <score value="2" label="Advanced/Variation">
    Specific purpose or advanced variation.
    <examples>
      Paused Bench Press, Deficit Deadlift,
      Single Leg Romanian Deadlift, Tempo Squat
    </examples>
  </score>
  <score value="1" label="Exclude">
    Duplicate variation (v.2, v.3, alternative),
    very niche rehab exercise,
    or exercise almost no one does.
    <rule>
      If name contains "v.2", "v.3", "(variation)",
      "(alternative)", "version" → score 1 automatically.
    </rule>
  </score>
</importance_criteria>

<type_criteria>
  <type value="compound">
    Multi-joint movement, multiple muscle groups.
    Examples: Bench Press, Squat, Deadlift, Pull-up
  </type>
  <type value="isolation">
    Single-joint, targets one muscle group.
    Examples: Bicep Curl, Leg Extension, Lateral Raise
  </type>
</type_criteria>

<tier_criteria>
  <tier value="beginner">Safe for beginners, simple form</tier>
  <tier value="intermediate">Requires basic strength and form mastery</tier>
  <tier value="advanced">High skill level or special equipment required</tier>
</tier_criteria>

<include_rule>
  importance >= 3 → include: true
  importance <= 2 → include: false
</include_rule>
"""

FEW_SHOT = """
<example>
  <input>
    [
      {"id":"0001","name":"Barbell Bench Press","bodyPart":"chest","target":"pectorals","equipment":"barbell","secondaryMuscles":["triceps","deltoids"]},
      {"id":"0002","name":"Incline Dumbbell Press","bodyPart":"chest","target":"pectorals","equipment":"dumbbell","secondaryMuscles":["triceps"]},
      {"id":"0003","name":"Bench Press v.2 (narrow grip alternative)","bodyPart":"chest","target":"pectorals","equipment":"barbell","secondaryMuscles":["triceps"]},
      {"id":"0004","name":"Dumbbell Bicep Curl","bodyPart":"upper arms","target":"biceps","equipment":"dumbbell","secondaryMuscles":["forearms"]},
      {"id":"0005","name":"Face Pull","bodyPart":"shoulders","target":"deltoids","equipment":"cable","secondaryMuscles":["traps","rotator cuff"]}
    ]
  </input>
  <output>
    [
      {"id":"0001","importance":5,"type":"compound","tier":"beginner","include":true,"reason":"Fundamental chest exercise, essential for all gym-goers"},
      {"id":"0002","importance":4,"type":"compound","tier":"beginner","include":true,"reason":"Key upper chest variation, widely used"},
      {"id":"0003","importance":1,"type":"compound","tier":"intermediate","include":false,"reason":"Duplicate v.2 variation, redundant with standard bench press"},
      {"id":"0004","importance":5,"type":"isolation","tier":"beginner","include":true,"reason":"Primary bicep isolation exercise, essential"},
      {"id":"0005","importance":3,"type":"isolation","tier":"intermediate","include":true,"reason":"Effective rear delt and rotator cuff exercise for intermediate lifters"}
    ]
  </output>
</example>
"""


# ── 함수 ──────────────────────────────────────────

def norm_id(value) -> str:
    s = str(value or "").strip()
    return s.zfill(4) if s.isdigit() else s


def fallback_results(batch: list, reason: str) -> list:
    return [{
        "id": ex.get("id", ""),
        "importance": 0,
        "type": "unknown",
        "tier": "beginner",
        "include": False,
        "reason": reason,
    } for ex in batch]


def load_exercises(filepath: Path) -> list:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    # 배열 또는 {"exercises": [...]} 구조 모두 처리
    if isinstance(data, list):
        exercises = data
    else:
        exercises = data.get("exercises", data)
    log(f"✅ {len(exercises)}개 운동 로드")
    return exercises


def evaluate_batch(
    client: anthropic.Anthropic,
    batch: list,
    batch_num: int,
    total: int
) -> list:
    # Claude에게 필요한 필드만 전달 (토큰 절약)
    slim = [{
        "id":               ex.get("id", ""),
        "name":             ex.get("name", ""),
        "bodyPart":         ex.get("bodyPart", ""),
        "target":           ex.get("target", ""),
        "equipment":        ex.get("equipment", ""),
        "secondaryMuscles": ex.get("secondaryMuscles", [])
    } for ex in batch]

    user_msg = f"""
{FEW_SHOT}

<request>
  Evaluate the following {len(slim)} exercises.
  Return JSON array only. No markdown, no explanation.
</request>

<exercises>
{json.dumps(slim, ensure_ascii=False)}
</exercises>
"""

    for attempt in range(RETRY_LIMIT):
        try:
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}]
            )

            raw = response.content[0].text.strip()

            # 마크다운 코드블록 제거
            if "```" in raw:
                parts = raw.split("```")
                raw = parts[1] if len(parts) > 1 else raw
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            results = json.loads(raw)

            if len(results) != len(batch):
                log(f"  ⚠️  개수 불일치: 입력 {len(batch)} → 결과 {len(results)} — 재시도")
                if attempt < RETRY_LIMIT - 1:
                    time.sleep(2)
                    continue
                return fallback_results(batch, "count mismatch - needs manual review")

            log(f"  ✅ 배치 {batch_num}/{total} 완료 ({len(results)}개)")
            return results

        except json.JSONDecodeError as e:
            log(f"  ❌ JSON 파싱 실패 (시도 {attempt+1}/{RETRY_LIMIT}): {e}")
            if attempt < RETRY_LIMIT - 1:
                time.sleep(2)
            else:
                log(f"  ⚠️  배치 {batch_num} 기본값 대체 (수동 검토 필요)")
                return fallback_results(batch, "evaluation failed - needs manual review")

        except anthropic.APIError as e:
            log(f"  ❌ API 오류 (시도 {attempt+1}/{RETRY_LIMIT}): {e}")
            time.sleep(5)

    return fallback_results(batch, "api error - needs manual review")


def merge(exercises: list, evaluations: list) -> list:
    eval_map = {norm_id(e.get("id", "")): e for e in evaluations}
    merged = []

    for ex in exercises:
        ev = eval_map.get(norm_id(ex.get("id", "")), {})
        importance = max(0, min(5, int(ev.get("importance", 0))))

        merged.append({
            # 원본 필드 유지
            **ex,
            # 평가 결과 추가
            "importance": importance,
            "type":       ev.get("type", "unknown"),
            "tier":       ev.get("tier", "beginner"),
            "include":    importance >= 3,
            "reason":     ev.get("reason", "")
        })

    # importance 내림차순 정렬
    merged.sort(key=lambda x: x["importance"], reverse=True)
    return merged


def print_summary(data: list):
    print("\n" + "=" * 45)
    print("평가 결과 요약")
    print("=" * 45)
    for score in [5, 4, 3, 2, 1, 0]:
        count = sum(1 for ex in data if ex["importance"] == score)
        if count == 0:
            continue
        label = "✅ 포함" if score >= 3 else "❌ 제외"
        if score == 0:
            label = "⚠️  검토"
        print(f"  importance {score}: {count:5d}개  {label}")

    included = sum(1 for ex in data if ex["include"])
    review   = sum(1 for ex in data if ex["importance"] == 0)
    print(f"\n  앱 포함:   {included}개")
    print(f"  제외:      {len(data) - included - review}개")
    if review:
        print(f"  수동검토:  {review}개")
    print(f"  전체:      {len(data)}개")


def save_partial(comercises: list, all_evals: list, batch_num: int, completed_merged: list | None = None):
    PARTIAL_DIR.mkdir(parents=True, exist_ok=True)
    path = PARTIAL_DIR / f"batch_{batch_num:03d}.json"
    new_part = merge(exercises[: len(all_evals)], all_evals)
    partial = (completed_merged or []) + new_part
    partial.sort(key=lambda x: x.get("importance", 0), reverse=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(partial, f, ensure_ascii=False, indent=2)
    log(f"  💾 중간 저장: {path} ({len(partial)}건)")


def load_latest_partial() -> list:
    """eval_partials/ 최신 배치 파일 로드"""
    if not PARTIAL_DIR.exists():
        return []
    partials = sorted(PARTIAL_DIR.glob("batch_*.json"))
    if not partials:
        return []
    latest = partials[-1]
    with open(latest, "r", encoding="utf-8") as f:
        data = json.load(f)
    log(f"♻️  이어하기: {latest.name} ({len(data)}건 완료)")
    return data


# ── 메인 ──────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="ExerciseDB importance evaluator")
    parser.add_argument("--limit", type=int, default=0, help="처음 N개만 평가 (드라이런)")
    parser.add_argument("--resume", action="store_true", help="중간 저장본부터 이어하기")
    args = parser.parse_args()

    log("=" * 45)
    log("Formé Fitness — Importance Evaluator")
    log(f"Model: {MODEL}")
    log("=" * 45)

    if not ANTHROPIC_API_KEY:
        log("❌ EXPO_PUBLIC_ANTHROPIC_API_KEY 환경변수가 없습니다.")
        log(f"   {ROOT / '.env'} 확인")
        return

    if not INPUT_FILE.exists():
        log(f"❌ 입력 파일 없음: {INPUT_FILE}")
        log("   npm run exercisedb:fetch 먼저 실행")
        return

    exercises = load_exercises(INPUT_FILE)
    output_file = OUTPUT_FILE
    completed_merged: list = []

    if args.limit > 0:
        exercises = exercises[: args.limit]
        output_file = ROOT / "src/data/exercises_evaluated_sample.json"
        log(f"🔬 드라이런: {len(exercises)}개만 평가 → {output_file.name}")
    elif args.resume:
        completed_merged = load_latest_partial()
        if completed_merged:
            done_ids = {norm_id(ex.get("id", "")) for ex in completed_merged}
            exercises = [ex for ex in exercises if norm_id(ex.get("id", "")) not in done_ids]
            log(f"⏩ 남은 {len(exercises)}건 평가 예정")

    if not exercises and completed_merged:
        log("✅ 이미 전체 평가 완료 — 최종 파일만 저장")
        final = sorted(completed_merged, key=lambda x: x.get("importance", 0), reverse=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(final, f, ensure_ascii=False, indent=2)
        print_summary(final)
        log(f"\n✅ 저장 완료: {output_file}")
        return

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    total_batches = (len(exercises) + BATCH_SIZE - 1) // BATCH_SIZE
    all_evals: list = []
    start_batch = len(completed_merged) // BATCH_SIZE

    log(f"\n총 {total_batches}개 배치 시작 ({BATCH_SIZE}개/배치)")
    log(f"예상 시간: 약 {total_batches * 10 // 60}~{total_batches * 15 // 60}분")
    log("-" * 45)

    for i in range(0, len(exercises), BATCH_SIZE):
        batch     = exercises[i:i + BATCH_SIZE]
        batch_num = start_batch + i // BATCH_SIZE + 1

        results = evaluate_batch(client, batch, batch_num, start_batch + total_batches)
        all_evals.extend(results)

        global_batch_num = (len(completed_merged) + len(all_evals) + BATCH_SIZE - 1) // BATCH_SIZE
        if global_batch_num % 5 == 0 and len(all_evals) % BATCH_SIZE == 0:
            save_partial(exercises, all_evals, global_batch_num, completed_merged)

        time.sleep(SLEEP_BETWEEN_BATCHES)

    # 최종 병합 및 저장
    log("\n최종 병합 중...")
    new_merged = merge(exercises, all_evals)
    final = completed_merged + new_merged
    final.sort(key=lambda x: x.get("importance", 0), reverse=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    print_summary(final)
    log(f"\n✅ 저장 완료: {output_file}")
    log(f"예상 비용: ~${(len(completed_merged) + len(exercises)) * 0.001:.2f}")


if __name__ == "__main__":
    main()
