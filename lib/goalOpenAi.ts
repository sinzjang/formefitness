// Goal 분석 · 목표 이미지 생성 (OpenAI)
import * as FileSystem from 'expo-file-system/legacy';
import { imageUriToBase64Jpeg } from './imageManipulator';
import type {
  GoalAnalysisResult,
  GoalGeneratedImages,
  GoalImageGender,
  GoalWizardAnswers,
} from '../types/goal';
import { getTierDef } from '../constants/tiers';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';
const ENV_MODEL = process.env.EXPO_PUBLIC_OPENAI_MODEL ?? '';
const CHAT_MODEL_ENV = process.env.EXPO_PUBLIC_OPENAI_CHAT_MODEL ?? '';
const IMAGE_MODEL_ENV = process.env.EXPO_PUBLIC_OPENAI_IMAGE_MODEL ?? '';

const DEFAULT_CHAT_MODEL = 'gpt-4o-mini';
const IMAGE_MODEL_FALLBACKS = ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1', 'dall-e-3'] as const;
/** Goal 목표 이미지 공통 사이즈 (세로) */
const GOAL_IMAGE_SIZE = '1024x1536';
/** DALL·E 3는 고정 해상도만 지원 — 세로에 가장 가까운 값 */
const DALLE3_PORTRAIT_SIZE = '1024x1792';

const TIER_PROMPTS: Record<number, string> = {
  1: 'lean athletic physique, low body fat, toned slim build',
  2: 'healthy fit everyday body, moderate muscle tone, energetic',
  3: 'defined muscle tone, visible fitness enthusiast physique',
  4: 'athletic muscular physique, well-defined muscles',
  5: 'fitness model physique, highly sculpted muscles',
  6: 'bodybuilder physique, maximum muscle definition',
};

const ANALYSIS_SYSTEM = `You are Kyne Fitness AI coach analyzing a user's goal setting.
Return ONLY valid JSON in this exact format:
{
  "recommendedTier": 1,
  "userRequestedTier": 1,
  "tierMatch": true,
  "timelineMonths": 6,
  "currentBodyAssessment": "한국어 2문장",
  "goalFeasibility": "한국어 2문장",
  "coachMessage": "한국어 격려 2문장",
  "weeklySchedule": { "daysPerWeek": 3, "sessionDuration": 45, "splitType": "upper_lower" },
  "focusAreas": ["chest"],
  "avoidAreas": [],
  "keyExercises": [{ "name": "bench press", "reason": "한국어" }],
  "nutritionTip": "한국어 1문장",
  "warningIfTierTooHigh": null
}
Respect user's focus area and cardio preference. Korean for text fields except exercise names.`;

function isImageGenerationModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes('dall-e') || m.includes('gpt-image');
}

/** Goal 분석용 chat 모델 — gpt-image 계열은 사용 불가 */
function resolveChatModel(): string {
  if (CHAT_MODEL_ENV) return CHAT_MODEL_ENV;
  if (ENV_MODEL && !isImageGenerationModel(ENV_MODEL)) return ENV_MODEL;
  return DEFAULT_CHAT_MODEL;
}

/** 목표 이미지 생성 모델 */
function resolvePrimaryImageModel(): string {
  if (IMAGE_MODEL_ENV) return IMAGE_MODEL_ENV;
  if (ENV_MODEL && isImageGenerationModel(ENV_MODEL)) return ENV_MODEL;
  return 'dall-e-3';
}

function imageModelCandidates(): string[] {
  const primary = resolvePrimaryImageModel();
  const ordered = [primary, ...IMAGE_MODEL_FALLBACKS];
  return [...new Set(ordered)];
}

function buildAnalysisPrompt(answers: GoalWizardAnswers): string {
  const tier = getTierDef(answers.targetTier);
  return `사용자 목표 설정:
- 집중 부위: ${answers.focusArea}
- 유산소: ${answers.cardio}
- 하루 운동: ${answers.dailyMinutes}분
- 주당 운동: ${answers.daysPerWeek}일
- 목표 티어: Tier ${answers.targetTier} (${tier.nameEn})
- 경험: ${answers.experience}
JSON만 반환하세요.`;
}

async function photoToBase64(uri: string): Promise<string> {
  return imageUriToBase64Jpeg(uri, 800);
}

function parseJsonResponse(raw: string): GoalAnalysisResult {
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as GoalAnalysisResult;
}

