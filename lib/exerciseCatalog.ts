// 운동 카탈로그 + 커스텀 운동 통합 헬퍼
import type { CustomExercise, Gear, Language, MuscleGroup, WorkoutExercise } from '../types';
import { EXERCISES, type ExerciseDef } from '../constants/exercises';
import { getCatalogExerciseDbId } from '../constants/exerciseDbCatalogIds';
import { resistanceToGear } from '../constants/gears';

/** CustomExercise → ExerciseDef (피커/세션 공통 형식) */
export function customToExerciseDef(c: CustomExercise): ExerciseDef {
  return {
    name: c.name,
    nameEn: c.name,
    muscleGroup: c.muscleGroup,
    gear: c.gear,
    primary: [],
    synergist: [],
    stabilizer: [],
    isCustom: true,
    customId: c.id,
  };
}

/** 카탈로그(내장) 운동만 */
export function getCatalogExercises(): ExerciseDef[] {
  return EXERCISES.filter((e) => !e.isCustom);
}

/** 커스텀 운동 목록 → ExerciseDef */
export function getCustomExerciseDefs(customs: CustomExercise[]): ExerciseDef[] {
  return customs.map(customToExerciseDef);
}

/** 필터 적용 */
export function filterExercises(
  items: ExerciseDef[],
  gear: Gear | null,
  target: MuscleGroup | null
): ExerciseDef[] {
  return items.filter((e) => {
    if (gear && e.gear !== gear) return false;
    if (target && e.muscleGroup !== target) return false;
    return true;
  });
}

/** 근육 그룹별 그룹화 */
export function groupByMuscle(items: ExerciseDef[]): Map<MuscleGroup, ExerciseDef[]> {
  const map = new Map<MuscleGroup, ExerciseDef[]>();
  for (const ex of items) {
    const list = map.get(ex.muscleGroup) ?? [];
    list.push(ex);
    map.set(ex.muscleGroup, list);
  }
  return map;
}

export function isCatalogExercise(ex: ExerciseDef): boolean {
  return !ex.isCustom;
}

export function exerciseDisplayName(ex: ExerciseDef, lang: Language): string {
  if (ex.isCustom) return ex.name;
  return lang === 'en' ? ex.nameEn : ex.name;
}

/** RapidAPI GIF id — ExerciseDef.exerciseDbId 우선 */
export function getExerciseDbId(ex: ExerciseDef): string | undefined {
  return ex.exerciseDbId ?? getCatalogExerciseDbId(ex.nameEn);
}

/** 세션 운동 → 카탈로그 ExerciseDef (썸네일·디테일 모달용) */
export function workoutExerciseToDef(
  ex: WorkoutExercise,
  customExercises: CustomExercise[] = []
): ExerciseDef {
  if (ex.customId) {
    const custom = customExercises.find((c) => c.id === ex.customId);
    if (custom) return customToExerciseDef(custom);
  }

  const byEn = EXERCISES.find((e) => e.nameEn === ex.exerciseName.en);
  if (byEn) return byEn;

  const byKo = EXERCISES.find((e) => e.name === ex.exerciseName.ko);
  if (byKo) return byKo;

  return {
    name: ex.exerciseName.ko,
    nameEn: ex.exerciseName.en || ex.exerciseName.ko,
    muscleGroup: ex.muscleGroup,
    gear: resistanceToGear(ex.resistanceType),
    primary: [],
    synergist: [],
    stabilizer: [],
    customId: ex.customId,
    isCustom: !!ex.customId,
  };
}
