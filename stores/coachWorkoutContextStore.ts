// 코치가 읽는 루틴 스냅샷 — 세션 없이 루틴 열람·작성 중에도 유지
import { create } from 'zustand';
import type { RoutineExerciseEntry, WorkoutRoutine } from '../types';
import type { CoachRoutineSnapshot } from '../lib/coachStats';
import { snapshotFromRoutineEntries, snapshotFromWorkoutRoutine } from '../lib/coachStats';
import { useSettingsStore } from './settingsStore';

interface CoachWorkoutContextState {
  /** 저장된 루틴 상세를 열어본 상태 */
  viewingRoutine: CoachRoutineSnapshot | null;
  /** 루틴 추가 시트에서 작성 중 */
  draftRoutine: CoachRoutineSnapshot | null;
  setViewingRoutine: (routine: WorkoutRoutine) => void;
  clearViewingRoutine: () => void;
  setDraftRoutine: (name: string, exercises: RoutineExerciseEntry[]) => void;
  clearDraftRoutine: () => void;
}

export const useCoachWorkoutContextStore = create<CoachWorkoutContextState>((set) => ({
  viewingRoutine: null,
  draftRoutine: null,

  setViewingRoutine: (routine) => {
    const lang = useSettingsStore.getState().language;
    set({ viewingRoutine: snapshotFromWorkoutRoutine(routine, lang) });
  },

  clearViewingRoutine: () => set({ viewingRoutine: null }),

  setDraftRoutine: (name, exercises) => {
    const lang = useSettingsStore.getState().language;
    set({
      draftRoutine:
        exercises.length > 0 || name.trim()
          ? snapshotFromRoutineEntries(name.trim() || '—', exercises, lang)
          : null,
    });
  },

  clearDraftRoutine: () => set({ draftRoutine: null }),
}));
