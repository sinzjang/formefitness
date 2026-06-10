// Home 모티베이션 슬라이드 — 이미지 + 문구
import type { Language } from '../types';

export interface MotivationSlide {
  image: number;
  quote: { ko: string; en: string };
}

export const MOTIVATION_SLIDES: MotivationSlide[] = [
  {
    image: require('../src/imgs/app_esse/Forme_body.jpg'),
    quote: {
      ko: '오늘의 한 세트가 내일의 몸을 만듭니다.',
      en: "Today's set shapes tomorrow's body.",
    },
  },
  {
    image: require('../src/imgs/app_esse/Forme_Logo_simple.jpg'),
    quote: {
      ko: '완벽한 하루보다, 꾸준한 한 주가 더 강합니다.',
      en: 'A steady week beats a perfect day.',
    },
  },
  {
    image: require('../src/imgs/app_esse/Forme_Logo.jpg'),
    quote: {
      ko: '몸은 거짓말하지 않습니다. 기록만 남기세요.',
      en: 'Your body keeps score. Just log the work.',
    },
  },
];

export function motivationQuote(slide: MotivationSlide, lang: Language): string {
  return slide.quote[lang];
}
