// Supabase Auth 세션 + 프로필 상태
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { dbProfileToUserProfile } from '../lib/profile';
import type { UserProfile } from '../types';
import type { DbProfile } from '../types/subscription';
import { useUserStore } from './userStore';
import { useSubscriptionStore } from './subscriptionStore';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isReady: boolean;
  error: string | null;
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let authListenerAttached = false;

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return dbProfileToUserProfile(data as DbProfile);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isReady: false,
  error: null,

  clearError: () => set({ error: null }),

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ isReady: true });
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session;
      const user = session?.user ?? null;
      let profile: UserProfile | null = null;

      if (user) {
        profile = await fetchProfile(user.id);
        useUserStore.getState().setProfile(profile);
        await useSubscriptionStore.getState().refresh(user.id);
        const { syncWorkoutOnLogin } = await import('../lib/sync/workoutSync');
        await syncWorkoutOnLogin(user.id);
        const { rcLogIn } = await import('../lib/revenueCat');
        void rcLogIn(user.id);
      }

      set({ session, user, profile, isReady: true, error: null });

      if (!authListenerAttached) {
        authListenerAttached = true;
        supabase.auth.onAuthStateChange(async (_event, nextSession) => {
          const nextUser = nextSession?.user ?? null;
          let nextProfile: UserProfile | null = null;

          if (nextUser) {
            try {
              nextProfile = await fetchProfile(nextUser.id);
              useUserStore.getState().setProfile(nextProfile);
              await useSubscriptionStore.getState().refresh(nextUser.id);
              const { syncWorkoutOnLogin } = await import('../lib/sync/workoutSync');
              await syncWorkoutOnLogin(nextUser.id);
              const { rcLogIn } = await import('../lib/revenueCat');
              void rcLogIn(nextUser.id);
            } catch (e) {
              const msg = e instanceof Error ? e.message : '프로필 로드 실패';
              set({ error: msg });
            }
          } else {
            const { clearLocalWorkoutData } = await import('../lib/sync/clearLocalWorkout');
            await clearLocalWorkoutData();
            useUserStore.getState().clear();
            useSubscriptionStore.getState().reset();
            const { rcLogOut } = await import('../lib/revenueCat');
            void rcLogOut();
          }

          set({
            session: nextSession,
            user: nextUser,
            profile: nextProfile,
          });
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '인증 초기화 실패';
      set({ isReady: true, error: msg });
    }
  },

  refreshProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    const profile = await fetchProfile(userId);
    useUserStore.getState().setProfile(profile);
    set({ profile });
    await useSubscriptionStore.getState().refresh(userId);
  },

  signOut: async () => {
    if (!isSupabaseConfigured) return;
    const { signOutGoogle } = await import('../lib/auth/google');
    await signOutGoogle();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    const { clearLocalWorkoutData } = await import('../lib/sync/clearLocalWorkout');
    await clearLocalWorkoutData();
    useUserStore.getState().clear();
    useSubscriptionStore.getState().reset();
    const { rcLogOut } = await import('../lib/revenueCat');
    void rcLogOut();
    set({ session: null, user: null, profile: null });
  },
}));
