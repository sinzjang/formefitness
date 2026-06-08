// 휴식 타이머 상태 (세트 완료 후 카운트다운)
import { create } from 'zustand';
import type { LocalizedText } from '../types';

interface RestTimerState {
  active: boolean;
  exerciseId: string | null;
  exerciseName: LocalizedText | null;
  secondsLeft: number;
  totalSeconds: number;
  isPaused: boolean;
  shouldAlert: boolean; // 자연 종료(0초) 시 알림 트리거
  start: (exerciseId: string, exerciseName: LocalizedText, totalSeconds: number) => void;
  tick: () => void;
  skip: () => void;
  addTime: (seconds: number) => void;
  restartRest: () => void;
  togglePause: () => void;
  clearAlert: () => void;
  reset: () => void;
}

export const useRestTimerStore = create<RestTimerState>((set, get) => ({
  active: false,
  exerciseId: null,
  exerciseName: null,
  secondsLeft: 0,
  totalSeconds: 0,
  isPaused: false,
  shouldAlert: false,

  start: (exerciseId, exerciseName, totalSeconds) => {
    if (totalSeconds <= 0) return;
    set({
      active: true,
      exerciseId,
      exerciseName,
      secondsLeft: totalSeconds,
      totalSeconds,
      isPaused: false,
      shouldAlert: false,
    });
  },

  tick: () => {
    const { active, isPaused, secondsLeft } = get();
    if (!active || isPaused) return;
    if (secondsLeft <= 1) {
      set({ active: false, secondsLeft: 0, shouldAlert: true });
      return;
    }
    set({ secondsLeft: secondsLeft - 1 });
  },

  skip: () =>
    set({
      active: false,
      exerciseId: null,
      exerciseName: null,
      secondsLeft: 0,
      totalSeconds: 0,
      isPaused: false,
      shouldAlert: false,
    }),

  addTime: (seconds) => {
    const { active, secondsLeft, totalSeconds } = get();
    if (!active) return;

    const next = Math.max(0, secondsLeft + seconds);
    if (next === 0) {
      set({ active: false, secondsLeft: 0, shouldAlert: true });
      return;
    }

    set({
      secondsLeft: next,
      totalSeconds: seconds > 0 ? totalSeconds + seconds : totalSeconds,
    });
  },

  // 휴식 타이머를 처음 설정값부터 다시 시작
  restartRest: () => {
    const { active, totalSeconds } = get();
    if (!active || totalSeconds <= 0) return;
    set({ secondsLeft: totalSeconds, isPaused: false, shouldAlert: false });
  },

  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  clearAlert: () => set({ shouldAlert: false }),

  reset: () =>
    set({
      active: false,
      exerciseId: null,
      exerciseName: null,
      secondsLeft: 0,
      totalSeconds: 0,
      isPaused: false,
      shouldAlert: false,
    }),
}));
