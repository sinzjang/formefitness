// Goal 위저드 · 스크린 — AsyncStorage 영속
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  GoalAnalysisResult,
  GoalCheckin,
  GoalImageGender,
  GoalWizardAnswers,
  SavedGoal,
} from '../types/goal';
import { calcDayIndex } from '../lib/goalProgress';
import { useAuthStore } from './authStore';
import { useUserStore } from './userStore';

interface GoalState extends SavedGoal {
  saveGoal: (payload: {
    answers: GoalWizardAnswers;
    analysis: GoalAnalysisResult;
    currentPhotoUri?: string;
    goalImageUri?: string;
    goalImageOptions?: Partial<Record<GoalImageGender, string>>;
    selectedGoalGender?: GoalImageGender;
  }) => void;
  addCheckin: (photoUri: string) => GoalCheckin;
  clearGoal: () => void;
  getSortedCheckins: () => GoalCheckin[];
}

function makeCheckin(photoUri: string, setupAt: string, takenAt?: string): GoalCheckin {
  const at = takenAt ?? new Date().toISOString();
  return {
    id: `checkin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    photoUri,
    dayIndex: calcDayIndex(setupAt, new Date(at)),
    takenAt: at,
  };
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      isSetup: false,
      checkins: [],

      saveGoal: ({
        answers,
        analysis,
        currentPhotoUri,
        goalImageUri,
        goalImageOptions,
        selectedGoalGender,
      }) => {
        const setupAt = new Date().toISOString();
        const initialCheckins: GoalCheckin[] = currentPhotoUri
          ? [makeCheckin(currentPhotoUri, setupAt, setupAt)]
          : [];

        set({
          isSetup: true,
          wizardAnswers: answers,
          analysisResult: analysis,
          currentPhotoUri,
          goalImageUri,
          goalImageOptions,
          selectedGoalGender,
          checkins: initialCheckins,
          setupAt,
        });

        const tier = answers.targetTier;
        useUserStore.getState().setGoalTier(tier);

        const auth = useAuthStore.getState();
        if (auth.profile) {
          const next = {
            ...auth.profile,
            goalTier: tier,
            goalImageUrl: goalImageUri ?? auth.profile.goalImageUrl,
          };
          useAuthStore.setState({ profile: next });
          useUserStore.getState().setProfile(next);
        }
      },

      addCheckin: (photoUri) => {
        const setupAt = get().setupAt;
        if (!setupAt) throw new Error('GOAL_NOT_SETUP');
        const checkin = makeCheckin(photoUri, setupAt);
        set((state) => ({
          checkins: [...(state.checkins ?? []), checkin],
        }));
        return checkin;
      },

      getSortedCheckins: () => {
        const list = get().checkins ?? [];
        return [...list].sort(
          (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
        );
      },

      clearGoal: () =>
        set({
          isSetup: false,
          wizardAnswers: undefined,
          analysisResult: undefined,
          currentPhotoUri: undefined,
          goalImageUri: undefined,
          goalImageOptions: undefined,
          selectedGoalGender: undefined,
          checkins: [],
          setupAt: undefined,
        }),
    }),
    {
      name: 'forme-goal',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
