// 근육 그룹 정의 (라벨 + 색상)
import type { Language, MuscleGroup } from '../types';
import { muscleColors } from './theme';

export interface MuscleDef {
  id: MuscleGroup;
  label: string; // 영문 (시스템/표기 보조)
  labelKo: string; // 한글 표시용
  color: string;
}

export const MUSCLES: MuscleDef[] = [
  { id: 'chest', label: 'Chest', labelKo: '가슴', color: muscleColors.chest },
  { id: 'shoulder', label: 'Shoulder', labelKo: '어깨', color: muscleColors.shoulder },
  { id: 'back', label: 'Back', labelKo: '등', color: muscleColors.back },
  { id: 'arms', label: 'Arms', labelKo: '팔', color: muscleColors.arms },
  { id: 'core', label: 'Core', labelKo: '코어', color: muscleColors.core },
  { id: 'legs', label: 'Legs', labelKo: '하체', color: muscleColors.legs },
];

export const MUSCLE_MAP: Record<MuscleGroup, MuscleDef> = MUSCLES.reduce(
  (acc, m) => ({ ...acc, [m.id]: m }),
  {} as Record<MuscleGroup, MuscleDef>
);

// 근육 그룹 라벨 → 현재 언어 (en=영문, ko=한글)
export const muscleGroupLabel = (id: MuscleGroup, lang: Language): string =>
  lang === 'en' ? MUSCLE_MAP[id].label : MUSCLE_MAP[id].labelKo;
