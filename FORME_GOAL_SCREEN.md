# Formé Fitness — Goal Screen
# Implementation Guide for Cursor/AI
# Version 1.0 | June 2026

---

## Overview

Goal 버튼은 두 가지 상태를 가집니다.

```
첫 진입 (Goal 없음)  → 위저드 모달 (FORME_GOAL_WIZARD.md 참고)
이후 진입 (Goal 있음) → Goal 전용 스크린 (이 파일)
```

Goal 스크린은 Progress 탭 내부 섹션입니다. 별도 탭이 아닙니다.

---

## 진입 로직

```typescript
// Progress 탭 또는 Home 카드의 Goal 버튼 탭 시
const handleGoalPress = async (userId: string) => {
  const { data: activeGoal } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!activeGoal) {
    // 첫 진입 → 위저드 모달
    openGoalWizardModal()
  } else {
    // 이후 진입 → Goal 스크린
    navigateTo('GoalScreen', { goalId: activeGoal.id })
  }
}
```

---

## Goal 스크린 구조

```
┌────────────────────────────────┐
│  🎯 Athletic        D+47       │  ← Goal 요약 헤더
│  ████████░░░  47% 달성         │
│                   [목표 수정]   │
├────────────────────────────────┤
│  [나의 변화]    [목표 비교]     │  ← 2개 탭
├────────────────────────────────┤
│                                │
│         탭 콘텐츠               │
│                                │
├────────────────────────────────┤
│  + 오늘 사진 추가               │  ← 하단 고정
└────────────────────────────────┘
```

---

## 탭 1 — 나의 변화

### 화면 구조

```
┌──────────────┬──────────────┐
│   이전 사진   │   현재 사진   │
│              │              │
│  D+0         │  D+47        │
│  2026.04.01  │  2026.05.18  │
│              │              │
│  (없으면 +)   │  (없으면 +)   │
└──────────────┴──────────────┘

← 왼쪽 스와이프로 더 이전 사진

⚠️ 두 사진이 13일 차이예요.
   30일 이상 간격 비교를 추천합니다.

[AI 분석]
```

### 사진 상태

```
현재 사진 (오른쪽)
→ 가장 최근 체크인 사진 고정
→ 없으면 + 버튼 표시

이전 사진 (왼쪽)
→ 기본값: 바로 직전 체크인 사진
→ 없으면 + 버튼 표시
→ 스와이프로 더 이전 사진으로 이동
   D+90 ← D+60 ← D+30 ← D+0
```

### 날짜 간격 경고 로직

```typescript
const PHOTO_WARNING_DAYS = 14  // 14일 미만이면 경고
const PHOTO_RECOMMEND_DAYS = 30 // 30일 이상 권장

const getDateWarning = (prevDate: string, currentDate: string) => {
  const days = Math.floor(
    (new Date(currentDate).getTime() - new Date(prevDate).getTime()) /
    (1000 * 60 * 60 * 24)
  )

  if (days < PHOTO_WARNING_DAYS) {
    return {
      type: 'warning',
      message: `두 사진이 ${days}일 차이예요. 시각적 변화가 미미할 수 있어요. 30일 이상 간격 비교를 추천합니다.`
    }
  }

  if (days >= 90) {
    return {
      type: 'info',
      message: `${days}일 간격 비교입니다. 변화가 잘 보일 거예요!`
    }
  }

  return null
}
```

### AI 분석 버튼

```
두 사진이 모두 선택된 상태에서만 활성화
탭 시 → Claude API 호출 → 분석 결과 카드 표시
```

---

## 탭 2 — 목표 비교

### 화면 구조

```
┌──────────────┬──────────────┐
│  나의 현재    │   목표 이미지  │
│              │              │
│  (최근 사진)  │  (Goal 생성  │
│              │   이미지)     │
│  D+47        │  Tier 4      │
│  오늘         │  Athletic    │
└──────────────┴──────────────┘

[AI 분석]
```

---

## AI 분석 — 핵심 설계

### 참조하는 데이터 전체

```typescript
const buildGoalAnalysisContext = async (userId: string, goalId: string) => {
  // 1. Goal 설정 위저드 답변
  const { data: goal } = await supabase
    .from('user_goals')
    .select('*')
    .eq('id', goalId)
    .single()

  // 2. 전체 운동 히스토리
  const { data: workouts } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_sets (
        exercise_id,
        weight,
        reps,
        set_number,
        completed_at
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  // 3. PR 기록
  const { data: prs } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })

  // 4. 근육 피로 기록
  const { data: fatigue } = await supabase
    .from('muscle_fatigue')
    .select('*')
    .eq('user_id', userId)

  // 5. 체크인 사진 날짜 목록
  const { data: checkins } = await supabase
    .from('goal_checkins')
    .select('id, created_at, day_index')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true })

  return {
    goal,
    workouts,
    prs,
    fatigue,
    checkins,
  }
}
```

### System Prompt

