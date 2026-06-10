// 앱 설정 상태 (언어 등) — AsyncStorage에 영속 저장
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language, RestSeconds, CoachName } from '../types';
import { DEFAULT_REST_SECONDS } from '../types';
import { DEFAULT_COACH } from '../constants/coaches';

// 기기 로케일로 초기 언어 추정 (네이티브 모듈 없이 Intl 사용)
const detectDeviceLanguage = (): Language => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'ko';
    return locale.toLowerCase().startsWith('ko') ? 'ko' : 'en';
  } catch {
    return 'ko';
  }
};

interface SettingsState {
  language: Language;
  coachName: CoachName;
  defaultRestSeconds: RestSeconds;
  restAlertsEnabled: boolean;
  conditionSleep: number;
  conditionFatigue: number;
  /** Home 체중 카드 · 프로필 (로컬 저장) */
  bodyWeight?: number;
  /** 프로필 신장 (cm) */
  bodyHeight?: number;
  setLanguage: (lang: Language) => void;
  setCoachName: (name: CoachName) => void;
  toggleLanguage: () => void;
  setDefaultRestSeconds: (seconds: RestSeconds) => void;
  setRestAlertsEnabled: (enabled: boolean) => void;
  setConditionSleep: (value: number) => void;
  setConditionFatigue: (value: number) => void;
  setBodyWeight: (value: number | undefined) => void;
  setBodyHeight: (value: number | undefined) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: detectDeviceLanguage(),
      coachName: DEFAULT_COACH,
      defaultRestSeconds: DEFAULT_REST_SECONDS,
      restAlertsEnabled: true,
      conditionSleep: 3,
      conditionFatigue: 3,
      bodyWeight: undefined,
      bodyHeight: undefined,
      setLanguage: (language) => {
        set({ language });
        // 코치 채팅을 선택한 언어로 다시 시작
        import('./coachStore').then(({ useCoachStore }) => {
          useCoachStore.getState().onLanguageChanged(language);
        });
      },
      setCoachName: (coachName) => set({ coachName }),
      toggleLanguage: () =>
        set((s) => {
          const next = s.language === 'ko' ? 'en' : 'ko';
          import('./coachStore').then(({ useCoachStore }) => {
            useCoachStore.getState().onLanguageChanged(next);
          });
          return { language: next };
        }),
      setDefaultRestSeconds: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setRestAlertsEnabled: (restAlertsEnabled) => set({ restAlertsEnabled }),
      setConditionSleep: (conditionSleep) => set({ conditionSleep }),
      setConditionFatigue: (conditionFatigue) => set({ conditionFatigue }),
      setBodyWeight: (bodyWeight) => set({ bodyWeight }),
      setBodyHeight: (bodyHeight) => set({ bodyHeight }),
    }),
    {
      name: 'forme-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        coachName: state.coachName,
        defaultRestSeconds: state.defaultRestSeconds,
        restAlertsEnabled: state.restAlertsEnabled,
        conditionSleep: state.conditionSleep,
        conditionFatigue: state.conditionFatigue,
        bodyWeight: state.bodyWeight,
        bodyHeight: state.bodyHeight,
      }),
    }
  )
);

// 편의 훅: 현재 언어만 구독
export const useLanguage = () => useSettingsStore((s) => s.language);
