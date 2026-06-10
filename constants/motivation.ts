// Home 모티베이션 — 랜덤 이미지 + 문구
import type { Language } from '../types';
import { MOTIVATION_IMAGE_SOURCES } from './motivationImages';

export interface MotivationQuote {
  ko: string;
  en: string;
}

export interface MotivationSlide {
  image: (typeof MOTIVATION_IMAGE_SOURCES)[number];
  quote: MotivationQuote;
}

/** 모티베이션 문구 풀 (로고 슬라이드 제거) */
export const MOTIVATION_QUOTES: MotivationQuote[] = [
  {
    ko: '오늘의 한 세트가 내일의 몸을 만듭니다.',
    en: "Today's set shapes tomorrow's body.",
  },
  {
    ko: '완벽한 하루보다, 꾸준한 한 주가 더 강합니다.',
    en: 'A steady week beats a perfect day.',
  },
  {
    ko: '몸은 거짓말하지 않습니다. 기록만 남기세요.',
    en: 'Your body keeps score. Just log the work.',
  },
  {
    ko: '지금 이 한 번이, 내일의 자신감이 됩니다.',
    en: 'This rep builds tomorrow’s confidence.',
  },
  {
    ko: '피곤해도 괜찮아요. 왔다는 것만으로 충분합니다.',
    en: 'Tired is fine. Showing up is the win.',
  },
  {
    ko: '작은 진전도 진전입니다. 계속 가요.',
    en: 'Small progress is still progress. Keep going.',
  },
  {
    ko: '어제의 나보다, 오늘 조금 더 나아지면 됩니다.',
    en: 'Beat yesterday by just a little today.',
  },
  {
    ko: '거울 앞이 아니라, 기록장이 증거입니다.',
    en: 'Your logbook is the proof—not the mirror.',
  },
  {
    ko: '강해지는 건 하루아침에 안 됩니다. 오늘도 한 걸음.',
    en: 'Strength takes time. Take one step today.',
  },
  {
    ko: '운동은 몸을 바꾸기 전에, 마음부터 단단하게 합니다.',
    en: 'Training hardens your mind before your body.',
  },
  {
    ko: '포기하고 싶을 때가, 성장이 시작되는 순간입니다.',
    en: 'Growth starts when you want to quit.',
  },
  {
    ko: '함께하면 더 멀리 갑니다. 오늘도 한 세트 더.',
    en: 'Together goes further. One more set today.',
  },
];

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 세션마다 랜덤 이미지·문구 조합 */
export function buildRandomMotivationSlides(count = 6): MotivationSlide[] {
  const images = shuffle([...MOTIVATION_IMAGE_SOURCES]);
  const quotes = shuffle([...MOTIVATION_QUOTES]);
  const n = Math.min(count, images.length, quotes.length);

  return Array.from({ length: n }, (_, i) => ({
    image: images[i],
    quote: quotes[i % quotes.length],
  }));
}

export function motivationQuote(slide: MotivationSlide, lang: Language): string {
  return slide.quote[lang];
}
