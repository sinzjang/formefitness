// 장소별 운동 루틴 — AsyncStorage 영속
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RoutineExerciseEntry, WorkoutRoutine } from '../types';

interface RoutineState {
  routines: WorkoutRoutine[];
  addRoutine: (
    locationId: string,
    name: string,
    exercises: RoutineExerciseEntry[]
  ) => WorkoutRoutine;
  addExerciseToRoutine: (
    routineId: string,
    exercise: RoutineExerciseEntry
  ) => WorkoutRoutine | null;
  importBulk: (
    incoming: Array<{
      id: string;
      locationId: string;
      name: string;
      createdAt: string;
      exercises: RoutineExerciseEntry[];
    }>
  ) => void;
  deleteRoutine: (id: string) => void;
  /** 목록에서 숨김 — is_active: false */
  archiveRoutine: (id: string) => void;
  replaceAll: (routines: WorkoutRoutine[]) => void;
  getRoutinesByLocation: (locationId: string) => WorkoutRoutine[];
}

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set, get) => ({
      routines: [],

      addRoutine: (locationId, name, exercises) => {
        const routine: WorkoutRoutine = {
          id: `routine_${Date.now()}`,
          locationId,
          name: name.trim(),
          exercises,
          createdAt: new Date().toISOString(),
          is_active: true,
        };
        set((state) => ({ routines: [...state.routines, routine] }));
        void import('../lib/sync/workoutSync').then((m) => m.pushRoutine(routine));
        return routine;
      },

      addExerciseToRoutine: (routineId, exercise) => {
        let updated: WorkoutRoutine | null = null;
        set((state) => ({
          routines: state.routines.map((routine) => {
            if (routine.id !== routineId) return routine;
            if (routine.exercises.some((ex) => ex.exerciseKey === exercise.exerciseKey)) {
              updated = routine;
              return routine;
            }

            updated = {
              ...routine,
              exercises: [...routine.exercises, exercise],
            };
            return updated;
          }),
        }));

        if (updated) {
          void import('../lib/sync/workoutSync').then((m) => m.pushRoutine(updated!));
        }
        return updated;
      },

      importBulk: (incoming) =>
        set((state) => {
          const byId = new Map(state.routines.map((r) => [r.id, r]));
          for (const r of incoming) {
            if (!byId.has(r.id)) {
              byId.set(r.id, {
                id: r.id,
                locationId: r.locationId,
                name: r.name,
                exercises: r.exercises,
                createdAt: r.createdAt,
                is_active: r.is_active ?? true,
              });
            }
          }
          return { routines: [...byId.values()] };
        }),

      deleteRoutine: (id) => {
        set((state) => ({ routines: state.routines.filter((r) => r.id !== id) }));
        void import('../lib/sync/workoutSync').then((m) => m.deleteRoutineFromCloud(id));
      },

      archiveRoutine: (id) => {
        let archived: WorkoutRoutine | undefined;
        set((state) => ({
          routines: state.routines.map((r) => {
            if (r.id === id) {
              archived = { ...r, is_active: false };
              return archived;
            }
            return r;
          }),
        }));
        if (archived) {
          void import('../lib/sync/workoutSync').then((m) => m.pushRoutine(archived!));
        }
      },

      replaceAll: (routines) => set({ routines }),

      getRoutinesByLocation: (locationId) =>
        get()
          .routines.filter((r) => r.locationId === locationId && r.is_active !== false)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    {
      name: 'forme-routines',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
