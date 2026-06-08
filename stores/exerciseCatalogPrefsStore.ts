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
}

export const useExerciseCatalogPrefsStore = create<ExerciseCatalogPrefsState>()(
  persist(
    (set) => ({
      prefs: {},

      setPref: (nameEn, patch) =>
        set((state) => ({
          prefs: {
            ...state.prefs,
            [nameEn]: { ...state.prefs[nameEn], ...patch },
          },
        })),

      setActive: (nameEn, isActive) =>
        set((state) => ({
          prefs: {
            ...state.prefs,
            [nameEn]: { ...state.prefs[nameEn], is_active: isActive },
          },
        })),

      setFavorite: (nameEn, isFavorite) =>
        set((state) => ({
          prefs: {
            ...state.prefs,
            [nameEn]: { ...state.prefs[nameEn], is_favorite: isFavorite },
          },
        })),
    }),
    {
      name: 'forme-exercise-catalog-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
