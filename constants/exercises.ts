// 운동 종목 카탈로그 — essential 80 (src/data/exercises_essential_80.json)
// 갱신: npm run exercisedb:catalog:essential
import type { Gear, Language, MuscleGroup } from '../types';
import catalog from '../src/data/forme_exercise_catalog.json';

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
}

export const EXERCISES: ExerciseDef[] = catalog as ExerciseDef[];

export const exercisesByMuscle = (group: MuscleGroup): ExerciseDef[] =>
  EXERCISES.filter((e) => e.muscleGroup === group);

export const exerciseName = (ex: ExerciseDef, lang: Language): string =>
  lang === 'en' ? ex.nameEn : ex.name;
