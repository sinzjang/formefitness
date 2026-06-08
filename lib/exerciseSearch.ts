// Add Exercise 검색 — 전체 카탈로그(exercisedb_full 기반) 대상
import type { Language } from '../types';
import type { ExerciseDef } from '../constants/exercises';
import { exerciseName } from '../constants/exercises';
import { exerciseKoSearchText } from './exerciseKo';

/** 이름(한/영) 부분 일치 — is_active 필터 없음 */
export function searchCatalogExercises(
  items: ExerciseDef[],
  query: string,
  lang: Language
): ExerciseDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched = items.filter((ex) => {
    if (ex.isCustom) return false;
    const ko = exerciseKoSearchText(ex);
    const en = ex.nameEn.toLowerCase();
    const id = (ex.exerciseDbId ?? '').toLowerCase();
    return ko.includes(q) || en.includes(q) || id.includes(q);
  });

  return matched.sort((a, b) => {
    const aActive = a.is_active === true ? 0 : 1;
    const bActive = b.is_active === true ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return exerciseName(a, lang).localeCompare(exerciseName(b, lang), lang === 'ko' ? 'ko' : 'en');
  });
}
