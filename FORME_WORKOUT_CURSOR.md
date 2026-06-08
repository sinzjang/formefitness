# Formé Fitness — Cursor Development Brief

> AI-powered personalized workout planner. White background, black text, Nike-inspired bold typography. Built with React Native (Expo) + Supabase + Claude API.

---

## 🎯 Product Summary

**App Name:** Formé Fitness (App Store: Forme Fitness)  
**Platform:** iOS + Android (React Native Expo)  
**Core Concept:** Photo-based body goal setting + AI muscle fatigue tracking + post-session AI coaching

**One-liner:** _"사진 찍으면 목표 체형 설정하고, 운동하는 동안 근육 피로를 추적해서 오늘 뭘 하면 안 되는지 알려주는 앱"_

---

## 🛠 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React Native (Expo SDK 51+) | iOS + Android |
| Backend / DB | Supabase | Auth + PostgreSQL + Storage |
| AI — Text | Claude API (`claude-sonnet-4-20250514`) | Body analysis, session feedback, fatigue advice |
| AI — Image | Replicate API (Face Swap model) | Onboarding goal image generation (1x per user) |
| Charts | Victory Native | Radar, Line, Area, Ring charts |
| Font | Barlow (Google Fonts) | Single font family, all weights |

---

## 🎨 Design System

### Colors
```js
const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  border: '#E5E5E5',
  textPrimary: '#111111',
  textSecondary: '#888888',
  textMuted: '#BBBBBB',
  accent: '#FF4D1C',        // CTA buttons, brand highlight
  success: '#22C55E',       // Fatigue: Good
  warning: '#FF8C42',       // Fatigue: Caution
  danger: '#FF4D1C',        // Fatigue: Overload (same as accent)
  fatigueNone: '#CCCCCC',   // Fatigue: Not activated
}
```

### Typography — Barlow only
```js
// Install: expo-google-fonts or @expo-google-fonts/barlow
const typography = {
  heroTitle: { fontFamily: 'Barlow_900Black_Italic', fontSize: 32, letterSpacing: -0.5, textTransform: 'uppercase' },
  sectionHeader: { fontFamily: 'Barlow_700Bold', fontSize: 20 },
  listItem: { fontFamily: 'Barlow_600SemiBold', fontSize: 15 },
  body: { fontFamily: 'Barlow_400Regular', fontSize: 13, color: '#888888' },
  caption: { fontFamily: 'Barlow_300Light', fontSize: 11 },
  button: { fontFamily: 'Barlow_700Bold', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
}
```

