// AI 코치 채팅 상태
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoachMessage, CoachResponse, Language } from '../types';
import { fetchDailyGreeting, sendCoachMessage, type CoachChatTurn } from '../lib/claude';
import { buildCoachContextData } from '../lib/coachStats';
import type { CoachPromptInput } from '../lib/coachPrompt';
import { useHistoryStore } from './historyStore';
import { useRoutineStore } from './routineStore';
import { useSettingsStore } from './settingsStore';
import { useUserStore } from './userStore';
import { toLocalDateKey } from '../lib/dates';

const MAX_USER_MESSAGE = 500;

function makeId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function responseToCoachMessage(res: CoachResponse): Omit<CoachMessage, 'id' | 'createdAt'> {
  if (res.type === 'greeting') {
    return {
      role: 'coach',
      text: res.message,
      showGoalImage: res.showGoalImage,
      recommendedRoutine: res.recommendedRoutine,
    };
  }
  if (res.type === 'chart') {
    return { role: 'coach', text: res.message, chart: res.chart };
  }
  return { role: 'coach', text: res.message };
}

function buildPromptInput(isAppOpen: boolean): CoachPromptInput {
  const settings = useSettingsStore.getState();
  const profile = useUserStore.getState().profile;
  const sessions = useHistoryStore.getState().sessions;
  const routines = useRoutineStore.getState().routines;
  const ctx = buildCoachContextData(sessions, routines, settings.language, {
    goalTier: profile?.goalTier,
    conditionSleep: settings.conditionSleep,
    conditionFatigue: settings.conditionFatigue,
  });

  return {
    coachName: settings.coachName,
    language: settings.language,
    isAppOpen,
    ...ctx,
  };
}

function toHistory(messages: CoachMessage[]): CoachChatTurn[] {
  return messages
    .filter((m) => m.text.trim().length > 0)
    .slice(-12)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));
}

interface CoachState {
  messages: CoachMessage[];
  isLoading: boolean;
  lastGreetingDate: string | null;
  lastGreetingLanguage: Language | null;
  error: string | null;
  appendMessage: (msg: CoachMessage) => void;
  sendUserMessage: (text: string) => Promise<void>;
  fetchDailyGreetingIfNeeded: () => Promise<void>;
  onLanguageChanged: (lang: Language) => void;
  clearError: () => void;
}

export const useCoachStore = create<CoachState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      lastGreetingDate: null,
      lastGreetingLanguage: null,
      error: null,

      appendMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

      clearError: () => set({ error: null }),

      onLanguageChanged: (lang) => {
        if (get().lastGreetingLanguage === lang) return;
        set({
          messages: [],
          lastGreetingDate: null,
          lastGreetingLanguage: null,
        });
        get().fetchDailyGreetingIfNeeded();
      },

      fetchDailyGreetingIfNeeded: async () => {
        const lang = useSettingsStore.getState().language;
        const today = toLocalDateKey(new Date());
        if (
          get().lastGreetingDate === today &&
          get().lastGreetingLanguage === lang &&
          get().messages.length > 0
        ) {
          return;
        }
        if (get().isLoading) return;

        set({ isLoading: true, error: null });

        try {
          const input = buildPromptInput(true);
          const res = await fetchDailyGreeting(input);
          const coachMsg: CoachMessage = {
            id: makeId(),
            createdAt: new Date().toISOString(),
            ...responseToCoachMessage(res),
          };
          set({
            messages: [coachMsg],
            lastGreetingDate: today,
            lastGreetingLanguage: lang,
            isLoading: false,
          });
        } catch (e) {
          const fallback =
            lang === 'ko'
              ? '안녕하세요! 오늘 운동 계획이 있으신가요? 무엇이든 물어보세요 💪'
              : "Hey! Ready to train today? Ask me anything about your workout.";
          set({
            messages: [
              {
                id: makeId(),
                role: 'coach',
                text: fallback,
                createdAt: new Date().toISOString(),
              },
            ],
            lastGreetingDate: today,
            lastGreetingLanguage: lang,
            isLoading: false,
            error: e instanceof Error && e.message === 'API_KEY_MISSING' ? 'API_KEY_MISSING' : null,
          });
        }
      },

      sendUserMessage: async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || get().isLoading) return;
        if (trimmed.length > MAX_USER_MESSAGE) return;

        const userMsg: CoachMessage = {
          id: makeId(),
          role: 'user',
          text: trimmed,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, userMsg],
          isLoading: true,
          error: null,
        }));

        try {
          const input = buildPromptInput(false);
          const history = toHistory(get().messages.filter((m) => m.id !== userMsg.id));
          const res = await sendCoachMessage(input, trimmed, history);
          const coachMsg: CoachMessage = {
            id: makeId(),
            createdAt: new Date().toISOString(),
            ...responseToCoachMessage(res),
          };
          set((state) => ({
            messages: [...state.messages, coachMsg],
            isLoading: false,
          }));
        } catch (e) {
          const lang = useSettingsStore.getState().language;
          const errText =
            e instanceof Error && e.message === 'API_KEY_MISSING'
              ? lang === 'ko'
                ? 'AI 코치 연결 설정이 필요해요. API 키를 확인해 주세요.'
                : 'AI coach needs an API key to connect.'
              : lang === 'ko'
                ? '잠시 연결에 문제가 있어요. 다시 시도해 주세요.'
                : 'Connection issue. Please try again.';

          set((state) => ({
            messages: [
              ...state.messages,
              {
                id: makeId(),
                role: 'coach',
                text: errText,
                createdAt: new Date().toISOString(),
              },
            ],
            isLoading: false,
            error: e instanceof Error ? e.message : 'unknown',
          }));
        }
      },
    }),
    {
      name: 'forme-coach-chat',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messages: state.messages.slice(-50),
        lastGreetingDate: state.lastGreetingDate,
        lastGreetingLanguage: state.lastGreetingLanguage,
      }),
    }
  )
);
