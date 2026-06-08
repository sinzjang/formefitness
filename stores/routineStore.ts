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
        };
        set((state) => ({ routines: [...state.routines, routine] }));
        return routine;
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
              });
            }
          }
          return { routines: [...byId.values()] };
        }),

      deleteRoutine: (id) =>
        set((state) => ({ routines: state.routines.filter((r) => r.id !== id) })),

      getRoutinesByLocation: (locationId) =>
        get()
          .routines.filter((r) => r.locationId === locationId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }),
    {
      name: 'forme-routines',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
