// 비공개 체형 프로필 — Goal 사진 분석 결과를 코치 컨텍스트로 재사용
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BodyProfileAnalysis, SavedBodyProfile } from '../types/bodyProfile';

interface BodyProfileState extends SavedBodyProfile {
  saveAnalysis: (analysis: BodyProfileAnalysis) => void;
  clear: () => void;
}

const MAX_BODY_PROFILE_HISTORY = 12;

export const useBodyProfileStore = create<BodyProfileState>()(
  persist(
    (set) => ({
      latest: undefined,
      history: [],

      saveAnalysis: (analysis) => {
        set((state) => ({
          latest: analysis,
          history: [analysis, ...state.history.filter((item) => item.id !== analysis.id)]
            .slice(0, MAX_BODY_PROFILE_HISTORY),
        }));

        void import('../lib/sync/bodyProfileSync').then((m) => m.pushBodyProfile(analysis));
      },

      clear: () => set({ latest: undefined, history: [] }),
    }),
    {
      name: 'forme-body-profile',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        latest: state.latest,
        history: state.history.slice(0, MAX_BODY_PROFILE_HISTORY),
      }),
    }
  )
);
