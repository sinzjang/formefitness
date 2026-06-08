// 사용자 커스텀 운동 — AsyncStorage 영속
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CustomExercise, Gear, MuscleGroup } from '../types';

interface CustomExerciseState {
  exercises: CustomExercise[];
  addExercise: (name: string, muscleGroup: MuscleGroup, gear: Gear) => CustomExercise;
  importBulk: (incoming: CustomExercise[]) => void;
  deleteExercise: (id: string) => void;
  setActive: (id: string, isActive: boolean) => void;
  findByName: (name: string) => CustomExercise | undefined;
}

export const useCustomExerciseStore = create<CustomExerciseState>()(
  persist(
    (set, get) => ({
      exercises: [],

      addExercise: (name, muscleGroup, gear) => {
        const trimmed = name.trim();
        const existing = get().exercises.find(
          (e) => e.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) return existing;

        const exercise: CustomExercise = {
          id: `custom_${Date.now()}`,
          name: trimmed,
          muscleGroup,
          gear,
          createdAt: new Date().toISOString(),
          is_active: true,
          is_favorite: false,
        };
        set((state) => ({ exercises: [...state.exercises, exercise] }));
        return exercise;
      },

      importBulk: (incoming) =>
        set((state) => {
          const byId = new Map(state.exercises.map((e) => [e.id, e]));
          for (const e of incoming) {
            if (!byId.has(e.id)) byId.set(e.id, e);
          }
          return { exercises: [...byId.values()] };
        }),

      deleteExercise: (id) =>
        set((state) => ({ exercises: state.exercises.filter((e) => e.id !== id) })),

      setActive: (id, isActive) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.id === id ? { ...e, is_active: isActive } : e
          ),
        })),

      findByName: (name) =>
        get().exercises.find((e) => e.name.toLowerCase() === name.trim().toLowerCase()),
    }),
    {
      name: 'forme-custom-exercises',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
