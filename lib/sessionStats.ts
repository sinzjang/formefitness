// 세션/운동별 통계 요약 (e1RM, 볼륨, 횟수)
import type { ResistanceType, SetData } from '../types';
import { setLoad, setVolume, epley1RM } from './strength';

export interface ExerciseStats {
  bestE1rm: number;
  bestReps: number;
  totalVolume: number;
  totalReps: number;
  hasLoad: boolean;
}

export const summarizeSets = (
  sets: SetData[],
  resistanceType: ResistanceType
): ExerciseStats => {
  const valid = sets.filter((s) => s.reps > 0);
  let bestE1rm = 0;
  let bestReps = 0;
  let totalVolume = 0;
  let totalReps = 0;
  let hasLoad = false;

  for (const s of valid) {
    const load = setLoad(s, resistanceType);
    if (load > 0) hasLoad = true;
    bestE1rm = Math.max(bestE1rm, epley1RM(load, s.reps));
    bestReps = Math.max(bestReps, s.reps);
    totalVolume += setVolume(load, s.reps);
    totalReps += s.reps;
  }

  return { bestE1rm, bestReps, totalVolume, totalReps, hasLoad };
};
