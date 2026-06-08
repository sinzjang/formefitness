// 운동 is_active / is_favorite — JSON + 로컬 오버라이드 병합
import type { ExerciseDef } from '../constants/exercises';
import type { CatalogExercisePref } from '../stores/exerciseCatalogPrefsStore';
import type { CustomExercise } from '../types';

/** JSON·스토어에 필드 없을 때 기본값 (카탈로그: is_active 명시 true만 활성) */
export function normalizeExerciseMeta(ex: ExerciseDef): ExerciseDef {
  return {
    ...ex,
    is_active: ex.is_active === true,
    is_favorite: ex.is_favorite === true,
  };
}

/** 카탈로그 JSON + AsyncStorage prefs 병합 */
export function mergeCatalogExerciseMeta(
  ex: ExerciseDef,
  prefs: Record<string, CatalogExercisePref>
): ExerciseDef {
  const base = normalizeExerciseMeta(ex);
  const override = prefs[ex.nameEn];
  if (!override) return base;
  return {
    ...base,
    is_active: override.is_active ?? base.is_active,
    is_favorite: override.is_favorite ?? base.is_favorite,
  };
}

export function mergeCatalogListWithPrefs(
  exercises: ExerciseDef[],
  prefs: Record<string, CatalogExercisePref>
): ExerciseDef[] {
  return exercises.map((ex) => mergeCatalogExerciseMeta(ex, prefs));
}

/** Add Exercise 피커 — is_active === true 만 표시 */
export function filterActiveExercises(items: ExerciseDef[]): ExerciseDef[] {
  return items.filter((ex) => ex.is_active === true);
}

export function isCustomExerciseActive(c: CustomExercise): boolean {
  return c.is_active !== false;
}
