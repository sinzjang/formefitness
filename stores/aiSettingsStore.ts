// AI 코치 프로바이더 · API 키 (로컬 영속)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiProvider } from '../types/ai';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  claude: process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash',
};

const ENV_KEYS: Record<AiProvider, string | undefined> = {
  openai: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  claude: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  gemini: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
};

interface AiSettingsState {
  provider: AiProvider;
  apiKeys: Record<AiProvider, string>;
  models: Record<AiProvider, string>;
  setProvider: (p: AiProvider) => void;
  setApiKey: (p: AiProvider, key: string) => void;
  setModel: (p: AiProvider, model: string) => void;
}

export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set) => ({
      provider: 'claude',
      apiKeys: { openai: '', claude: '', gemini: '' },
      models: { ...DEFAULT_MODELS },

      setProvider: (provider) => set({ provider }),
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      setModel: (provider, model) =>
        set((s) => ({ models: { ...s.models, [provider]: model } })),
    }),
    {
      name: 'forme-ai-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/** 사용자 입력 키 → 없으면 .env 폴백 */
export function resolveApiKey(provider: AiProvider): string {
  const { apiKeys } = useAiSettingsStore.getState();
  const user = apiKeys[provider]?.trim();
  if (user) return user;
  return ENV_KEYS[provider]?.trim() ?? '';
}

export function resolveModel(provider: AiProvider): string {
  const { models } = useAiSettingsStore.getState();
  return models[provider]?.trim() || DEFAULT_MODELS[provider];
}

export function getActiveAiConfig() {
  const { provider } = useAiSettingsStore.getState();
  return {
    provider,
    apiKey: resolveApiKey(provider),
    model: resolveModel(provider),
  };
}
