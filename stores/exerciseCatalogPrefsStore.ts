// 카탈로그 운동 is_active / is_favorite — JSON 기본값 + 사용자 오버라이드 (AsyncStorage)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CatalogExercisePref {
  is_active?: boolean;
  is_favorite?: boolean;
}

interface ExerciseCatalogPrefsState {
  prefs: Record<string, CatalogExercisePref>;
  setPref: (nameEn: string, patch: CatalogExercisePref) => void;
  setActive: (nameEn: string, isActive: boolean) => void;
  setFavorite: (nameEn: string, isFavorite: boolean) => void;
  replaceAll: (prefs: Record<string, CatalogExercisePref>) => void;
}

export const useExerciseCatalogPrefsStore = create<ExerciseCatalogPrefsState>()(
  persist(
    (set) => ({
      prefs: {},

      setPref: (nameEn, patch) => {
        let merged: CatalogExercisePref | undefined;
        set((state) => {
          merged = { ...state.prefs[nameEn], ...patch };
          return {
            prefs: { ...state.prefs, [nameEn]: merged },
          };
        });
        if (merged) {
          void import('../lib/sync/workoutSync').then((m) => m.pushCatalogPref(nameEn, merged!));
        }
      },

      setActive: (nameEn, isActive) => {
        let merged: CatalogExercisePref | undefined;
        set((state) => {
          merged = { ...state.prefs[nameEn], is_active: isActive };
          return {
            prefs: { ...state.prefs, [nameEn]: merged },
          };
        });
        if (merged) {
          void import('../lib/sync/workoutSync').then((m) => m.pushCatalogPref(nameEn, merged!));
        }
      },

      setFavorite: (nameEn, isFavorite) => {
        let merged: CatalogExercisePref | undefined;
        set((state) => {
          merged = { ...state.prefs[nameEn], is_favorite: isFavorite };
          return {
            prefs: { ...state.prefs, [nameEn]: merged },
          };
        });
        if (merged) {
          void import('../lib/sync/workoutSync').then((m) => m.pushCatalogPref(nameEn, merged!));
        }
      },

      replaceAll: (prefs) => set({ prefs }),
    }),
    {
      name: 'forme-exercise-catalog-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
