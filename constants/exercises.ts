// 운동 종목 카탈로그 — exercisedb_full.json → forme_exercise_catalog.json
// 갱신: npm run exercisedb:catalog
// 한국어 표시명: src/data/ko.json (lib/exerciseKo.ts)
import type { ExerciseMeasurementType, ExerciseMediaType, Gear, Language, MuscleGroup } from '../types';
import catalog from '../src/data/forme_exercise_catalog.json';

export { exerciseLocalizedName } from '../lib/exerciseKo';

export interface ExerciseDef {
  name: string;
  nameEn: string;
  muscleGroup: MuscleGroup;
  gear: Gear;
  primary: string[];
  synergist: string[];
  stabilizer: string[];
  isCustom?: boolean;
  customId?: string;
  /** RapidAPI ExerciseDB id (GIF) */
  exerciseDbId?: string;
  /** GitHub CDN GIF — 모달 재생용 (RapidAPI 실패 시 fallback) */
  gifUrl?: string;
  measurementType?: ExerciseMeasurementType;
  mediaUri?: string;
  mediaType?: ExerciseMediaType;
  /** false면 Add Exercise 리스트에서 숨김 */
  is_active?: boolean;
  is_favorite?: boolean;
}

export const EXERCISES: ExerciseDef[] = Array.isArray(catalog) ? (catalog as ExerciseDef[]) : [];

export const exercisesByMuscle = (group: MuscleGroup): ExerciseDef[] =>
  EXERCISES.filter((e) => e.muscleGroup === group);

export const exerciseName = (ex: ExerciseDef, lang: Language): string => {
  if (lang === 'en') return ex.nameEn;
  // 순환 import 방지 — 호출 시점에만 exerciseKo 로드
  const { resolveExerciseKoName } = require('../lib/exerciseKo') as typeof import('../lib/exerciseKo');
  return resolveExerciseKoName(ex);
};
