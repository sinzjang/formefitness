// 운동 고유 키 (히스토리 조회용) — 스냅샷 기반, 카탈로그 무관
import type { LocalizedText } from '../types';
import { deriveHistoryExerciseKey, normalizeLocalizedText } from './workoutHistoryIntegrity';

export const getExerciseKey = (name: LocalizedText | unknown, customId?: string): string => {
  const snap = normalizeLocalizedText(name, 'exercise');
  return deriveHistoryExerciseKey(snap, customId);
};
