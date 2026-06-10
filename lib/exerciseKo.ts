// 한국어 운동 메타 — src/data/ko.json (exerciseDbId 키)
import type { Language, LocalizedText } from '../types';
import type { ExerciseDef } from '../constants/exercises';
import { displayExerciseNameFromSnapshot } from './workoutHistoryIntegrity';
import koData from '../src/data/ko.json';

export interface KoExerciseEntry {
  name_ko?: string;
  bodyPart_ko?: string;
  target_ko?: string;
  equipment_ko?: string;
  secondaryMuscles_ko?: string[];
  difficulty_ko?: string;
}

const KO_BY_ID = koData as Record<string, KoExerciseEntry>;

/** exerciseDbId → 한글명 */
export function getKoNameByExerciseDbId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const name = KO_BY_ID[String(id).padStart(4, '0')]?.name_ko?.trim();
  return name || undefined;
}

/** 카탈로그 영문명 → ko.json 한글명 */
export function getKoNameByNameEn(nameEn: string): string | undefined {
  const key = nameEn.trim();
  // 순환 import 방지 — 필요 시점에만 카탈로그 조회
  const { EXERCISES } = require('../constants/exercises') as typeof import('../constants/exercises');
  const ex = (EXERCISES ?? []).find((e) => e.nameEn.trim() === key);
  return getKoNameByExerciseDbId(ex?.exerciseDbId);
}

/** ExerciseDef 한글 표시명 */
export function resolveExerciseKoName(ex: Pick<ExerciseDef, 'name' | 'nameEn' | 'exerciseDbId'>): string {
  return getKoNameByExerciseDbId(ex.exerciseDbId) ?? ex.name ?? ex.nameEn;
}

/** 세션·히스토리 LocalizedText — 스냅샷 우선, 카탈로그 매핑은 보너스만 */
export function resolveDisplayExerciseName(name: LocalizedText | unknown, lang: Language): string {
  const snap = displayExerciseNameFromSnapshot(name, lang);
  if (lang === 'en') return snap;

  // 카탈로그 한글명이 있으면 보강 (없어도 스냅샷으로 표시됨)
  if (typeof name === 'object' && name !== null && 'en' in name) {
    const en = String((name as LocalizedText).en ?? '').trim();
    if (en) {
      try {
        return getKoNameByNameEn(en) ?? snap;
      } catch {
        return snap;
      }
    }
  }
  return snap;
}

/** 세션 저장용 LocalizedText (ko.json 반영) */
export function exerciseLocalizedName(ex: ExerciseDef): LocalizedText {
  return {
    ko: resolveExerciseKoName(ex),
    en: ex.nameEn,
  };
}

/** 검색용 한글명 */
export function exerciseKoSearchText(ex: Pick<ExerciseDef, 'name' | 'nameEn' | 'exerciseDbId'>): string {
  return resolveExerciseKoName(ex).toLowerCase();
}
