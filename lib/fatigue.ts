// 근육 피로도 계산 로직 (세션 중 클라이언트에서 실시간 계산)
import type { FatigueLevel, MuscleGroup } from '../types';
import { colors } from '../constants/theme';

// 근육 그룹별 피로 임계값 (세션당 세트 수 기준)
export const FATIGUE_THRESHOLDS: Record<MuscleGroup, { caution: number; overload: number }> = {
  chest: { caution: 4, overload: 6 },
  shoulder: { caution: 4, overload: 6 },
  back: { caution: 5, overload: 8 },
  arms: { caution: 6, overload: 9 },
  core: { caution: 6, overload: 10 },
  legs: { caution: 5, overload: 8 },
};

export const getFatigueLevel = (muscleGroup: MuscleGroup, setCount: number): FatigueLevel => {
  const t = FATIGUE_THRESHOLDS[muscleGroup];
  if (setCount === 0) return 'none';
  if (setCount < t.caution) return 'good';
  if (setCount < t.overload) return 'caution';
  return 'overload';
};

export const FATIGUE_COLORS: Record<FatigueLevel, string> = {
  none: colors.fatigueNone,
  good: colors.success,
  caution: colors.warning,
  overload: colors.danger,
};
