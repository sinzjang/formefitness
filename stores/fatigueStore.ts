// 근육 그룹별 실시간 피로 상태 (Zustand)
import { create } from 'zustand';
import type { FatigueLevel, MuscleGroup } from '../types';
import { getFatigueLevel } from '../lib/fatigue';

type SetCountMap = Record<MuscleGroup, number>;

const EMPTY_COUNTS: SetCountMap = {
  chest: 0,
  shoulder: 0,
  back: 0,
  arms: 0,
  core: 0,
  legs: 0,
};

interface FatigueState {
  setCounts: SetCountMap;
  addSet: (muscleGroup: MuscleGroup, count?: number) => void;
  getLevel: (muscleGroup: MuscleGroup) => FatigueLevel;
  reset: () => void;
}

export const useFatigueStore = create<FatigueState>((set, get) => ({
  setCounts: { ...EMPTY_COUNTS },
  addSet: (muscleGroup, count = 1) =>
    set((state) => ({
      setCounts: { ...state.setCounts, [muscleGroup]: state.setCounts[muscleGroup] + count },
    })),
  getLevel: (muscleGroup) => getFatigueLevel(muscleGroup, get().setCounts[muscleGroup]),
  reset: () => set({ setCounts: { ...EMPTY_COUNTS } }),
}));