```typescript
const GOAL_SCREEN_SYSTEM_PROMPT = `
<role>
  당신은 Formé Fitness AI 코치입니다.
  유저의 Goal 설정 정보와 전체 운동 히스토리를 바탕으로
  현재 진행 상황을 분석하고 구체적인 조언을 제공합니다.
</role>

<context_priority>
  1. 위저드 답변 (집중 부위, 유산소 의향, 운동 시간, 목표 티어, 경험)
  2. 전체 운동 히스토리 (볼륨, 빈도, 패턴)
  3. PR 기록 (어느 운동에서 성장했는지)
  4. 근육 피로 데이터 (어느 부위가 잘 자극되고 있는지)
  5. 사진 메타 정보 (날짜, 간격)
</context_priority>

<analysis_rules>
  - 유저가 상체 집중을 선택했다면 하체/유산소를 강요하지 않음
  - 유저가 유산소 안 한다고 했다면 유산소 추천 최소화
  - 운동 빈도가 설정보다 낮으면 부드럽게 언급
  - 숫자와 기간을 구체적으로 언급 (D+47, 73일, +15% 등)
  - 격려와 현실적 조언을 균형있게
</analysis_rules>

<response_format>
  2~4문장. 구체적 수치 포함. 다음 액션 1개 제시.
  마지막은 항상 격려로 마무리.
</response_format>
`
```

### 나의 변화 탭 AI 호출

```typescript
const analyzePhotoChange = async (
  prevPhoto: CheckinPhoto,
  currentPhoto: CheckinPhoto,
  context: GoalAnalysisContext
) => {
  // 두 사진을 base64로 변환
  const prevBase64 = await getBase64(prevPhoto.url)
  const currentBase64 = await getBase64(currentPhoto.url)

  const daysDiff = currentPhoto.dayIndex - prevPhoto.dayIndex

  const userMessage = `
<photos>
  <before>
    날짜: ${prevPhoto.takenAt}
    Day: D+${prevPhoto.dayIndex}
    이미지: [첨부]
  </before>
  <after>
    날짜: ${currentPhoto.takenAt}
    Day: D+${currentPhoto.dayIndex}
    이미지: [첨부]
  </after>
  <interval>${daysDiff}일 간격</interval>
</photos>

<workout_summary>
  이 기간 동안:
  - 총 운동 세션: ${context.workouts.length}회
  - 달성한 PR: ${context.prs.filter(pr => 
      pr.achieved_at >= prevPhoto.takenAt && 
      pr.achieved_at <= currentPhoto.takenAt
    ).length}개
  - 주요 운동 부위: ${getTopMuscleGroups(context.workouts)}
</workout_summary>

<goal>
  목표: Tier ${context.goal.tier} (${TIER_NAMES[context.goal.tier]})
  집중 부위: ${context.goal.wizard_answers.focusArea}
  현재 진행일: D+${currentPhoto.dayIndex}
</goal>

두 사진의 신체 변화를 분석하고 격려해주세요.
`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: GOAL_SCREEN_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: prevBase64 }
          },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: currentBase64 }
          },
          { type: 'text', text: userMessage }
        ]
      }]
    })
  })

  const data = await response.json()
  return data.content[0].text
}
```

### 목표 비교 탭 AI 호출

```typescript
const analyzeGoalComparison = async (
  currentPhoto: CheckinPhoto,
  goalImageUrl: string,
  context: GoalAnalysisContext
) => {
  const currentBase64 = await getBase64(currentPhoto.url)
  const goalBase64 = await getBase64(goalImageUrl)

  const userMessage = `
<comparison>
  <current>
    날짜: ${currentPhoto.takenAt}
    Day: D+${currentPhoto.dayIndex}
    이미지: [첨부]
  </current>
  <goal>
    목표 티어: Tier ${context.goal.tier} (${TIER_NAMES[context.goal.tier]})
    이미지: [첨부]
  </goal>
</comparison>

<workout_history>
  총 운동 세션: ${context.workouts.length}회
  달성한 PR: ${context.prs.length}개
  집중 부위: ${context.goal.wizard_answers.focusArea}
  주요 볼륨 부위: ${getTopVolumeAreas(context.workouts)}
  현재 근육 피로: ${formatFatigue(context.fatigue)}
</workout_history>

<goal_settings>
  위저드 답변:
  - 집중 부위: ${context.goal.wizard_answers.focusArea}
  - 유산소: ${context.goal.wizard_answers.cardio}
  - 하루 운동 시간: ${context.goal.wizard_answers.dailyMinutes}분
  - 주당 날수: ${context.goal.wizard_answers.daysPerWeek}일
  - 운동 경험: ${context.goal.wizard_answers.experience}
</goal_settings>

현재 모습과 목표 이미지를 비교해서
지금 어느 정도 달성했는지, 어떤 부위를 더 집중해야 하는지 조언해주세요.
`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: GOAL_SCREEN_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: currentBase64 }
          },
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: goalBase64 }
          },
          { type: 'text', text: userMessage }
        ]
      }]
    })
  })

  const data = await response.json()
  return data.content[0].text
}
```

---

## 체크인 사진 추가

