// AI 코치 프로바이더 · API 키 (로컬 영속)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AiModelOption, AiProvider } from '../types/ai';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4.1-mini',
  claude: process.env.EXPO_PUBLIC_ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
  gemini: 'gemini-2.5-flash',
};

export const AI_MODEL_OPTIONS: Record<AiProvider, AiModelOption[]> = {
  openai: [
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
  ],
  claude: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'claude-opus-4-1', label: 'Claude Opus 4.1' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  ],
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

export function isPresetModel(provider: AiProvider, model: string): boolean {
  return AI_MODEL_OPTIONS[provider].some((option) => option.id === model.trim());
}

export function getActiveAiConfig() {
  const { provider } = useAiSettingsStore.getState();
  return {
    provider,
    apiKey: resolveApiKey(provider),
    model: resolveModel(provider),
  };
}
