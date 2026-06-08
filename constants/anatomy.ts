// 해부학적 근육명 사전 (주동근/협력근/안정근 다국어 표시용)
// 키는 한글 근육명 (exercises.ts의 primary/synergist/stabilizer 값과 일치)
import type { Language, LocalizedText } from '../types';

export const MUSCLE_ANATOMY: Record<string, LocalizedText> = {
  대흉근: { ko: '대흉근', en: 'Pectoralis Major' },
  '대흉근 상부': { ko: '대흉근 상부', en: 'Upper Chest' },
  '대흉근 하부': { ko: '대흉근 하부', en: 'Lower Chest' },
  삼두근: { ko: '삼두근', en: 'Triceps' },
  이두근: { ko: '이두근', en: 'Biceps' },
  삼각근: { ko: '삼각근', en: 'Deltoids' },
  전면삼각근: { ko: '전면삼각근', en: 'Front Delts' },
  측면삼각근: { ko: '측면삼각근', en: 'Side Delts' },
  후면삼각근: { ko: '후면삼각근', en: 'Rear Delts' },
  회전근개: { ko: '회전근개', en: 'Rotator Cuff' },
  코어: { ko: '코어', en: 'Core' },
  전거근: { ko: '전거근', en: 'Serratus Anterior' },
  승모근: { ko: '승모근', en: 'Trapezius' },
  '승모근 상부': { ko: '승모근 상부', en: 'Upper Traps' },
  능형근: { ko: '능형근', en: 'Rhomboids' },
  척추기립근: { ko: '척추기립근', en: 'Erector Spinae' },
  둔근: { ko: '둔근', en: 'Glutes' },
  햄스트링: { ko: '햄스트링', en: 'Hamstrings' },
  광배근: { ko: '광배근', en: 'Lats' },
  전완: { ko: '전완', en: 'Forearms' },
  상완근: { ko: '상완근', en: 'Brachialis' },
  상완요골근: { ko: '상완요골근', en: 'Brachioradialis' },
  복직근: { ko: '복직근', en: 'Rectus Abdominis' },
  '복직근 하부': { ko: '복직근 하부', en: 'Lower Abs' },
  복횡근: { ko: '복횡근', en: 'Transverse Abdominis' },
  복사근: { ko: '복사근', en: 'Obliques' },
  장요근: { ko: '장요근', en: 'Hip Flexors' },
  대퇴사두근: { ko: '대퇴사두근', en: 'Quadriceps' },
  내전근: { ko: '내전근', en: 'Adductors' },
  비복근: { ko: '비복근', en: 'Gastrocnemius' },
  가자미근: { ko: '가자미근', en: 'Soleus' },
  어깨: { ko: '어깨', en: 'Shoulders' },
};

// 단일 근육명 → 현재 언어 (사전에 없으면 키 그대로 반환)
export const localizeMuscle = (key: string, lang: Language): string =>
  MUSCLE_ANATOMY[key]?.[lang] ?? key;

// 근육명 배열 → 현재 언어, 콤마로 연결
export const localizeMuscleList = (keys: string[], lang: Language): string =>
  keys.map((k) => localizeMuscle(k, lang)).join(', ');