```typescript
// 하단 "+ 오늘 사진 추가" 버튼
const addCheckinPhoto = async (goalId: string, userId: string) => {
  // 1. 사진 선택 (카메라 or 갤러리)
  const photo = await pickImage('camera')
  if (!photo) return

  // 2. 압축
  const compressed = await compressImage(photo.uri, 'goal')

  // 3. 모더레이션
  const { safe } = await moderateImage(compressed)
  if (!safe) throw new Error('이미지를 확인해주세요.')

  // 4. Supabase Storage 업로드
  const url = await uploadImage(compressed, 'goal-checkins', userId, 'goal')

  // 5. 체크인 기록 저장
  const { data: goal } = await supabase
    .from('user_goals')
    .select('created_at')
    .eq('id', goalId)
    .single()

  const dayIndex = Math.floor(
    (Date.now() - new Date(goal.created_at).getTime()) /
    (1000 * 60 * 60 * 24)
  )

  await supabase.from('goal_checkins').insert({
    goal_id:   goalId,
    user_id:   userId,
    photo_url: url,
    day_index: dayIndex,
    taken_at:  new Date().toISOString(),
  })
}
```

---

## Database Schema

```sql
-- 체크인 사진 (기존 스키마 업데이트)
alter table goal_checkins
  add column photo_url text,
  add column day_index int,       -- Goal 시작일로부터 경과 일수
  add column taken_at  timestamptz default now();

-- 인덱스
create index on goal_checkins (goal_id, day_index asc);
create index on goal_checkins (user_id, taken_at desc);
```

---

## Goal 헤더 컴포넌트

```typescript
// 스크린 상단 Goal 요약 헤더
interface GoalHeaderProps {
  tier:           number
  tierName:       string
  dayIndex:       number         // D+N
  timelineMonths: number
  progressPct:    number         // 0~100
  onEditPress:    () => void     // 목표 수정 → 위저드 재실행
}

// 목표 수정 시 기존 Goal 아카이브 처리
const editGoal = async (userId: string, currentGoalId: string) => {
  // 1. 기존 Goal 비활성화 (아카이브)
  await supabase
    .from('user_goals')
    .update({ is_active: false })
    .eq('id', currentGoalId)

  // 2. 위저드 모달 재실행
  openGoalWizardModal()
}
```

---

## 스와이프 로직

```typescript
// 왼쪽 (이전 사진) 스와이프
// 오른쪽으로 스와이프 → 더 이전 사진
// 왼쪽으로 스와이프 → 더 최근 사진

const [prevPhotoIndex, setPrevPhotoIndex] = useState(
  checkins.length - 2  // 기본값: 직전 사진
)

const handleSwipe = (direction: 'left' | 'right') => {
  if (direction === 'right') {
    // 더 이전 사진으로
    setPrevPhotoIndex(prev => Math.max(0, prev - 1))
  } else {
    // 더 최근 사진으로 (현재 사진 직전까지)
    setPrevPhotoIndex(prev =>
      Math.min(checkins.length - 2, prev + 1)
    )
  }
}
```

---

## AI 분석 결과 예시

**나의 변화 탭 (D+0 → D+73):**
```
D+0부터 D+73까지 73일 동안 꾸준히 운동하셨네요.
어깨 너비가 확실히 넓어졌고 가슴 라인이 더 선명해졌어요.
이 기간 동안 벤치프레스 PR도 달성하셨는데,
그 성장이 사진에서도 보입니다. 정말 잘 하고 있어요 💪
```

**목표 비교 탭:**
```
현재 Toned Up(Tier 3)에 가까워지고 있어요.
상체 볼륨은 목표의 약 70% 수준입니다.
주 3~4일 기준으로 꾸준히 하셨는데, 후면 삼각근과
등 상부를 조금 더 집중하면 Athletic에 빠르게 다가갈 거예요.
지금 페이스면 목표까지 약 2개월 남았습니다 🎯
```

---

## Implementation Checklist

- [ ] Goal 진입 로직 (첫 진입 → 위저드 / 이후 → Goal 스크린)
- [ ] Goal 헤더 컴포넌트 (티어, D+N, 진행률 바)
- [ ] 2탭 구조 (나의 변화 / 목표 비교)
- [ ] 체크인 사진 좌우 비교 레이아웃
- [ ] 스와이프로 이전 사진 탐색
- [ ] 날짜 간격 경고 로직 (14일 미만)
- [ ] AI 분석 버튼 + Claude Vision API 호출
- [ ] 위저드 답변 + 운동 히스토리 + PR + 피로 데이터 컨텍스트 구성
- [ ] 목표 비교 탭 (현재 사진 vs 목표 이미지)
- [ ] + 오늘 사진 추가 (카메라 / 갤러리)
- [ ] 사진 압축 + 모더레이션 + Supabase Storage 업로드
- [ ] goal_checkins 스키마 업데이트
- [ ] 목표 수정 (기존 Goal 아카이브 → 위저드 재실행)

---

_Formé Fitness — Goal Screen Implementation Guide v1.0 | June 2026_
