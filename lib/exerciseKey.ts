// 운동 고유 키 (히스토리 조회용)
import type { LocalizedText } from '../types';

export const getExerciseKey = (name: LocalizedText, customId?: string): string =>
  customId ? `custom:${customId}` : name.ko;
