// 운동 종목 카탈로그 — exercisedb_full.json → forme_exercise_catalog.json
// 갱신: npm run exercisedb:catalog
// 한국어 표시명: src/data/ko.json (lib/exerciseKo.ts)
import type { Gear, Language, MuscleGroup } from '../types';
import catalog from '../src/data/forme_exercise_catalog.json';
import { resolveExerciseKoName } from '../lib/exerciseKo';

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
  /** false면 Add Exercise 리스트에서 숨김 */
  is_active?: boolean;
  is_favorite?: boolean;
}

export const EXERCISES: ExerciseDef[] = catalog as ExerciseDef[];

export const exercisesByMuscle = (group: MuscleGroup): ExerciseDef[] =>
  EXERCISES.filter((e) => e.muscleGroup === group);

export const exerciseName = (ex: ExerciseDef, lang: Language): string =>
  lang === 'en' ? ex.nameEn : resolveExerciseKoName(ex);
