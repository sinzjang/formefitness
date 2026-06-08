// Claude API 래퍼
// 주의: 개발 단계에서는 EXPO_PUBLIC_ANTHROPIC_API_KEY를 직접 사용하지만,
//       프로덕션에서는 Supabase Edge Function으로 프록시하여 키를 숨겨야 함 (MD 보안 노트 참고)
import type { CoachChartData, CoachRecommendedRoutine, CoachResponse, FatigueLevel, WorkoutSession } from '../types';
import { buildCoachSystemPrompt, type CoachPromptInput } from './coachPrompt';

const CLAUDE_MODEL = process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

// 공통 헤더 (Anthropic API는 x-api-key + anthropic-version 필요)
const buildHeaders = () => ({
  'Content-Type': 'application/json',
  'x-api-key': ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
});

// 응답 텍스트에서 JSON 추출 (마크다운 코드펜스 등 방어)
const parseJsonResponse = <T>(raw: string): T => {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned) as T;
};

interface BodyAnalysisResult {
  estimatedTier: number;
  summary: string;
}

// 사진 기반 체형 분석 (온보딩)
export const analyzeBodyPhoto = async (base64Image: string): Promise<BodyAnalysisResult> => {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image },
            },
            {
              type: 'text',
              text: `Analyze this body photo and estimate which fitness tier (1-6) this person is closest to:
1: Very lean, minimal muscle
2: Average healthy build
3: Visible tone, some muscle definition
4: Athletic, clear muscle definition
5: Fitness model physique
6: Bodybuilder level

Respond in JSON only: { "estimatedTier": number, "summary": "one sentence in Korean" }`,
            },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  return parseJsonResponse<BodyAnalysisResult>(data.content[0].text);
};

interface SessionEvaluation {
  overall: string;
  strengths: string[];
  improvements: string[];
  nextSession: string;
  fatigueWarnings: string[];
}

// 세션 종료 후 AI 평가
export const evaluateSession = async (
  sessionData: WorkoutSession
): Promise<SessionEvaluation> => {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      messages: [
        {
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
}`,
        },
      ],
    }),
  });
  const data = await response.json();
  return parseJsonResponse<SessionEvaluation>(data.content[0].text);
};

interface FatigueAdvice {
  warnings: string[];
  suggestions: string[];
}

// 운동 전 피로 기반 조언
export const getFatigueAdvice = async (
  fatigueState: Record<string, FatigueLevel>,
  plannedExercises: string[]
): Promise<FatigueAdvice> => {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `현재 근육 피로 상태와 오늘 계획된 운동을 보고 주의사항을 알려줘. 한국어로.

피로 상태: ${JSON.stringify(fatigueState)}
계획된 운동: ${plannedExercises.join(', ')}

JSON 응답:
{
  "warnings": ["경고 1", "경고 2"],
  "suggestions": ["대안 운동 제안 1", "대안 2"]
}`,
        },
      ],
    }),
  });
  const data = await response.json();
  return parseJsonResponse<FatigueAdvice>(data.content[0].text);
};

export interface CoachChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** 코치 응답 파싱 (JSON greeting/chart 또는 plain text) */
export const parseCoachResponse = (text: string): CoachResponse => {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    if (parsed.showGoalImage === true) {
      return {
        type: 'greeting',
        message: String(parsed.message ?? ''),
        showGoalImage: true,
        recommendedRoutine: parsed.recommendedRoutine as CoachRecommendedRoutine | undefined,
      };
    }

    if (parsed.chart && typeof parsed.chart === 'object') {
      return {
        type: 'chart',
        message: String(parsed.message ?? ''),
        chart: parsed.chart as CoachChartData,
      };
    }

    if (typeof parsed.message === 'string') {
      return { type: 'text', message: parsed.message };
    }
  } catch {
    // plain text
  }

  return { type: 'text', message: text.trim() };
};

/** AI 코치 메시지 전송 */
export const sendCoachMessage = async (
  input: CoachPromptInput,
  userMessage: string,
  history: CoachChatTurn[] = []
): Promise<CoachResponse> => {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('API_KEY_MISSING');
  }

  const system = buildCoachSystemPrompt(input);
  const langNote =
    input.language === 'ko'
      ? '[앱 언어: 한국어 — 반드시 한국어로만 답변]'
      : '[App language: English — reply in English only]';

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: `${langNote}\n\n${userMessage}` },
  ];

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? '';
  return parseCoachResponse(raw);
};

/** 앱 오픈 데일리 인사 */
export const fetchDailyGreeting = async (input: CoachPromptInput): Promise<CoachResponse> => {
  const trigger =
    input.language === 'ko'
      ? '[앱 오픈] 오늘의 데일리 인사를 생성해 주세요.'
      : "[App open] Generate today's daily greeting.";

  return sendCoachMessage({ ...input, isAppOpen: true }, trigger, []);
};