### Design Rules
- Background is always **white (#FFFFFF)**
- Text is always **black (#111111)** or muted **#888888**
- **Red / Orange / Green are reserved exclusively for fatigue indicators** — do not use for decoration
- Cards: white bg + `#E5E5E5` 0.5px border + `borderRadius: 12`
- Buttons: black fill (#111111) for primary, outlined for secondary, accent red (#FF4D1C) for AI/CTA actions
- No gradients. No shadows (except `elevation: 1` for cards if needed). Flat design.

---

## 📁 Project Structure

```
forme-fitness/
├── app/                        # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── index.tsx           # Splash screen
│   │   └── sign-in.tsx         # Apple / Google sign in
│   ├── (onboarding)/
│   │   ├── photo-upload.tsx    # Body photo capture
│   │   ├── goal-select.tsx     # 6-tier goal card selection
│   │   ├── image-generating.tsx # Face swap loading screen
│   │   └── plan-ready.tsx      # Workout plan generated
│   ├── (tabs)/
│   │   ├── index.tsx           # Home tab
│   │   ├── workout.tsx         # Active workout session
│   │   ├── progress.tsx        # Charts & history
│   │   └── profile.tsx         # Settings & profile
│   └── _layout.tsx
├── components/
│   ├── workout/
│   │   ├── ExerciseAccordion.tsx   # Collapsible exercise card
│   │   ├── SetRow.tsx              # Single set input row
│   │   ├── RestTimer.tsx           # Countdown overlay
│   │   └── MuscleHeatmap.tsx       # Body silhouette fatigue display
│   ├── charts/
│   │   ├── BodyRadarChart.tsx      # 6-axis radar (Chest/Shoulder/Back/Arms/Core/Legs)
│   │   ├── WeightLineChart.tsx     # Weight progression line + dots
│   │   ├── WorkoutCalendar.tsx     # Monthly calendar with muscle dots
│   │   ├── VolumeAreaChart.tsx     # Weekly volume area chart
│   │   └── GoalRingChart.tsx       # Weekly goal completion ring
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── FatigueTag.tsx          # Gray/Green/Orange/Red dot + label
│   │   └── AIFeedbackSheet.tsx     # Bottom sheet for AI response
│   └── onboarding/
│       ├── GoalCard.tsx            # Body tier selection card
│       └── BodyTierAssets.ts       # 6 preset body images mapping
├── lib/
│   ├── supabase.ts             # Supabase client init
│   ├── claude.ts               # Claude API wrapper
│   ├── replicate.ts            # Replicate face swap wrapper
│   └── fatigue.ts              # Muscle fatigue calculation logic
├── stores/
│   ├── workoutStore.ts         # Active session state (Zustand)
│   ├── userStore.ts            # User profile + goal tier
│   └── fatigueStore.ts         # Real-time fatigue state per muscle group
├── types/
│   └── index.ts
└── constants/
    ├── muscles.ts              # Muscle group definitions + exercise mapping
    ├── exercises.ts            # Exercise library
    └── theme.ts                # Colors + typography constants
```

---

## 🗄 Database Schema (Supabase)

```sql
-- Users
create table users (
  id uuid primary key references auth.users,
  display_name text,
  goal_tier int check (goal_tier between 1 and 6),
  goal_image_url text,        -- Stored face-swap result
  body_photo_url text,        -- Temporary, delete after processing
  weight_unit text default 'lb',
  created_at timestamptz default now()
);

-- Workouts (sessions)
create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  started_at timestamptz,
  ended_at timestamptz,
  condition_sleep int,        -- 1~5
  condition_fatigue int,      -- 1~5
  ai_feedback text,           -- Claude session evaluation
  created_at timestamptz default now()
);

-- Exercises per workout
create table workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id),
  exercise_name text not null,
  muscle_group text,          -- 'chest' | 'shoulder' | 'back' | 'arms' | 'core' | 'legs'
  exercise_order int,
  created_at timestamptz default now()
);

-- Sets per exercise
create table exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid references workout_exercises(id),
  set_number int,
  resistance_type text,       -- 'weight' | 'band' | 'bodyweight'
  weight_lb numeric,          -- null for band/bodyweight
  band_level text,            -- 'light' | 'medium' | 'heavy' | 'xheavy'
  bw_added_lb numeric,        -- additional weight for weighted bodyweight
  reps int,
  completed boolean default false,
  created_at timestamptz default now()
);
```

---

## 🏋️ Core Feature Specs

### 1. Resistance Input Types

```ts
type ResistanceType = 'weight' | 'band' | 'bodyweight'
type BandLevel = 'Light' | 'Medium' | 'Heavy' | 'X-Heavy'

interface SetData {
  setNumber: number
  resistanceType: ResistanceType
  weightLb?: number          // for 'weight' type
  bandLevel?: BandLevel      // for 'band' type
  bwAddedLb?: number         // for 'bodyweight' type (0 = just BW)
  reps: number
  completed: boolean
}

// Display logic
const displayWeight = (set: SetData): string => {
  if (set.resistanceType === 'weight') return `${set.weightLb} lb`
  if (set.resistanceType === 'band') return `${set.bandLevel} Band`
  if (set.resistanceType === 'bodyweight') {
    return set.bwAddedLb ? `BW +${set.bwAddedLb} lb` : 'BW'
  }
}
```

### 2. Muscle Fatigue Calculation

```ts
// Fatigue thresholds per muscle group (sets per session)
const FATIGUE_THRESHOLDS = {
  chest: { caution: 4, overload: 6 },
  shoulder: { caution: 4, overload: 6 },
  back: { caution: 5, overload: 8 },
  arms: { caution: 6, overload: 9 },
  core: { caution: 6, overload: 10 },
  legs: { caution: 5, overload: 8 },
}

type FatigueLevel = 'none' | 'good' | 'caution' | 'overload'

const getFatigueLevel = (muscleGroup: string, setCount: number): FatigueLevel => {
  const t = FATIGUE_THRESHOLDS[muscleGroup]
  if (setCount === 0) return 'none'
  if (setCount < t.caution) return 'good'
  if (setCount < t.overload) return 'caution'
  return 'overload'
}

const FATIGUE_COLORS: Record<FatigueLevel, string> = {
  none: '#CCCCCC',
  good: '#22C55E',
  caution: '#FF8C42',
  overload: '#FF4D1C',
}
```

### 3. Body Goal Tiers

```ts
const BODY_GOAL_TIERS = [
  { id: 1, name: 'Lean & Clean', tagline: '옷이 알아서 핏을 잡아줍니다', asset: require('../assets/tiers/tier1.jpg') },
  { id: 2, name: 'Everyday Fit', tagline: '건강하고 활기차 보입니다', asset: require('../assets/tiers/tier2.jpg') },
  { id: 3, name: 'Toned Up', tagline: '운동하는 사람인 거 티가 납니다', asset: require('../assets/tiers/tier3.jpg') },
  { id: 4, name: 'Athletic', tagline: '운동이 삶의 일부인 사람입니다', asset: require('../assets/tiers/tier4.jpg') },
  { id: 5, name: 'Sculpted', tagline: '수년의 노력이 몸에 보입니다', asset: require('../assets/tiers/tier5.jpg') },
  { id: 6, name: 'Elite', tagline: '무대를 목표로 합니다', asset: require('../assets/tiers/tier6.jpg') },
]
// Note: 6 reference body images (no face) must be pre-designed and stored as static assets
```

### 4. Claude API Integration

```ts
// lib/claude.ts
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

// Body analysis from photo
export const analyzeBodyPhoto = async (base64Image: string) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
          { type: 'text', text: `Analyze this body photo and estimate which fitness tier (1-6) this person is closest to:
            1: Very lean, minimal muscle
            2: Average healthy build
            3: Visible tone, some muscle definition
            4: Athletic, clear muscle definition
            5: Fitness model physique
            6: Bodybuilder level
            
            Respond in JSON only: { "estimatedTier": number, "summary": "one sentence in Korean" }` }
        ]
      }]
    })
  })
  const data = await response.json()
  return JSON.parse(data.content[0].text)
}

// Session evaluation after workout
export const evaluateSession = async (sessionData: WorkoutSession) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `다음 운동 세션을 평가해줘. 한국어로 답변.

운동 데이터: ${JSON.stringify(sessionData)}

다음 형식으로 JSON 응답:
{
  "overall": "전체 총평 (2~3문장)",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvements": ["개선할 점 1", "개선할 점 2"],
  "nextSession": "다음 세션 추천 (구체적으로)",
  "fatigueWarnings": ["특정 근육 피로 경고 (있을 경우)"]
}`
      }]
    })
  })
  const data = await response.json()
  return JSON.parse(data.content[0].text)
}

// Fatigue-based advice before workout
export const getFatigueAdvice = async (fatigueState: Record<string, FatigueLevel>, plannedExercises: string[]) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `현재 근육 피로 상태와 오늘 계획된 운동을 보고 주의사항을 알려줘. 한국어로.

피로 상태: ${JSON.stringify(fatigueState)}
계획된 운동: ${plannedExercises.join(', ')}

JSON 응답:
{
  "warnings": ["경고 1 (예: 어깨 피로 누적으로 파이크 푸쉬업 피하세요)", "경고 2"],
  "suggestions": ["대안 운동 제안 1", "대안 2"]
}`
      }]
    })
  })
  const data = await response.json()
  return JSON.parse(data.content[0].text)
}
```

### 5. Workout Session — ExerciseAccordion Component

```tsx
// components/workout/ExerciseAccordion.tsx
// - Collapsed state: shows exercise name, set count, weight, fatigue dot
// - Expanded state: shows rest timer setting + set list
// - Border color changes with fatigue level (none=gray, good=green, caution=orange, overload=red)
// - "+" button to add sets
// - Long press set row to delete

interface ExerciseAccordionProps {
  exercise: WorkoutExercise
  fatigueLevel: FatigueLevel
  onSetUpdate: (setId: string, data: Partial<SetData>) => void
  onSetAdd: () => void
  defaultRestSeconds?: number  // 30 | 60 | 90 | 120
}
```

---

## 📊 Charts Spec

### Radar Chart (Body Balance)
```ts
// 6 axes: Chest / Shoulder / Back / Arms / Core / Legs
// Value: weekly volume (sets × reps) per muscle group, normalized 0-100
// Overlay: target tier ideal shape in light gray (#F0F0F0)
// Current: filled accent red (#FF4D1C) at 30% opacity
```

### Weight Progress Line Chart
```ts
// Per exercise, show weight over time
// X: date, Y: weight in lb
// Dots at each data point (4px radius, #111111)
// Line: 1.5px solid #111111
// PR point: dot turns #FF4D1C, label "PR" above
```

### Workout Calendar
```ts
// Monthly calendar grid
// Each workout day shows colored dots below the date number
// Dot colors = muscle groups activated that day
// muscle group color mapping:
//   chest: '#FF4D1C', shoulder: '#FF8C42', back: '#22C55E',
//   arms: '#3B82F6', core: '#8B5CF6', legs: '#111111'
```

### Ring Chart (Weekly Goal)
```ts
// Circular progress: workouts done / goal per week
// Track: #E5E5E5, Progress: #111111
// Percentage in center, large bold number
// Below: "3 / 5 sessions"
```

---

## 🚀 Setup Instructions

```bash
# 1. Initialize
npx create-expo-app forme-fitness --template blank-typescript
cd forme-fitness

# 2. Core dependencies
npx expo install expo-camera expo-image-picker expo-file-system
npm install @supabase/supabase-js
npm install zustand
npm install victory-native react-native-svg
npm install @expo-google-fonts/barlow expo-font

# 3. Navigation
npx expo install expo-router

# 4. Environment variables (.env)
# EXPO_PUBLIC_SUPABASE_URL=
# EXPO_PUBLIC_SUPABASE_ANON_KEY=
# EXPO_PUBLIC_ANTHROPIC_API_KEY=
# EXPO_PUBLIC_REPLICATE_API_TOKEN=
```

---

## 📋 Development Phases

| Phase | Duration | Deliverable |
|---|---|---|
| 0 — Setup | 1 week | Expo + Supabase + Claude API connected, Barlow font applied |
| 1 — Workout Logger | 2 weeks | Exercise input (lb/band/BW) + history + Accordion UI |
| 2 — AI Evaluation | 2 weeks | Post-session Claude feedback → Bottom Sheet display |
| 3 — Fatigue Tracking | 2 weeks | Muscle fatigue logic + heatmap + warning banner |
| 4 — Onboarding | 3 weeks | Photo upload + body analysis + goal image generation + 6 tier assets |
| 5 — Data Viz | 2 weeks | All 5 charts (Radar / Line / Calendar / Ring / Area) |
| 6 — Polish | 2 weeks | Design QA, bug fixes, beta test |
| 7 — Deploy (optional) | 2 weeks | EAS Build + App Store submission |

---

## ⚠️ Important Notes for Cursor

1. **API Key Security** — Never hardcode API keys. Use `EXPO_PUBLIC_` prefix for Expo env vars. For production, proxy Claude API calls through a Supabase Edge Function to hide the key.

2. **Image Handling** — After face-swap generation, store result in Supabase Storage. Delete the original body photo from both client and server immediately after processing.

3. **Fatigue Calculation** — Run on client side in real-time during active workout. Persist to Supabase only after session ends. Use Zustand for in-session state.

4. **Font License** — Barlow is OFL (Open Font License) — free for commercial use including app embedding. No issues.

5. **KBL 점프체** — If used for Korean title display, check embedding license with KBL before App Store submission.

6. **Phase 1 weight unit** — lb only. kg toggle is Phase 2. Store all weights as lb in DB.

7. **Onboarding image generation** — Warn user "이미지 생성에 약 15초 소요됩니다" before calling Replicate API. Show animated loading screen. Add "재생성" button on result screen.

8. **Free tier limits** — AI evaluation: cap at 20/month for free users. Enforce via Supabase RLS + usage tracking table.
```

---

_Formé Fitness — PRD v2.0 | June 2026_
