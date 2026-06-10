// Claude API 래퍼
// 주의: 개발 단계에서는 EXPO_PUBLIC_ANTHROPIC_API_KEY를 직접 사용하지만,
//       프로덕션에서는 Supabase Edge Function으로 프록시하여 키를 숨겨야 함 (MD 보안 노트 참고)
import type { CoachChartData, CoachRecommendedRoutine, CoachResponse, FatigueLevel, WorkoutSession } from '../types';
import { buildCoachSystemPrompt, type CoachPromptInput } from './coachPrompt';
import { sendChatCompletion } from './aiProvider';
import { getActiveAiConfig } from '../stores/aiSettingsStore';

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

type CoachQuestionIntent =
  | 'exercise_recommendation'
  | 'routine_review'
  | 'readiness_recovery'
  | 'progress_body'
  | 'substitution'
  | 'nutrition'
  | 'app_action'
  | 'general';

function detectQuestionIntent(message: string): CoachQuestionIntent {
  const text = message.toLowerCase();

  if (
    /(대체|바꿔|교체|instead|alternative|swap|replace)/i.test(text)
  ) {
    return 'substitution';
  }

  if (
    /(루틴|routine|프로그램|program|구성|balance|어때|검토|review)/i.test(text)
  ) {
    return 'routine_review';
  }

  if (
    /(추천|recommend|뭐.*할|뭘.*할|운동.*좋|exercise.*good|추가|add)/i.test(text)
  ) {
    return 'exercise_recommendation';
  }

  if (
    /(피곤|피로|회복|쉬어|휴식|아파|통증|수면|컨디션|recovery|rest|sore|pain|tired|sleep)/i.test(text)
  ) {
    return 'readiness_recovery';
  }

  if (
    /(몸|체형|변화|진행|progress|body|physique|살|체중|weight|goal|목표)/i.test(text)
  ) {
    return 'progress_body';
  }

  if (
    /(식단|단백질|칼로리|영양|nutrition|protein|calorie|diet|meal)/i.test(text)
  ) {
    return 'nutrition';
  }

  if (
    /(기록|저장|추가해|삭제|앱|화면|버튼|log|save|delete|screen|button)/i.test(text)
  ) {
    return 'app_action';
  }

  return 'general';
}

function describeWorkoutContext(input: CoachPromptInput): string {
  const plan = input.activeSession;
  if (!plan) return 'No active routine/session context is available.';

  const name = plan.routineName ? ` "${plan.routineName}"` : '';
  return `Current context: ${plan.source}${name}, ${plan.exercises.length} exercises, muscle summary: ${plan.muscleSummary.join(', ') || 'none'}.`;
}

function describeBodyProfile(input: CoachPromptInput): string {
  const profile = input.bodyProfile;
  if (!profile) return 'No private body profile analysis is available.';

  return `Private body profile: captured ${profile.capturedAt.slice(0, 10)}, recommended tier ${profile.recommendedTier ?? 'unknown'}, assessment: ${profile.currentBodyAssessment}, focus areas: ${profile.focusAreas.join(', ') || 'none'}.`;
}

function buildQuestionContextGuide(input: CoachPromptInput, userMessage: string): string {
  const intent = detectQuestionIntent(userMessage);
  const base = `${describeWorkoutContext(input)}\n${describeBodyProfile(input)}`;
  const isKo = input.language === 'ko';

  const guideByIntent: Record<CoachQuestionIntent, string> = {
    exercise_recommendation:
      'Prioritize the current session/routine exercise list, avoid duplicate stimulus, check recent muscle fatigue, then adjust the recommendation for goal tier, sleep/fatigue, and recent history. Name concrete exercises.',
    routine_review:
      'Prioritize the routine exercise list, then evaluate muscle balance, compound/isolation balance, missing patterns, weekly volume fit, fatigue risk, and goal fit. Suggest specific adds/swaps.',
    readiness_recovery:
      'Prioritize sleep/fatigue inputs, recent sessions, muscle fatigue state, and pain/injury wording. Recommend intensity, rest, or deload before exercise selection.',
    progress_body:
      'Prioritize goal tier, weekly stats, PR records, recent consistency, and body/check-in context when available. Explain progress using evidence and give one next action.',
    substitution:
      'Identify the target muscle and stimulus of the exercise being replaced, then suggest a similar movement that fits equipment, routine context, fatigue, and goal.',
    nutrition:
      'Use goal tier, training frequency, recovery, and sustainable nutrition principles. Keep guidance general and avoid medical claims.',
    app_action:
      'Infer the app action the user wants, use current routine/session context if relevant, and give the shortest actionable next step.',
    general:
      'Use structured app data when relevant, but keep the answer concise and ask one clarifying question only if needed.',
  };

  const guide = `${base}\nDetected intent: ${intent}.\nContext priority for this answer: ${guideByIntent[intent]}`;

  if (!isKo) return `[Question context guide]\n${guide}`;

  return `[질문별 컨텍스트 가이드]\n${guide}\n위 가이드는 내부 판단용입니다. 답변은 자연스러운 한국어로만 작성하세요.`;
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

/** AI 코치 메시지 전송 — 설정된 프로바이더(OpenAI/Claude/Gemini) 사용 */
export const sendCoachMessage = async (
  input: CoachPromptInput,
  userMessage: string,
  history: CoachChatTurn[] = []
): Promise<CoachResponse> => {
  const { apiKey } = getActiveAiConfig();
  if (!apiKey) throw new Error('API_KEY_MISSING');

  const system = buildCoachSystemPrompt(input);
  const langNote =
    input.language === 'ko'
      ? '[중요] 앱 언어는 한국어입니다. 반드시 자연스러운 한국어 구어체로만 답변하세요. 영어를 사용하지 마세요.'
      : '[App language: English — reply in English only]';
  const contextGuide = buildQuestionContextGuide(input, userMessage);

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: `${langNote}\n\n${contextGuide}\n\nUser message:\n${userMessage}` },
  ];

  const raw = await sendChatCompletion(system, messages, 1024);
  return parseCoachResponse(raw);
};

/** 앱 오픈 데일리 인사 */
export const fetchDailyGreeting = async (input: CoachPromptInput): Promise<CoachResponse> => {
  const trigger =
    input.language === 'ko'
      ? '[앱 오픈] 오늘의 데일리 인사를 한국어로 작성해 주세요. message와 recommendedRoutine의 모든 텍스트는 한국어여야 합니다.'
      : "[App open] Generate today's daily greeting in English.";

  return sendCoachMessage({ ...input, isAppOpen: true }, trigger, []);
};