function buildImagePrompt(
  answers: GoalWizardAnswers,
  analysis: GoalAnalysisResult,
  gender?: GoalImageGender
): string {
  const tierPrompt = TIER_PROMPTS[answers.targetTier] ?? TIER_PROMPTS[3];
  const tierName = getTierDef(answers.targetTier).nameEn;
  const subject =
    gender === 'male'
      ? 'adult male athlete'
      : gender === 'female'
        ? 'adult female athlete'
        : 'athletic person';
  return `Professional fitness inspiration photo, fully clothed ${subject} in gym wear: ${tierPrompt}.
Target look "${tierName}". ${analysis.goalFeasibility.slice(0, 100)}.
Neutral studio background, front-facing confident pose, realistic sports photography.
No nudity, no text, no watermark.`;
}

function buildImageRequestBody(
  model: string,
  prompt: string,
  quality: 'low' | 'medium'
): Record<string, unknown> {
  const m = model.toLowerCase();

  if (m.includes('gpt-image')) {
    return {
      model,
      prompt,
      n: 1,
      size: GOAL_IMAGE_SIZE,
      quality,
      moderation: 'low',
    };
  }

  if (m.includes('dall-e-3')) {
    return {
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: DALLE3_PORTRAIT_SIZE,
      quality: quality === 'medium' ? 'standard' : 'standard',
      response_format: 'url',
    };
  }

  return {
    model,
    prompt,
    n: 1,
    size: GOAL_IMAGE_SIZE,
    response_format: 'url',
  };
}

async function persistGeneratedImage(
  data: { url?: string; b64_json?: string },
  tag = 'goal'
): Promise<string | null> {
  const localPath = `${FileSystem.cacheDirectory}${tag}_${Date.now()}.jpg`;

  if (data.b64_json) {
    await FileSystem.writeAsStringAsync(localPath, data.b64_json, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return localPath;
  }

  if (data.url) {
    const download = await FileSystem.downloadAsync(data.url, localPath);
    return download.uri;
  }

  return null;
}

async function requestGoalImageWithModels(
  prompt: string,
  tag: string,
  quality: 'low' | 'medium'
): Promise<string | null> {
  const models = imageModelCandidates();

  for (const model of models) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify(buildImageRequestBody(model, prompt, quality)),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[goalImage:${model}:${tag}]`, errText);
        continue;
      }

      const data = await res.json();
      const item = data.data?.[0] as { url?: string; b64_json?: string } | undefined;
      if (!item) continue;
      const uri = await persistGeneratedImage(item, tag);
      if (uri) return uri;
    } catch {
      // 다음 폴백 모델 시도
    }
  }

  return null;
}

/** 위저드 답변 + (선택) 사진 → Goal 분석 */
export async function analyzeGoalWithOpenAi(
  answers: GoalWizardAnswers,
  photoUri?: string
): Promise<GoalAnalysisResult> {
  if (!OPENAI_KEY) throw new Error('OPENAI_KEY_MISSING');

  const chatModel = resolveChatModel();
  const userContent: Array<Record<string, unknown>> = [];
  if (photoUri) {
    const b64 = await photoToBase64(photoUri);
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${b64}`, detail: 'low' },
    });
  }
  userContent.push({ type: 'text', text: buildAnalysisPrompt(answers) });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: chatModel,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const text = String(data.choices?.[0]?.message?.content ?? '');
  return parseJsonResponse(text);
}

/** 목표 티어에 맞는 AI 목표 이미지 생성 */
export async function generateGoalImagesWithOpenAi(
  answers: GoalWizardAnswers,
  analysis: GoalAnalysisResult,
  options: { hasUserPhoto: boolean }
): Promise<GoalGeneratedImages> {
  if (!OPENAI_KEY) return {};

  if (options.hasUserPhoto) {
    const prompt = buildImagePrompt(answers, analysis);
    const single = await requestGoalImageWithModels(prompt, 'goal_single', 'medium');
    return single ? { single } : {};
  }

  // 사진 없음 → 남성·여성 각 1장 (품질 low)
  const [male, female] = await Promise.all([
    requestGoalImageWithModels(buildImagePrompt(answers, analysis, 'male'), 'goal_male', 'low'),
    requestGoalImageWithModels(buildImagePrompt(answers, analysis, 'female'), 'goal_female', 'low'),
  ]);

  return { male: male ?? undefined, female: female ?? undefined };
}

/** @deprecated generateGoalImagesWithOpenAi 사용 */
export async function generateGoalImageWithOpenAi(
  answers: GoalWizardAnswers,
  analysis: GoalAnalysisResult
): Promise<string | null> {
  const result = await generateGoalImagesWithOpenAi(answers, analysis, { hasUserPhoto: true });
  return result.single ?? result.male ?? result.female ?? null;
}
