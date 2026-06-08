// 사용자 프로필 + 목표 티어 상태 (Zustand)
import { create } from 'zustand';
import type { UserProfile } from '../types';

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  setGoalTier: (tier: number) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  setGoalTier: (tier) =>
    set((state) =>
      state.profile ? { profile: { ...state.profile, goalTier: tier } } : state
    ),
  clear: () => set({ profile: null }),
}));
