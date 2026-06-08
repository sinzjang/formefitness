// 무게 × 횟수를 하나의 지표로 환산하는 계산 헬퍼
// - 볼륨(Volume): 무게 × 횟수 → 총 일량(근비대 관점)
// - 추정 1RM(e1RM): 무게·횟수를 강도 지표로 통합(근력 관점)
import type { ResistanceType, SetData } from '../types';

// 세트의 '무게' 부하 (lb). 맨몸은 추가중량, 밴드는 0
export const setLoad = (set: SetData, type: ResistanceType): number => {
  if (type === 'weight') return set.weightLb ?? 0;
  if (type === 'bodyweight') return set.bwAddedLb ?? 0;
  return 0; // band: 무게 개념 없음
};

// 볼륨 = 무게 × 횟수
export const setVolume = (load: number, reps: number): number => load * reps;

// 추정 1RM (Epley): w × (1 + reps/30)
export const epley1RM = (load: number, reps: number): number =>
  reps <= 0 ? 0 : Math.round(load * (1 + reps / 30) * 10) / 10;

// 추정 1RM (Brzycki): w × 36 / (37 - reps) — 참고용(고반복에서 부정확)
export const brzycki1RM = (load: number, reps: number): number =>
  reps <= 0 || reps >= 37 ? 0 : Math.round(((load * 36) / (37 - reps)) * 10) / 10;
