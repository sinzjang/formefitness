// Form Check — selected photo/video frames → AI coach posture review
import { imageUriToBase64Jpeg } from './imageManipulator';
import { sendVisionCompletion } from './aiProvider';
import type { Language } from '../types';

export interface FormCheckFrame {
  uri: string;
  timestampMs?: number;
  label?: string;
}

export interface FormCheckRequest {
  language: Language;
  mediaKind: 'photo' | 'video';
  frames: FormCheckFrame[];
  exerciseName?: string;
  target?: string;
  userQuestion?: string;
}

function timestampLabel(ms?: number) {
  if (ms == null) return '';
  return `${(ms / 1000).toFixed(1)}s`;
}

export async function analyzeFormCheck(req: FormCheckRequest): Promise<string> {
  const images = await Promise.all(
    req.frames.slice(0, 5).map(async (frame) => ({
      base64: await imageUriToBase64Jpeg(frame.uri, 900),
      mediaType: 'image/jpeg' as const,
    }))
  );

  const ko = req.language === 'ko';
  const system = ko
    ? `당신은 Formé의 운동 자세 코치입니다. 사진/영상 프레임만 보고 의학적 진단을 하지 말고, 보이는 범위에서만 운동 자세와 타겟 적합도를 짧게 평가하세요. 운동 종류가 확실하면 "이 운동이네요"처럼 간단히 말하고, 확실하지 않으면 "~처럼 보입니다"라고 말하세요. 답변은 자연스러운 대화체 한국어로만, 4~7문장 안으로 짧게 작성하세요.`
    : `You are Formé's form-check coach. Briefly review posture and target-muscle alignment from the provided photos/video frames. Do not make medical diagnoses. If the exercise is clear, say it simply; if uncertain, state that it appears to be the exercise. Keep it conversational and concise, 4-7 sentences.`;

  const frameNotes = req.frames
    .slice(0, 5)
    .map((frame, index) => {
      const label = frame.label ? ` ${frame.label}` : '';
      const time = timestampLabel(frame.timestampMs);
      return `Frame ${index + 1}${label}${time ? ` at ${time}` : ''}`;
    })
    .join('\n');

  const prompt = ko
    ? `Form Check 요청입니다.

미디어: ${req.mediaKind === 'video' ? '영상에서 선택한 프레임' : '사진'}
운동명: ${req.exerciseName?.trim() || '알 수 없음. 이미지에서 추정하세요.'}
타겟: ${req.target?.trim() || '알 수 없음. 보이는 동작 기준으로 추정하세요.'}
사용자 질문: ${req.userQuestion?.trim() || '자세가 타겟에 맞는지 평가해 주세요.'}

선택된 프레임:
${frameNotes}

답변은 아래 정도의 짧은 대화 흐름으로만 작성하세요:
- "이 운동이네요" 또는 "이 운동처럼 보입니다"로 운동 인식 한 문장
- 지금 자세에서 좋았던 점 한두 문장
- 고치면 좋아질 점 한두 문장. 필요하면 그립, 너비, 좌우 밸런스, ROM, 안정성 중 가장 중요한 것만 언급
- 마지막에 다음 세트에서 기억할 cue 한 문장

불확실한 부분은 단정하지 말고 "이 각도에서는", "보이는 범위에서는"이라고 표현하세요. 번호 목록이나 긴 리포트처럼 쓰지 마세요.`
    : `Form Check request.

Media: ${req.mediaKind === 'video' ? 'selected video frames' : 'photo'}
Exercise: ${req.exerciseName?.trim() || 'unknown; infer from images if possible'}
Target: ${req.target?.trim() || 'unknown; infer from movement if possible'}
User question: ${req.userQuestion?.trim() || 'Check whether the form matches the target.'}

Selected frames:
${frameNotes}

Keep the answer short and conversational:
- One sentence recognizing the exercise, clear vs inferred
- One or two sentences on what looked good
- One or two sentences on what to improve, only the most important grip/stance/symmetry/ROM/stability issue
- One short next-set cue

Do not overstate certainty. Do not write a long report or numbered list.`;

  return sendVisionCompletion(system, prompt, images, 700);
}
