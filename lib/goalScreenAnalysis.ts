// Goal 스크린 AI 분석 (Claude Vision)
import type { GoalAnalysisResult, GoalCheckin, GoalWizardAnswers } from '../types/goal';
import type { SavedWorkoutSession } from '../types';
import { getTierName } from '../constants/tiers';
import type { Language } from '../types';
import { imageUriToBase64Jpeg } from './imageManipulator';
import { filterSessionsBetween, getTopMuscleGroups } from './goalProgress';

const CLAUDE_MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

const GOAL_SCREEN_SYSTEM = `당신은 Formé Fitness AI 코치입니다.
유저의 Goal 설정과 운동 히스토리를 바탕으로 진행 상황을 분석하고 구체적인 조언을 제공합니다.

규칙:
- 위저드에서 선택한 집중 부위·유산소 의향을 존중 (강요하지 않음)
- 숫자와 기간을 구체적으로 (D+N, N일, N회 등)
- 2~4문장, 다음 액션 1개, 마지막은 격려로 마무리
- 한국어 앱이면 한국어로, 영어 앱이면 영어로 답변`;

async function uriToBase64(uri: string): Promise<string> {
  return imageUriToBase64Jpeg(uri, 800);
}

async function callClaudeVision(
  system: string,
  images: { base64: string; label: string }[],
  textPrompt: string
): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_KEY_MISSING');

  const content: Array<Record<string, unknown>> = [];
  for (const img of images) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: img.base64 },
    });
  }
  content.push({ type: 'text', text: textPrompt });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return String(data.content?.[0]?.text ?? '').trim();
}

function buildWorkoutBlock(
  sessions: SavedWorkoutSession[],
  lang: Language
): string {
  const muscles = getTopMuscleGroups(sessions).join(', ') || (lang === 'ko' ? '없음' : 'none');
  if (lang === 'ko') {
    return `- 총 운동 세션: ${sessions.length}회\n- 주요 운동 부위: ${muscles}`;
  }
  return `- Total sessions: ${sessions.length}\n- Top muscle groups: ${muscles}`;
}

/** 나의 변화 탭 — 두 체크인 사진 비교 분석 */
export async function analyzePhotoChange(
  prev: GoalCheckin,
  current: GoalCheckin,
  answers: GoalWizardAnswers,
  analysis: GoalAnalysisResult,
  sessions: SavedWorkoutSession[],
  lang: Language
): Promise<string> {
  const [prevB64, currentB64] = await Promise.all([
    uriToBase64(prev.photoUri),
    uriToBase64(current.photoUri),
  ]);

  const periodSessions = filterSessionsBetween(sessions, prev.takenAt, current.takenAt);
  const daysDiff = current.dayIndex - prev.dayIndex;
  const tierName = getTierName(answers.targetTier, lang);

  const prompt =
    lang === 'ko'
      ? `<photos>
이전: D+${prev.dayIndex} (${prev.takenAt})
현재: D+${current.dayIndex} (${current.takenAt})
간격: ${daysDiff}일
</photos>

<workout_summary>
${buildWorkoutBlock(periodSessions, lang)}
</workout_summary>

<goal>
목표: Tier ${answers.targetTier} (${tierName})
집중 부위: ${answers.focusArea}
현재 진행: D+${current.dayIndex}
</goal>

두 사진의 신체 변화를 분석하고 격려해주세요.`
      : `<photos>
Before: D+${prev.dayIndex} (${prev.takenAt})
After: D+${current.dayIndex} (${current.takenAt})
Interval: ${daysDiff} days
</photos>

<workout_summary>
${buildWorkoutBlock(periodSessions, lang)}
</workout_summary>

<goal>
Target: Tier ${answers.targetTier} (${tierName})
Focus: ${answers.focusArea}
Progress: D+${current.dayIndex}
</goal>

Analyze body changes between the two photos and encourage the user.`;

  return callClaudeVision(
    GOAL_SCREEN_SYSTEM,
    [
      { base64: prevB64, label: 'before' },
      { base64: currentB64, label: 'after' },
    ],
    prompt
  );
}

/** 목표 비교 탭 — 현재 vs 목표 이미지 */
export async function analyzeGoalComparison(
  current: GoalCheckin,
  goalImageUri: string,
  answers: GoalWizardAnswers,
  analysis: GoalAnalysisResult,
  sessions: SavedWorkoutSession[],
  lang: Language
): Promise<string> {
  const [currentB64, goalB64] = await Promise.all([
    uriToBase64(current.photoUri),
    uriToBase64(goalImageUri),
  ]);

  const tierName = getTierName(answers.targetTier, lang);
  const muscles = getTopMuscleGroups(sessions).join(', ');

  const prompt =
    lang === 'ko'
      ? `<comparison>
현재: D+${current.dayIndex} (${current.takenAt})
목표: Tier ${answers.targetTier} (${tierName})
</comparison>

<workout_history>
총 운동 세션: ${sessions.length}회
집중 부위 설정: ${answers.focusArea}
주요 볼륨 부위: ${muscles || '없음'}
목표 기간: ${analysis.timelineMonths}개월
</workout_history>

<goal_settings>
- 집중 부위: ${answers.focusArea}
- 유산소: ${answers.cardio}
- 하루: ${answers.dailyMinutes}분
- 주당: ${answers.daysPerWeek}일
- 경험: ${answers.experience}
</goal_settings>

현재 모습과 목표 이미지를 비교해 달성도와 다음 집중 부위를 조언해주세요.`
      : `<comparison>
Current: D+${current.dayIndex}
Goal: Tier ${answers.targetTier} (${tierName})
</comparison>

<workout_history>
Total sessions: ${sessions.length}
Focus setting: ${answers.focusArea}
Top volume areas: ${muscles || 'none'}
Timeline: ${analysis.timelineMonths} months
</workout_history>

Compare current vs goal image. Advise on progress and focus areas.`;

  return callClaudeVision(
    GOAL_SCREEN_SYSTEM,
    [
      { base64: currentB64, label: 'current' },
      { base64: goalB64, label: 'goal' },
    ],
    prompt
  );
}
